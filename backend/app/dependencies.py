import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.security import decode_access_token

bearer = HTTPBearer(auto_error=False)
def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials: raise HTTPException(401, "Authentication required")
    try: user_id = decode_access_token(credentials.credentials)
    except (jwt.PyJWTError, ValueError, RuntimeError): raise HTTPException(401, "Invalid or expired access token")
    user = db.get(User, user_id)
    if not user or user.status != "active": raise HTTPException(401, "Account unavailable")
    return user

def optional_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "): return None
    try: user_id = decode_access_token(header[7:].strip())
    except Exception: return None
    user = db.get(User, user_id)
    return user if user and user.status == "active" else None
