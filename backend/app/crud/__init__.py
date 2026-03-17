from sqlalchemy.orm import Session

from app import models, schemas


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user_in: schemas.UserCreate, hashed_password: str) -> models.User:
    user = models.User(
        username=user_in.username,
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hashed_password,
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    if user_in.role_ids:
        roles = db.query(models.Role).filter(models.Role.id.in_(user_in.role_ids)).all()
        user.roles = roles
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[models.User]:
    return db.query(models.User).all()


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def update_user(db: Session, db_user: models.User, user_in: schemas.UserUpdate) -> models.User:
    data = user_in.model_dump(exclude_unset=True)
    role_ids = data.pop("role_ids", None)
    for field, value in data.items():
        setattr(db_user, field, value)
    if role_ids is not None:
        roles = db.query(models.Role).filter(models.Role.id.in_(role_ids)).all()
        db_user.roles = roles
    db.commit()
    db.refresh(db_user)
    return db_user

