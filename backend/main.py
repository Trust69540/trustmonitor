from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from database import Projet, Activite, Zone, Rapport
import json
import os
import uuid
from fastapi import UploadFile, File, Form

app = FastAPI(title="TrustMonitor API")

@app.get("/")
def root():
    return {"message": "TrustMonitor API is running"}
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import User, SessionLocal
from auth import hash_password, verify_password, create_access_token

app = FastAPI(title="TrustMonitor API")

# Allow the mobile app to call this API from any origin (fine for dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    role: str

@app.get("/")
def root():
    return {"message": "TrustMonitor API is running"}

@app.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        nom=payload.nom,
        prenom=payload.prenom,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}

@app.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user.email, "role": user.role, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "role": user.role, "nom": user.nom}
# ---- User management (Admin) ----

class UserUpdateRequest(BaseModel):
    role: str | None = None
    statut: str | None = None


@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "nom": u.nom,
            "prenom": u.prenom,
            "email": u.email,
            "role": u.role,
            "statut": u.statut,
        }
        for u in users
    ]


@app.patch("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdateRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if payload.role is not None:
        user.role = payload.role
    if payload.statut is not None:
        user.statut = payload.statut

    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role, "statut": user.statut}


# ---- Project / Activity / Zone management (Admin / Chef de Projet) ----

class ProjetCreateRequest(BaseModel):
    nom: str
    bailleur: str | None = None


class ActiviteCreateRequest(BaseModel):
    nom: str


class ZoneCreateRequest(BaseModel):
    nom: str
    type: str | None = None


@app.post("/projets")
def create_projet(payload: ProjetCreateRequest, db: Session = Depends(get_db)):
    projet = Projet(nom=payload.nom, bailleur=payload.bailleur, statut="actif")
    db.add(projet)
    db.commit()
    db.refresh(projet)
    return {"id": projet.id, "nom": projet.nom, "bailleur": projet.bailleur}


@app.post("/projets/{projet_id}/activites")
def create_activite(projet_id: int, payload: ActiviteCreateRequest, db: Session = Depends(get_db)):
    activite = Activite(projet_id=projet_id, nom=payload.nom)
    db.add(activite)
    db.commit()
    db.refresh(activite)
    return {"id": activite.id, "nom": activite.nom, "projet_id": activite.projet_id}


@app.post("/projets/{projet_id}/zones")
def create_zone(projet_id: int, payload: ZoneCreateRequest, db: Session = Depends(get_db)):
    zone = Zone(projet_id=projet_id, nom=payload.nom, type=payload.type)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return {"id": zone.id, "nom": zone.nom, "type": zone.type, "projet_id": zone.projet_id}


@app.get("/projets")
def list_projets(db: Session = Depends(get_db)):
    projets = db.query(Projet).all()
    return [{"id": p.id, "nom": p.nom, "bailleur": p.bailleur} for p in projets]

@app.get("/projets/{projet_id}/activites")
def list_activites(projet_id: int, db: Session = Depends(get_db)):
    activites = db.query(Activite).filter(Activite.projet_id == projet_id).all()
    return [{"id": a.id, "nom": a.nom} for a in activites]

@app.get("/projets/{projet_id}/zones")
def list_zones(projet_id: int, db: Session = Depends(get_db)):
    zones = db.query(Zone).filter(Zone.projet_id == projet_id).all()
    return [{"id": z.id, "nom": z.nom, "type": z.type} for z in zones]
class RapportReviewRequest(BaseModel):
    statut: str  # "VALIDE" or "REJETE"
    commentaire_superviseur: str | None = None


@app.get("/rapports")
def list_rapports(statut: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Rapport)
    if statut:
        query = query.filter(Rapport.statut == statut)
    rapports = query.order_by(Rapport.cree_le.desc()).all()

    result = []
    for r in rapports:
        projet = db.query(Projet).filter(Projet.id == r.projet_id).first()
        activite = db.query(Activite).filter(Activite.id == r.activite_id).first()
        zone = db.query(Zone).filter(Zone.id == r.zone_id).first()
        auteur = db.query(User).filter(User.id == r.auteur_id).first()

        result.append({
            "id": r.id,
            "projet_nom": projet.nom if projet else None,
            "activite_nom": activite.nom if activite else None,
            "zone_nom": zone.nom if zone else None,
            "auteur_id": r.auteur_id,
            "auteur_nom": f"{auteur.prenom} {auteur.nom}" if auteur else None,
            "date_activite": r.date_activite,
            "commentaire_agent": r.commentaire_agent,
            "image_url": r.image_url,
            "statut": r.statut,
            "commentaire_superviseur": r.commentaire_superviseur,
            "commentaire_chef_projet": r.commentaire_chef_projet,
            "cree_le": r.cree_le.isoformat() if r.cree_le else None,
        })
    return result


