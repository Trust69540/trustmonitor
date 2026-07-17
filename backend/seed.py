from database import SessionLocal, Projet, Activite, Zone, User
from auth import hash_password

db = SessionLocal()

# Create a test project
projet = Projet(nom="Programme Nutrition Nord", bailleur="UNICEF", statut="actif")
db.add(projet)
db.commit()
db.refresh(projet)

# Activities for that project
db.add_all([
    Activite(projet_id=projet.id, nom="Sensibilisation"),
    Activite(projet_id=projet.id, nom="Distribution"),
])

# Zones for that project
db.add_all([
    Zone(projet_id=projet.id, nom="Maroua", type="Ville"),
    Zone(projet_id=projet.id, nom="Village Koza", type="Village"),
])

# Test agent user (only if not already there)
existing = db.query(User).filter(User.email == "agent1@test.com").first()
if not existing:
    db.add(User(
        nom="Diallo", prenom="Awa", email="agent1@test.com",
        hashed_password=hash_password("password123"), role="agent"
    ))

db.commit()
print(f"Seeded project id={projet.id} with activities and zones.")
db.close()
