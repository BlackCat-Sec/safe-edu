from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "safeed.db"
DATABASE_URL = os.getenv("SAFEED_DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
CONNECT_ARGS = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
