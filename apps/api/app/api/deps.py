from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import Session as UserSession, User


@dataclass
class CurrentUser:
    id: int
    email: str
    full_name: str


def _clean_email(email: Optional[str]) -> str:
    value = (email or "").strip().lower()
    if "@" not in value or len(value) > 320:
        raise HTTPException(status_code=401, detail="Authenticated user is required")
    return value


def get_current_user(
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(default=None, alias="X-User-Name"),
    db: Session = Depends(get_db),
) -> CurrentUser:
    email = _clean_email(x_user_email)
    full_name = (x_user_name or "Candidate").strip()[:120] or "Candidate"

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, full_name=full_name, target_role="General")
        db.add(user)
        db.commit()
        db.refresh(user)
    elif full_name and user.full_name != full_name:
        user.full_name = full_name
        db.commit()

    return CurrentUser(id=user.id, email=user.email, full_name=user.full_name or "Candidate")


def get_optional_current_user(
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
    x_user_name: Optional[str] = Header(default=None, alias="X-User-Name"),
    db: Session = Depends(get_db),
) -> Optional[CurrentUser]:
    if not x_user_email:
        return None
    return get_current_user(x_user_email=x_user_email, x_user_name=x_user_name, db=db)


def get_session_token(
    session_token: Optional[str] = Query(default=None),
    x_session_token: Optional[str] = Header(default=None, alias="X-Session-Token"),
) -> str:
    token = (x_session_token or session_token or "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Session token is required")
    return token


def get_accessible_session(
    session_id: int,
    session_token: str = Depends(get_session_token),
    db: Session = Depends(get_db),
) -> UserSession:
    db_session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not db_session.access_token or db_session.access_token != session_token:
        raise HTTPException(status_code=403, detail="Session access denied")
    return db_session
