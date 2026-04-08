import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

ENV = os.getenv("ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL")

if ENV != "development" and not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required in non-development environments")

if ENV == "development" and not DATABASE_URL:
    DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/stratotrack"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()