import pytest
from sqlalchemy import select
from conftest import TestingSession
from app.models import Feedback

def reg(email="person@example.com", **extra):
    data = {"full_name": "Test Person", "email": email, "password": "StrongPassword123!", "confirm_password": "StrongPassword123!"}
    data.update(extra)
    return data

@pytest.mark.anyio
async def test_health(client):
    async with await client() as c:
        assert (await c.get("/health")).json() == {"status": "ok"}
        assert (await c.get("/api/v1/health")).status_code == 200

@pytest.mark.anyio
async def test_registration_validation_duplicate(client):
    async with await client() as c:
        assert (await c.post("/api/v1/auth/register", json=reg())).status_code == 201
        assert (await c.post("/api/v1/auth/register", json=reg())).status_code == 409
        assert (await c.post("/api/v1/auth/register", json=reg(email="wrong"))).status_code == 422
        assert (await c.post("/api/v1/auth/register", json=reg(email="weak@example.com", password="weak", confirm_password="weak"))).status_code == 422
        assert (await c.post("/api/v1/auth/register", json={})).status_code == 422
        assert (await c.post("/api/v1/auth/register", json=reg(email="mismatch@example.com", confirm_password="DifferentPassword1!"))).status_code == 422

@pytest.mark.anyio
async def test_login_refresh_logout_and_protected_profile(client):
    async with await client() as c:
        await c.post("/api/v1/auth/register", json=reg())
        assert (await c.post("/api/v1/auth/login", json={"email": "person@example.com", "password": "incorrect"})).status_code == 401
        result = await c.post("/api/v1/auth/login", json={"email": "person@example.com", "password": "StrongPassword123!"})
        assert result.status_code == 200
        access = result.json()["access_token"]
        assert (await c.get("/api/v1/auth/me", headers={"Authorization": "Bearer " + access})).status_code == 200
        assert (await c.get("/api/v1/auth/me")).status_code == 401
        assert (await c.post("/api/v1/auth/refresh")).status_code == 200
        assert (await c.post("/api/v1/auth/logout")).status_code == 204
        assert (await c.post("/api/v1/auth/refresh")).status_code == 401

@pytest.mark.anyio
async def test_feedback_validation_and_saved_response(client):
    payload = {"name": "Ada Person", "email": "ada@example.com", "subject": "Product feedback", "message": "This is a useful product suggestion.", "rating": 5}
    async with await client() as c:
        result = await c.post("/api/v1/feedback", json=payload)
        assert result.status_code == 201
        assert result.json()["message"].startswith("Thank you")
        with TestingSession() as db:
            saved = db.scalar(select(Feedback).where(Feedback.email == "ada@example.com"))
            assert saved is not None and saved.message == payload["message"]
        assert (await c.post("/api/v1/feedback", json={**payload, "email": "bad"})).status_code == 422
        assert (await c.post("/api/v1/feedback", json={**payload, "message": ""})).status_code == 422
        assert (await c.post("/api/v1/feedback", json={**payload, "rating": 6})).status_code == 422

@pytest.mark.anyio
async def test_social_urls_exact(client):
    async with await client() as c:
        data = (await c.get("/api/v1/social-links")).json()
        assert data["facebook"] == "https://www.facebook.com/people/Stackly-Stackly/pfbid02NmgSaxmeD8WJngqrhKudvxzak9GvzPLz6YS9NMdJJM9rSeJ7ZTyG6h3HF3p3koBEl/?rdid=3qmngFeLJe3ChGfe&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1BrqaZkJRe%2F"
        assert data["instagram"] == "https://www.instagram.com/thestackly"
        assert data["linkedin"] == "https://www.linkedin.com/company/the-stackly/"
        assert data["x"] == "https://x.com/The_Stackly"

@pytest.mark.anyio
async def test_oauth_configuration_and_invalid_callback(client):
    async with await client() as c:
        assert (await c.get("/api/v1/auth/google")).status_code in (302, 503)
        assert (await c.get("/api/v1/auth/google/callback?state=wrong&code=test")).status_code in (400, 503)
        assert (await c.get("/api/v1/auth/microsoft/callback?state=wrong&code=test")).status_code in (400, 503)

@pytest.mark.anyio
async def test_campaigns_and_onboarding_database_storage(client):
    async with await client() as c:
        camps_res = await c.get("/api/v1/campaigns")
        assert camps_res.status_code == 200
        assert len(camps_res.json()) >= 4

        new_camp = {
            "name": "Winter Launch",
            "channels": "Instagram + Google Ads",
            "spent": 0,
            "leads": 0,
            "roi": 0,
            "status": "active"
        }
        create_res = await c.post("/api/v1/campaigns", json=new_camp)
        assert create_res.status_code == 201
        created_data = create_res.json()
        assert created_data["name"] == "Winter Launch"
        assert created_data["id"] is not None

        updated_camps = (await c.get("/api/v1/campaigns")).json()
        assert any(x["name"] == "Winter Launch" for x in updated_camps)

        onboard_payload = {
            "business_name": "Apex Marketing Corp",
            "goals": ["Get more leads", "Increase sales"],
            "channels": ["Instagram", "Google Ads"]
        }
        onboard_res = await c.post("/api/v1/onboarding", json=onboard_payload)
        assert onboard_res.status_code == 201
        onboard_data = onboard_res.json()
        assert onboard_data["business_name"] == "Apex Marketing Corp"
        assert onboard_data["goals"] == ["Get more leads", "Increase sales"]

        get_onboard = (await c.get("/api/v1/onboarding")).json()
        assert get_onboard["business_name"] == "Apex Marketing Corp"
        assert get_onboard["channels"] == ["Instagram", "Google Ads"]
