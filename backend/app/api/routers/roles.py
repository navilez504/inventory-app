from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import get_current_active_user, require_permission
from app.database.database import get_db
from app.services.audit_service import log_audit


router = APIRouter(tags=["roles"])


def _role_with_permissions(db: Session, role: models.Role) -> schemas.RoleWithPermissions:
    """Refresh role from DB with permissions loaded and return schema."""
    db.refresh(role)
    return schemas.RoleWithPermissions.model_validate(role)


@router.get(
    "/permissions",
    response_model=List[schemas.Permission],
    dependencies=[Depends(require_permission("roles:view"))],
)
def list_permissions(db: Session = Depends(get_db)):
    """List all permissions (activities) that can be assigned to roles."""
    return db.query(models.Permission).order_by(models.Permission.code).all()


@router.get(
    "/",
    response_model=List[schemas.RoleWithPermissions],
    dependencies=[Depends(require_permission("roles:view"))],
)
def list_roles(db: Session = Depends(get_db)):
    roles = (
        db.query(models.Role)
        .order_by(models.Role.name)
        .all()
    )
    return [_role_with_permissions(db, r) for r in roles]


@router.get(
    "/{role_id}",
    response_model=schemas.RoleWithPermissions,
    dependencies=[Depends(require_permission("roles:view"))],
)
def get_role(role_id: int, db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return _role_with_permissions(db, role)


@router.post(
    "/",
    response_model=schemas.RoleWithPermissions,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("roles:manage"))],
)
def create_role(
    role_in: schemas.RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    if db.query(models.Role).filter(models.Role.name == role_in.name).first():
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = models.Role(name=role_in.name, description=role_in.description)
    db.add(role)
    db.flush()
    if role_in.permission_ids:
        perms = (
            db.query(models.Permission)
            .filter(models.Permission.id.in_(role_in.permission_ids))
            .all()
        )
        role.permissions = perms
    db.commit()
    db.refresh(role)
    log_audit(
        db,
        user_id=current_user.id,
        table_name="roles",
        action="CREATE",
        old_data=None,
        new_data={"id": role.id, "name": role.name},
        ip_address=request.client.host if request else None,
    )
    return _role_with_permissions(db, role)


@router.put(
    "/{role_id}",
    response_model=schemas.RoleWithPermissions,
    dependencies=[Depends(require_permission("roles:manage"))],
)
def update_role(
    role_id: int,
    role_in: schemas.RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    before = {"id": role.id, "name": role.name}
    if role_in.name is not None:
        other = db.query(models.Role).filter(models.Role.name == role_in.name, models.Role.id != role_id).first()
        if other:
            raise HTTPException(status_code=400, detail="Role name already exists")
        role.name = role_in.name
    if role_in.description is not None:
        role.description = role_in.description
    if role_in.permission_ids is not None:
        perms = (
            db.query(models.Permission)
            .filter(models.Permission.id.in_(role_in.permission_ids))
            .all()
        )
        role.permissions = perms
    db.commit()
    db.refresh(role)
    log_audit(
        db,
        user_id=current_user.id,
        table_name="roles",
        action="UPDATE",
        old_data=before,
        new_data={"id": role.id, "name": role.name},
        ip_address=request.client.host if request else None,
    )
    return _role_with_permissions(db, role)


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("roles:manage"))],
)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    user_count = (
        db.query(models.User)
        .join(models.User.roles)
        .filter(models.Role.id == role_id)
        .count()
    )
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete role that is assigned to users. Remove the role from all users first.",
        )
    log_audit(
        db,
        user_id=current_user.id,
        table_name="roles",
        action="DELETE",
        old_data={"id": role.id, "name": role.name},
        new_data=None,
        ip_address=request.client.host if request else None,
    )
    db.delete(role)
    db.commit()
    return None