VALID_TRANSITIONS = {
    "superviseur": {
        "from": "SOUMIS",
        "approve": "VALIDE_PAR_SUPERVISEUR",
        "reject": "REJETE_PAR_SUPERVISEUR",
    },
    "chef_projet": {
        "from": "VALIDE_PAR_SUPERVISEUR",
        "approve": "VALIDE_PAR_CHEF_PROJET",
        "reject": "REJETE_PAR_CHEF_PROJET",
    },
}


class RapportReviewRequestV2(BaseModel):
    action: str  # "approve" or "reject"
    role: str  # "superviseur" or "chef_projet"
    commentaire: str | None = None


@app.patch("/rapports/{rapport_id}")
def review_rapport(rapport_id: int, payload: RapportReviewRequestV2, db: Session = Depends(get_db)):
    rapport = db.query(Rapport).filter(Rapport.id == rapport_id).first()
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    if payload.role not in VALID_TRANSITIONS:
        raise HTTPException(status_code=400, detail="Role invalide")

    transition = VALID_TRANSITIONS[payload.role]

    if rapport.statut != transition["from"]:
        raise HTTPException(
            status_code=400,
            detail=f"Ce rapport n'est pas dans l'etat attendu ({transition['from']}) pour cette action"
        )

    if payload.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action invalide")

    if payload.action == "reject" and not payload.commentaire:
        raise HTTPException(status_code=400, detail="Un commentaire est requis pour rejeter un rapport")

    rapport.statut = transition["approve"] if payload.action == "approve" else transition["reject"]

    if payload.role == "superviseur":
        rapport.commentaire_superviseur = payload.commentaire
    elif payload.role == "chef_projet":
        rapport.commentaire_chef_projet = payload.commentaire

    db.commit()
    db.refresh(rapport)

    return {
        "id": rapport.id,
        "statut": rapport.statut,
        "commentaire_superviseur": rapport.commentaire_superviseur,
        "commentaire_chef_projet": rapport.commentaire_chef_projet,
    }


import base64
import json
import os
from groq import Groq

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

EXTRACTION_PROMPT = """Tu regardes la photo d'une fiche de terrain remplie a la main pour une activite humanitaire.
Extrait les informations suivantes et reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "hommes": <nombre entier d'hommes participants, 0 si illisible>,
  "femmes": <nombre entier de femmes participantes, 0 si illisible>,
  "enfants": <nombre entier d'enfants participants, 0 si illisible>,
  "contraintes": "<texte des contraintes/problemes mentionnes, chaine vide si aucun>"
}"""

@app.post("/rapports/extract")
async def extract_rapport_data(image: UploadFile = File(...)):
    """
    Real AI extraction using Groq's hosted open-weight vision model (Qwen3.6 27B).
    Reads a photographed handwritten field form and returns structured data.
    """
    image_bytes = await image.read()
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = image.content_type or "image/jpeg"

    try:
        completion = groq_client.chat.completions.create(
            model="qwen/qwen3.6-27b",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content
        parsed = json.loads(raw)
    except Exception as e:
        # Fallback so the app never hard-crashes if the AI call fails (rate limit, bad image, etc.)
        return {
            "hommes": 0,
            "femmes": 0,
            "enfants": 0,
            "contraintes": "",
            "_error": str(e),
        }

    return {
        "hommes": int(parsed.get("hommes", 0) or 0),
        "femmes": int(parsed.get("femmes", 0) or 0),
        "enfants": int(parsed.get("enfants", 0) or 0),
        "contraintes": parsed.get("contraintes", "") or "",
    }


@app.post("/rapports")
async def create_rapport(
    projet_id: int = Form(...),
    activite_id: int = Form(...),
    zone_id: int = Form(...),
    date_activite: str = Form(...),
    commentaire_agent: str = Form(""),
    auteur_id: int = Form(...),
    donnees_extraites_json: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Save the image locally instead of a paid cloud service
    file_extension = os.path.splitext(image.filename or "photo.jpg")[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join("uploads", unique_filename)
    with open(file_path, "wb") as f:
        f.write(await image.read())
    image_url = f"{BASE_URL}/uploads/{unique_filename}"

    rapport = Rapport(
        projet_id=projet_id,
        activite_id=activite_id,
        zone_id=zone_id,
        auteur_id=auteur_id,
        date_activite=date_activite,
        commentaire_agent=commentaire_agent,
        image_url=image_url,
        donnees_extraites_json=donnees_extraites_json,
        statut="SOUMIS",
    )
    db.add(rapport)
    db.commit()
    db.refresh(rapport)

    return {
        "id": rapport.id,
        "statut": rapport.statut,
        "image_url": rapport.image_url,
    }


@app.get("/debug-db")
def debug_db():
    import os
    url = os.environ.get("DATABASE_URL", "NOT SET")
    masked = url[:25] + "..." + url[-25:] if len(url) > 50 else url
    from database import SessionLocal, Projet, User
    db = SessionLocal()
    try:
        project_count = db.query(Projet).count()
        user_count = db.query(User).count()
        return {"database_url_masked": masked, "project_count": project_count, "user_count": user_count}
    except Exception as e:
        return {"database_url_masked": masked, "error": str(e)}
    finally:
        db.close()
