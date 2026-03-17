from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import require_permission
from app.database.database import get_db


router = APIRouter(tags=["warehouses"])


@router.get(
    "/bodegas",
    response_model=List[schemas.Bodega],
)
def list_bodegas(db: Session = Depends(get_db)):
    return db.query(models.Bodega).all()


@router.post(
    "/bodegas",
    response_model=schemas.Bodega,
    status_code=status.HTTP_201_CREATED,
)
def create_bodega(bodega_in: schemas.BodegaCreate, db: Session = Depends(get_db)):
    bodega = models.Bodega(**bodega_in.model_dump())
    db.add(bodega)
    db.commit()
    db.refresh(bodega)
    return bodega


@router.get(
    "/ubicaciones",
    response_model=List[schemas.Ubicacion],
)
def list_ubicaciones(db: Session = Depends(get_db)):
    return db.query(models.Ubicacion).all()


@router.post(
    "/ubicaciones",
    response_model=schemas.Ubicacion,
    status_code=status.HTTP_201_CREATED,
)
def create_ubicacion(
    ubicacion_in: schemas.UbicacionCreate, db: Session = Depends(get_db)
):
    bodega = db.query(models.Bodega).filter(models.Bodega.id == ubicacion_in.bodega_id).first()
    if not bodega:
        raise HTTPException(status_code=400, detail="Bodega not found")
    ubicacion = models.Ubicacion(**ubicacion_in.model_dump())
    db.add(ubicacion)
    db.commit()
    db.refresh(ubicacion)
    return ubicacion

