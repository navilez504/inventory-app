from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import get_current_active_user, get_current_user_optional, require_permission
from app.database.database import get_db
from app.services.audit_service import log_audit


router = APIRouter(tags=["assets"])


@router.get(
    "/",
    response_model=List[schemas.Bien],
)
def list_assets(db: Session = Depends(get_db)):
    return db.query(models.Bien).all()


@router.post(
    "/",
    response_model=schemas.Bien,
    status_code=status.HTTP_201_CREATED,
)
def create_asset(
    bien_in: schemas.BienCreate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user_optional),
    request: Request = None,
):
    if (
        db.query(models.Bien)
        .filter(models.Bien.numero_inventario == bien_in.numero_inventario)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Inventory number already exists")
    bien = models.Bien(**bien_in.model_dump())
    db.add(bien)
    db.commit()
    db.refresh(bien)
    if current_user:
        log_audit(
            db,
            user_id=current_user.id,
            table_name="bienes",
            action="CREATE",
            old_data=None,
            new_data={"id": bien.id, "numero_inventario": bien.numero_inventario},
            ip_address=request.client.host if request else None,
        )
    return bien


@router.get(
    "/{bien_id}",
    response_model=schemas.Bien,
    dependencies=[Depends(require_permission("assets:view"))],
)
def get_asset(bien_id: int, db: Session = Depends(get_db)):
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        raise HTTPException(status_code=404, detail="Asset not found")
    return bien


@router.delete(
    "/{bien_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("assets:delete"))],
)
def delete_asset(
    bien_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
    request: Request = None,
):
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        raise HTTPException(status_code=404, detail="Asset not found")
    before = {"id": bien.id, "numero_inventario": bien.numero_inventario}
    db.delete(bien)
    db.commit()
    log_audit(
        db,
        user_id=current_user.id,
        table_name="bienes",
        action="DELETE",
        old_data=before,
        new_data=None,
        ip_address=request.client.host if request else None,
    )
    return None

@router.put(
    "/{bien_id}",
    response_model=schemas.Bien,
)
def update_asset(
    bien_id: int,
    bien_in: schemas.BienUpdate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user_optional),
    request: Request = None,
):
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        raise HTTPException(status_code=404, detail="Asset not found")
    before = {"id": bien.id, "numero_inventario": bien.numero_inventario}
    for field, value in bien_in.model_dump(exclude_unset=True).items():
        setattr(bien, field, value)
    db.commit()
    db.refresh(bien)
    if current_user:
        log_audit(
            db,
            user_id=current_user.id,
            table_name="bienes",
            action="UPDATE",
            old_data=before,
            new_data={"id": bien.id, "numero_inventario": bien.numero_inventario},
            ip_address=request.client.host if request else None,
        )
    return bien

