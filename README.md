# Digital Marketing Platform

A complete digital marketing web application with a FastAPI backend and SQLite database.

## Architecture

- **Frontend:** Responsive marketing platform with multi-channel campaigns, analytics dashboard, onboarding flow, and feedback submission (`about.html`, `campaigns.html`, `dashboard.html`, `index.html`, `login.html`, `onboarding.html`, `signup.html`).
- **Backend:** FastAPI service with SQLAlchemy, SQLite (`marketly.db`), Alembic migrations, JWT authentication, and RESTful endpoints for campaigns, onboarding profiles, user management, and feedback.

## Getting Started

### 1. Run the Backend API
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```
The API starts at `http://127.0.0.1:8000` (interactive documentation at `http://127.0.0.1:8000/docs`).

### 2. Serve the Frontend
```powershell
python -m http.server 5500 --bind 127.0.0.1
```
Open `http://127.0.0.1:5500` in your browser.
