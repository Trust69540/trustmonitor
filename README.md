# TrustMonitor

Field activity monitoring app: agents submit reports with photos from the field,
which move through a validation workflow (Superviseur → Chef de Projet) with
AI-assisted data extraction from handwritten forms.

## Structure

- `backend/` — FastAPI + SQLAlchemy (PostgreSQL) API: auth, reports, projects, AI extraction
- `mobile/trustmonitor-mobile/` — React Native (Expo) mobile app

## Backend setup

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real DATABASE_URL and GROQ_API_KEY
uvicorn main:app --reload

API docs available at http://localhost:8000/docs

## Mobile setup

cd mobile/trustmonitor-mobile
npm install
npx expo start

## Report workflow

Reports move through: SOUMIS → VALIDE_PAR_SUPERVISEUR → VALIDE_PAR_CHEF_PROJET
(or REJETE at either stage). See VALID_TRANSITIONS in backend/main.py.
^\
# TrustMonitor

Field activity monitoring app: agents submit reports with photos from the field,
which move through a validation workflow (Superviseur → Chef de Projet) with
AI-assisted data extraction from handwritten forms.

## Structure

- `backend/` — FastAPI + SQLAlchemy (PostgreSQL) API: auth, reports, projects, AI extraction
- `mobile/trustmonitor-mobile/` — React Native (Expo) mobile app

## Backend setup

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload

API docs available at http://localhost:8000/docs

## Mobile setup

cd mobile/trustmonitor-mobile
npm install
npx expo start

## Report workflow

Reports move through: SOUMIS → VALIDE_PAR_SUPERVISEUR → VALIDE_PAR_CHEF_PROJET
(or REJETE at either stage). See VALID_TRANSITIONS in backend/main.py.
