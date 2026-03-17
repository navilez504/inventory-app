from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app import models
from app.database.database import get_db
from app.schemas import StockWithDetails

router = APIRouter(tags=["stock"])


@router.get("/", response_model=List[StockWithDetails])
def list_stock(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Stock)
        .options(
            joinedload(models.Stock.bien),
            joinedload(models.Stock.ubicacion).joinedload(models.Ubicacion.bodega),
        )
        .all()
    )
    result = []
    for s in rows:
        result.append(
            StockWithDetails(
                id=s.id,
                bien_id=s.bien_id,
                ubicacion_id=s.ubicacion_id,
                cantidad=s.cantidad,
                bien_numero_inventario=s.bien.numero_inventario if s.bien else "",
                bien_modelo=s.bien.modelo if s.bien else None,
                ubicacion_nombre=s.ubicacion.nombre if s.ubicacion else "",
                bodega_nombre=(
                    s.ubicacion.bodega.nombre
                    if s.ubicacion and s.ubicacion.bodega
                    else ""
                ),
            )
        )
    return result
