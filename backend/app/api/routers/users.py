from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core.security import get_current_active_user, hash_password, require_permission
from app.database.database import get_db
from app.services.audit_service import log_audit


router = APIRouter(tags=["users"])


@router.get(
    "/", response_model=List[schemas.User], dependencies=[Depends(require_permission("users:view"))]
)
def list_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@router.post(
    "/", response_model=schemas.User, status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("users:create"))],
)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    if crud.get_user_by_username(db, user_in.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pwd = hash_password(user_in.password)
    user = crud.create_user(db, user_in, hashed_pwd)
    log_audit(
        db,
        user_id=current_user.id,
        table_name="users",
        action="CREATE",
        old_data=None,
        new_data={"id": user.id, "username": user.username},
        ip_address=request.client.host if request else None,
    )
    return user


@router.put(
    "/{user_id}",
    response_model=schemas.User,
    dependencies=[Depends(require_permission("users:update"))],
)
def update_user(
    user_id: int,
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    db_user = crud.get_user(db, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    before = {"id": db_user.id, "username": db_user.username}
    db_user = crud.update_user(db, db_user, user_in)
    log_audit(
        db,
        user_id=current_user.id,
        table_name="users",
        action="UPDATE",
        old_data=before,
        new_data={"id": db_user.id, "username": db_user.username},
        ip_address=request.client.host if request else None,
    )
    return db_user

