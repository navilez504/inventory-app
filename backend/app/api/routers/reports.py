"""Reporting & dashboard KPIs."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database.database import get_db


router = APIRouter(tags=["reports"])


def _float_or_0(v) -> float:
    if v is None:
        return 0.0
    return float(v)


@router.get("/dashboard-kpis", response_model=schemas.DashboardKPIs)
def dashboard_kpis(db: Session = Depends(get_db)) -> schemas.DashboardKPIs:
    total_assets = db.query(func.count(models.Bien.id)).scalar() or 0
    book = db.query(func.coalesce(func.sum(models.Bien.precio), 0)).scalar()
    total_stock = db.query(func.coalesce(func.sum(models.Stock.cantidad), 0)).scalar() or 0

    warehouses_count = db.query(func.count(models.Bodega.id)).scalar() or 0
    personas_count = db.query(func.count(models.Persona.id)).scalar() or 0

    active_assignments = (
        db.query(func.count(models.Asignacion.id))
        .filter(models.Asignacion.is_active.is_(True))
        .scalar()
        or 0
    )

    movements_total = db.query(func.count(models.Movimiento.id)).scalar() or 0
    since_30 = datetime.utcnow() - timedelta(days=30)
    movements_last_30 = (
        db.query(func.count(models.Movimiento.id))
        .filter(models.Movimiento.fecha >= since_30)
        .scalar()
        or 0
    )

    status_rows = (
        db.query(models.Bien.estado, func.count(models.Bien.id))
        .group_by(models.Bien.estado)
        .all()
    )
    assets_by_status = {str(row[0] or "UNKNOWN"): int(row[1]) for row in status_rows}

    cat_rows = (
        db.query(models.Categoria.nombre, func.count(models.Bien.id).label("c"))
        .join(models.Bien, models.Bien.categoria_id == models.Categoria.id)
        .group_by(models.Categoria.id, models.Categoria.nombre)
        .order_by(func.count(models.Bien.id).desc())
        .limit(8)
        .all()
    )
    top_categories = [
        schemas.NameCount(name=str(n or "—"), value=float(c)) for n, c in cat_rows
    ]

    wh_rows = (
        db.query(
            models.Bodega.nombre,
            func.sum(models.Stock.cantidad).label("total_cantidad"),
        )
        .join(models.Ubicacion, models.Ubicacion.bodega_id == models.Bodega.id)
        .join(models.Stock, models.Stock.ubicacion_id == models.Ubicacion.id)
        .group_by(models.Bodega.id, models.Bodega.nombre)
        .order_by(func.sum(models.Stock.cantidad).desc())
        .all()
    )
    stock_by_warehouse = [
        schemas.NameCount(name=str(n or "—"), value=_float_or_0(t)) for n, t in wh_rows
    ]

    tipo_rows = (
        db.query(models.Movimiento.tipo, func.count(models.Movimiento.id))
        .group_by(models.Movimiento.tipo)
        .all()
    )
    movements_by_type = {}
    for tipo, cnt in tipo_rows:
        key = tipo.value if hasattr(tipo, "value") else str(tipo)
        movements_by_type[key] = int(cnt)

    since_12m = datetime.utcnow() - timedelta(days=366)
    month_expr = func.date_trunc("month", models.Movimiento.fecha)
    month_rows = (
        db.query(month_expr, func.count(models.Movimiento.id))
        .filter(models.Movimiento.fecha >= since_12m)
        .group_by(month_expr)
        .order_by(month_expr)
        .all()
    )
    movements_by_month: List[schemas.NameCount] = []
    for m, cnt in month_rows:
        if m is None:
            continue
        label = m.strftime("%b %Y") if hasattr(m, "strftime") else str(m)[:7]
        movements_by_month.append(
            schemas.NameCount(name=label, value=float(int(cnt)))
        )

    return schemas.DashboardKPIs(
        total_assets=int(total_assets),
        total_book_value_usd=_float_or_0(book),
        total_stock_units=int(total_stock),
        warehouses_count=int(warehouses_count),
        personas_count=int(personas_count),
        active_assignments=int(active_assignments),
        movements_total=int(movements_total),
        movements_last_30_days=int(movements_last_30),
        assets_by_status=assets_by_status,
        top_categories=top_categories,
        stock_by_warehouse=stock_by_warehouse,
        movements_by_type=movements_by_type,
        movements_by_month=movements_by_month,
    )


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
        .filter(models.Asignacion.is_active.is_(True))
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
        .join(
            models.DetalleMovimiento,
            models.DetalleMovimiento.movimiento_id == models.Movimiento.id,
        )
        .filter(models.DetalleMovimiento.bien_id == bien_id)
        .order_by(models.Movimiento.fecha.desc())
        .all()
    )
    return [dict(r._mapping) for r in rows]
