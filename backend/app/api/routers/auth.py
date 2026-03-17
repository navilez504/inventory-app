from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import models
from app.core.security import get_current_active_user
from app.database.database import get_db
from app.schemas import AuthResponse
from app.services.auth_service import (
    authenticate_user,
    create_user_session_and_token,
    logout_user,
)


router = APIRouter(tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    request: Request = None,
):
    user = authenticate_user(db, form_data.username, form_data.password)
    access_token, replaced_previous_session = create_user_session_and_token(
        db, user, request
    )
    return AuthResponse(
        access_token=access_token,
        user=user,
        replaced_previous_session=replaced_previous_session,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    logout_user(db, current_user)
    return None

