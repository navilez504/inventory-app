from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database.database import get_db


router = APIRouter(tags=["reports"])


@router.get("/inventory-by-warehouse")
def inventory_by_warehouse(db: Session = Depends(get_db)):
  rows = (
      db.query(
          models.Bodega.id.label("bodega_id"),
          models.Bodega.nombre.label("bodega_nombre"),
          func.sum(models.Stock.cantidad).label("total_cantidad"),
      )
      .join(models.Ubicacion, models.Ubicacion.bodega_id == models.Bodega.id)
      .join(models.Stock, models.Stock.ubicacion_id == models.Ubicacion.id)
      .group_by(models.Bodega.id, models.Bodega.nombre)
      .all()
  )
  return [dict(r._mapping) for r in rows]


@router.get("/inventory-by-person")
def inventory_by_person(db: Session = Depends(get_db)):
  rows = (
      db.query(
          models.Persona.id.label("persona_id"),
          models.Persona.nombres,
          models.Persona.apellidos,
          func.count(models.Asignacion.id).label("bienes_asignados"),
      )
      .join(models.Asignacion, models.Asignacion.persona_id == models.Persona.id)
      .group_by(models.Persona.id, models.Persona.nombres, models.Persona.apellidos)
      .all()
  )
  return [dict(r._mapping) for r in rows]


@router.get("/asset-movements/{bien_id}")
def asset_movement_history(bien_id: int, db: Session = Depends(get_db)):
  rows = (
      db.query(
          models.Movimiento.id.label("movimiento_id"),
          models.Movimiento.tipo,
          models.Movimiento.fecha,
          models.Movimiento.observaciones,
          models.DetalleMovimiento.cantidad,
      )
      .join(models.DetalleMovimiento, models.DetalleMovimiento.movimiento_id == models.Movimiento.id)
      .filter(models.DetalleMovimiento.bien_id == bien_id)
      .order_by(models.Movimiento.fecha.desc())
      .all()
  )
  return [dict(r._mapping) for r in rows]

