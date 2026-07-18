from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./trustmonitor.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "agent", "superviseur", "chef_projet"
    statut = Column(String, default="actif")  # "actif", "en_attente", "suspendu"
class Projet(Base):
    __tablename__ = "projets"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    bailleur = Column(String, nullable=True)
    statut = Column(String, default="actif")

class Activite(Base):
    __tablename__ = "activites"
    id = Column(Integer, primary_key=True, index=True)
    projet_id = Column(Integer, ForeignKey("projets.id"))
    nom = Column(String, nullable=False)

class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    projet_id = Column(Integer, ForeignKey("projets.id"))
    nom = Column(String, nullable=False)
    type = Column(String, nullable=True)

class Rapport(Base):
    __tablename__ = "rapports"
    id = Column(Integer, primary_key=True, index=True)
    projet_id = Column(Integer, ForeignKey("projets.id"))
    auteur_id = Column(Integer, ForeignKey("users.id"))
    activite_id = Column(Integer, ForeignKey("activites.id"))
    zone_id = Column(Integer, ForeignKey("zones.id"))
    date_activite = Column(String, nullable=True)
    commentaire_agent = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    statut = Column(String, default="SOUMIS")
    commentaire_superviseur = Column(String, nullable=True)
    commentaire_chef_projet = Column(String, nullable=True)
    donnees_extraites_json = Column(String, nullable=True)
    cree_le = Column(DateTime, default=datetime.utcnow)
Base.metadata.create_all(bind=engine)
