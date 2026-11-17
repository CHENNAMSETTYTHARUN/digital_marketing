import hashlib, json, secrets
from datetime import datetime, timezone
from urllib.parse import urlencode
import httpx, jwt
from authlib.jose import JsonWebKey, jwt as jose_jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import get_db
from app.dependencies import current_user, optional_user
from app.models import Campaign, Feedback, OAuthAccount, OnboardingProfile, RefreshToken, User
from app.schemas import (
    CampaignIn, CampaignOut, DemoIdentityIn, FeedbackIn, LoginIn,
    OnboardingIn, OnboardingOut, RegisterIn, TokenOut, UserOut
)
from app.security import create_access_token, hash_password, hash_token, new_refresh_token, verify_password
from app.limiter import limiter

router = APIRouter()
SOCIAL = {
    "facebook": "https://www.facebook.com/people/Stackly-Stackly/pfbid02NmgSaxmeD8WJngqrhKudvxzak9GvzPLz6YS9NMdJJM9rSeJ7ZTyG6h3HF3p3koBEl/?rdid=3qmngFeLJe3ChGfe&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BrqaZkJRe%2F",
    "instagram": "https://www.instagram.com/thestackly",
    "linkedin": "https://www.linkedin.com/company/the-stackly/",
    "x": "https://x.com/The_Stackly",
}

def put_refresh(db: Session, response: Response, user: User):
    raw, digest, expiry = new_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=digest, expires_at=expiry)); db.commit()
    response.set_cookie("refresh_token", raw, httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite, path="/api/v1/auth", max_age=settings.refresh_token_days * 86400)

@router.post("/auth/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    pw = body.password.get_secret_value()
    if not body.terms_accepted: raise HTTPException(422, "Accept the terms and conditions to continue")
    if body.password != body.confirm_password: raise HTTPException(422, "Passwords do not match")
    if len(pw) < 12 or not any(c.islower() for c in pw) or not any(c.isupper() for c in pw) or not any(c.isdigit() for c in pw) or not any(not c.isalnum() for c in pw):
        raise HTTPException(422, "Password must be at least 12 characters and include upper/lowercase letters, a number, and a symbol")
    email = str(body.email).lower()
    if db.scalar(select(User).where(User.email == email)): raise HTTPException(409, "An account with this email already exists")
    user = User(full_name=body.full_name, email=email, hashed_password=hash_password(pw), email_verified=False)
    db.add(user)
    try: db.commit(); db.refresh(user)
    except IntegrityError: db.rollback(); raise HTTPException(409, "An account with this email already exists")
    return user

@router.post("/auth/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == str(body.email).lower()))
    if not user or not user.hashed_password or not verify_password(body.password.get_secret_value(), user.hashed_password): raise HTTPException(401, "Email or password is incorrect")
    if user.status != "active": raise HTTPException(403, "This account is inactive")
    if settings.require_email_verification and not user.email_verified: raise HTTPException(403, "Verify your email before signing in")
    user.last_login = datetime.now(timezone.utc); db.commit(); put_refresh(db, response, user)
    return {"access_token": create_access_token(user.id), "user": user}

@router.post("/auth/refresh", response_model=TokenOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if not raw: raise HTTPException(401, "Refresh token required")
    entry = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
    now = datetime.now(timezone.utc)
    if not entry or entry.revoked_at or entry.expires_at.replace(tzinfo=timezone.utc) <= now:
        response.delete_cookie("refresh_token", path="/api/v1/auth"); raise HTTPException(401, "Refresh token is invalid or expired")
    user = db.get(User, entry.user_id)
    entry.revoked_at = now; db.commit(); put_refresh(db, response, user)
    return {"access_token": create_access_token(user.id), "user": user}

@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get("refresh_token")
    if raw:
        entry = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)))
        if entry and not entry.revoked_at: entry.revoked_at = datetime.now(timezone.utc); db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")

@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)): return user

@router.post("/feedback", status_code=201)
@limiter.limit("5/hour")
def submit_feedback(request: Request, body: FeedbackIn, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    row = Feedback(user_id=user.id if user else None, name=body.name.strip(), email=str(body.email).lower(), subject=body.subject.strip(), message=body.message.strip(), rating=body.rating)
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "message": "Thank you. Your feedback has been received."}

@router.get("/feedback/my-feedback")
def my_feedback(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(Feedback).where(Feedback.user_id == user.id).order_by(Feedback.created_at.desc())).all()
    return [{"id": x.id, "name": x.name, "email": x.email, "subject": x.subject, "message": x.message, "rating": x.rating, "status": x.status, "created_at": x.created_at} for x in rows]

@router.get("/social-links")
def social_links(): return SOCIAL

DEFAULT_CAMPAIGNS = [
    {"name": "Summer Sale", "channels": "Instagram + Google", "spent": 8500, "leads": 428, "roi": 32, "status": "active"},
    {"name": "Brand Awareness", "channels": "Instagram", "spent": 5200, "leads": 312, "roi": 21, "status": "completed"},
    {"name": "New Product Launch", "channels": "Google Ads + Email", "spent": 11800, "leads": 544, "roi": 45, "status": "active"},
    {"name": "Weekend Offer", "channels": "Instagram + Facebook", "spent": 3900, "leads": 186, "roi": 18, "status": "completed"}
]

