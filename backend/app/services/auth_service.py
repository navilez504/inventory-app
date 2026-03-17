from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app import crud, models
from app.core.config import get_settings
from app.core.security import create_access_token, verify_password


settings = get_settings()


def authenticate_user(db: Session, username: str, password: str) -> models.User:
    user = crud.get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def create_user_session_and_token(
    db: Session, user: models.User, request: Request | None = None
) -> tuple[str, bool]:
    """
    Create a JWT access token and a corresponding Session row.

    Enforces a single active session per user by cancelling any existing
    non-expired sessions before creating the new one.
    """
    now = datetime.now(timezone.utc)
    # Check if there is any active session and remove it
    active_q = db.query(models.Session).filter(
        models.Session.user_id == user.id,
        models.Session.expires_at > now,
    )
    had_previous_session = active_q.first() is not None
    active_q.delete(synchronize_session=False)

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject={"sub": user.id}, expires_delta=expires_delta)

    session = models.Session(
        user_id=user.id,
        created_at=now,
        expires_at=now + expires_delta,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(session)
    db.commit()

    return token, had_previous_session


def logout_user(db: Session, user: models.User) -> None:
    """Invalidate all sessions for the given user."""
    db.query(models.Session).filter(models.Session.user_id == user.id).delete()
    db.commit()

