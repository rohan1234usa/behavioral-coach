import secrets

from sqlalchemy import inspect, text

from app.core.config import settings
from app.db.base import Base, SessionLocal, engine
from app.db.models import Session as UserSession


def _ensure_column(table_name: str, column_name: str, ddl: str):
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in existing_columns:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def _ensure_index(index_name: str, table_name: str, column_name: str, unique: bool = False):
    inspector = inspect(engine)
    existing_indexes = {index["name"] for index in inspector.get_indexes(table_name)}
    if index_name not in existing_indexes:
        unique_sql = "UNIQUE " if unique else ""
        with engine.begin() as conn:
            conn.execute(text(f"CREATE {unique_sql}INDEX {index_name} ON {table_name} ({column_name})"))


def init_database():
    if settings.AUTO_CREATE_DB:
        Base.metadata.create_all(bind=engine)

    # Lightweight repair for deployed MVP databases created before migrations existed.
    # Alembic should own future schema changes once introduced.
    _ensure_column("sessions", "access_token", "access_token VARCHAR")
    _ensure_column("sessions", "error_message", "error_message TEXT")
    _ensure_index("ix_sessions_access_token", "sessions", "access_token")

    db = SessionLocal()
    try:
        sessions_without_tokens = db.query(UserSession).filter(UserSession.access_token.is_(None)).all()
        for db_session in sessions_without_tokens:
            db_session.access_token = secrets.token_urlsafe(32)
        if sessions_without_tokens:
            db.commit()
    finally:
        db.close()