@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    count = db.scalar(select(Campaign).limit(1))
    if count is None:
        for item in DEFAULT_CAMPAIGNS:
            db.add(Campaign(name=item["name"], channels=item["channels"], spent=item["spent"], leads=item["leads"], roi=item["roi"], status=item["status"]))
        db.commit()

    if user:
        user_camps = db.scalars(select(Campaign).where(Campaign.user_id == user.id).order_by(Campaign.created_at.desc())).all()
        global_camps = db.scalars(select(Campaign).where(Campaign.user_id.is_(None)).order_by(Campaign.created_at.desc())).all()
        return list(user_camps) + list(global_camps)

    return db.scalars(select(Campaign).order_by(Campaign.created_at.desc())).all()

@router.post("/campaigns", response_model=CampaignOut, status_code=201)
def create_campaign(body: CampaignIn, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    item = Campaign(
        user_id=user.id if user else None,
        name=body.name.strip(),
        channels=body.channels.strip(),
        spent=body.spent,
        leads=body.leads,
        roi=body.roi,
        status=body.status
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/onboarding", response_model=OnboardingOut, status_code=201)
def save_onboarding(body: OnboardingIn, db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    profile = OnboardingProfile(
        user_id=user.id if user else None,
        business_name=body.business_name.strip(),
        goals=json.dumps(body.goals),
        channels=json.dumps(body.channels)
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return OnboardingOut(
        id=profile.id,
        user_id=profile.user_id,
        business_name=profile.business_name,
        goals=body.goals,
        channels=body.channels
    )

@router.get("/onboarding", response_model=OnboardingOut)
def get_onboarding(db: Session = Depends(get_db), user: User | None = Depends(optional_user)):
    query = select(OnboardingProfile)
    if user:
        query = query.where(OnboardingProfile.user_id == user.id)
    profile = db.scalar(query.order_by(OnboardingProfile.created_at.desc()))
    if not profile:
        return OnboardingOut(id=0, user_id=None, business_name="", goals=[], channels=[])
    try:
        goals = json.loads(profile.goals) if profile.goals else []
    except Exception:
        goals = []
    try:
        channels = json.loads(profile.channels) if profile.channels else []
    except Exception:
        channels = []
    return OnboardingOut(
        id=profile.id,
        user_id=profile.user_id,
        business_name=profile.business_name,
        goals=goals,
        channels=channels
    )

@router.get("/auth/providers")
def auth_providers():
    return {
        "google": bool(settings.google_client_id and settings.google_client_secret),
        "microsoft": bool(settings.microsoft_client_id and settings.microsoft_client_secret),
        "demo_oauth": settings.app_env == "development" and settings.demo_oauth_enabled,
    }

@router.post("/auth/demo/{provider}", response_model=TokenOut)
def demo_oauth_login(provider: str, body: DemoIdentityIn, response: Response, db: Session = Depends(get_db)):
    if provider not in ("google", "microsoft"): raise HTTPException(404, "Provider not found")
    if settings.app_env != "development" or not settings.demo_oauth_enabled:
        raise HTTPException(404, "Development demo sign-in is disabled")
    email = str(body.email).lower()
    demo_subject = "demo:" + email
    account = db.scalar(select(OAuthAccount).where(OAuthAccount.provider == provider, OAuthAccount.provider_user_id == demo_subject))
    user = account.user if account else db.scalar(select(User).where(User.email == email))
    if user and not account:
        raise HTTPException(409, "That email already belongs to a different account. Choose another demo email.")
    if not user:
        user = User(full_name=body.full_name, email=email, auth_provider=provider, provider_user_id=demo_subject, email_verified=False)
        db.add(user)
        db.flush()
        db.add(OAuthAccount(user_id=user.id, provider=provider, provider_user_id=demo_subject, provider_email=email))
    user.last_login = datetime.now(timezone.utc)
    try: db.commit(); db.refresh(user)
    except IntegrityError: db.rollback(); raise HTTPException(409, "Unable to create this demo account. Try another email.")
    put_refresh(db, response, user)
    return {"access_token": create_access_token(user.id), "user": user}

def oauth_config(provider):
    if provider == "google":
        if not settings.google_client_id or not settings.google_client_secret: raise HTTPException(503, "Google sign-in is not configured")
        return {"client_id": settings.google_client_id, "secret": settings.google_client_secret, "redirect": settings.google_redirect_uri,
                "authorize": "https://accounts.google.com/o/oauth2/v2/auth", "token": "https://oauth2.googleapis.com/token", "jwks": "https://www.googleapis.com/oauth2/v3/certs", "issuer": "https://accounts.google.com", "scope": "openid email profile", "tenant": None}
    if not settings.microsoft_client_id or not settings.microsoft_client_secret: raise HTTPException(503, "Microsoft sign-in is not configured")
    tenant = settings.microsoft_tenant_id
    return {"client_id": settings.microsoft_client_id, "secret": settings.microsoft_client_secret, "redirect": settings.microsoft_redirect_uri,
            "authorize": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize", "token": f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token", "jwks": f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys", "issuer": f"https://login.microsoftonline.com/{tenant}/v2.0", "scope": settings.microsoft_scopes, "tenant": tenant}

@router.get("/auth/{provider}")
def oauth_start(provider: str, response: Response):
    if provider not in ("google", "microsoft"): raise HTTPException(404, "Provider not found")
    cfg = oauth_config(provider); state = secrets.token_urlsafe(32); nonce = secrets.token_urlsafe(32)
    response = RedirectResponse(cfg["authorize"] + "?" + urlencode({"client_id": cfg["client_id"], "redirect_uri": cfg["redirect"], "response_type": "code", "scope": cfg["scope"], "state": state, "nonce": nonce, "response_mode": "query", "prompt": "select_account"}))
    response.set_cookie(f"oauth_{provider}_state", state, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=600)
    response.set_cookie(f"oauth_{provider}_nonce", nonce, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=600)
    return response

@router.get("/auth/{provider}/callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in ("google", "microsoft"): raise HTTPException(404, "Provider not found")
    cfg = oauth_config(provider)
    if request.query_params.get("error"): raise HTTPException(400, "OAuth authorization was not completed")
    if not secrets.compare_digest(request.cookies.get(f"oauth_{provider}_state", ""), request.query_params.get("state", "")): raise HTTPException(400, "Invalid OAuth state")
    code = request.query_params.get("code")
    if not code: raise HTTPException(400, "Authorization code is required")
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(cfg["token"], data={"client_id": cfg["client_id"], "client_secret": cfg["secret"], "code": code, "grant_type": "authorization_code", "redirect_uri": cfg["redirect"]}, headers={"Accept": "application/json"})
        if token_resp.status_code != 200: raise HTTPException(401, "OAuth token exchange failed")
        token = token_resp.json().get("id_token")
        if not token: raise HTTPException(401, "Identity token missing")
        keys_resp = await client.get(cfg["jwks"])
        if keys_resp.status_code != 200: raise HTTPException(502, "Identity provider keys unavailable")
    try:
        header = jwt.get_unverified_header(token)
        key = JsonWebKey.import_key_set(keys_resp.json()).find_by_kid(header.get("kid"))
        claims = jose_jwt.decode(token, key)
        claims.validate(leeway=60)
        data = dict(claims)
        if data.get("aud") != cfg["client_id"]: raise ValueError("audience mismatch")
        nonce = request.cookies.get(f"oauth_{provider}_nonce", "")
        if not nonce or not secrets.compare_digest(data.get("nonce", ""), nonce): raise ValueError("nonce mismatch")
        issuer = data.get("iss", "")
        if provider == "google" and issuer not in ("https://accounts.google.com", "accounts.google.com"): raise ValueError("issuer mismatch")
        if provider == "microsoft":
            tenant_id = data.get("tid", "")
            configured_tenant = cfg["tenant"]
            allowed = {"common", "organizations", "consumers"}
            if not tenant_id or issuer != f"https://login.microsoftonline.com/{tenant_id}/v2.0": raise ValueError("issuer mismatch")
            if configured_tenant not in allowed and tenant_id.lower() != configured_tenant.lower(): raise ValueError("tenant mismatch")
        subject = data["sub"]
        email = (data.get("email") or data.get("preferred_username") or "").lower()
        verified = data.get("email_verified", True) if provider == "google" else data.get("email_verified", False)
        if not email or not verified: raise ValueError("verified email required")
    except Exception: raise HTTPException(401, "Identity token validation failed")
    account = db.scalar(select(OAuthAccount).where(OAuthAccount.provider == provider, OAuthAccount.provider_user_id == subject))
    user = account.user if account else db.scalar(select(User).where(User.email == email))
    if not user:
        user = User(full_name=data.get("name") or email.split("@")[0], email=email, auth_provider=provider, provider_user_id=subject, profile_image=data.get("picture"), email_verified=True)
        db.add(user); db.flush()
    if not account:
        db.add(OAuthAccount(user_id=user.id, provider=provider, provider_user_id=subject, provider_email=email))
    user.last_login = datetime.now(timezone.utc)
    try: db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(409, "Unable to link this identity to the account")
    # Access JWT is returned through a one-time short lived redirect fragment to avoid referrer/server logs.
    access = create_access_token(user.id)
    target = settings.frontend_login_url + "#access_token=" + access
    response = RedirectResponse(target)
    for name in (f"oauth_{provider}_state", f"oauth_{provider}_nonce"): response.delete_cookie(name)
    raw, digest, expiry = new_refresh_token(); db.add(RefreshToken(user_id=user.id, token_hash=digest, expires_at=expiry)); db.commit()
    response.set_cookie("refresh_token", raw, httponly=True, secure=settings.cookie_secure, samesite=settings.cookie_samesite, path="/api/v1/auth", max_age=settings.refresh_token_days * 86400)
    return response
