"""Assignment rules: single active assignment, stock, status, movements."""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models


def _total_stock(db: Session, bien_id: int) -> int:
    q = (
        db.query(func.coalesce(func.sum(models.Stock.cantidad), 0))
        .filter(models.Stock.bien_id == bien_id)
        .scalar()
    )
    return int(q or 0)


def _active_assignment(db: Session, bien_id: int) -> models.Asignacion | None:
    return (
        db.query(models.Asignacion)
        .filter(
            models.Asignacion.bien_id == bien_id,
            models.Asignacion.is_active.is_(True),
        )
        .first()
    )


def _row_for_return(db: Session, bien_id: int) -> models.Asignacion | None:
    """Row to close on return: explicit active, open (no ended_at), or latest if asset still assigned."""
    r = (
        db.query(models.Asignacion)
        .filter(
            models.Asignacion.bien_id == bien_id,
            models.Asignacion.is_active.is_(True),
        )
        .first()
    )
    if r:
        return r
    r = (
        db.query(models.Asignacion)
        .filter(
            models.Asignacion.bien_id == bien_id,
            models.Asignacion.ended_at.is_(None),
        )
        .order_by(models.Asignacion.id.desc())
        .first()
    )
    if r:
        return r
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        return None
    est = str(bien.estado or "").upper()
    if est not in (models.AssetStatus.ASSIGNED, "ASIGNADO"):
        return None
    return (
        db.query(models.Asignacion)
        .filter(models.Asignacion.bien_id == bien_id)
        .order_by(models.Asignacion.id.desc())
        .first()
    )


def _estado_looks_assigned(estado: object) -> bool:
    s = str(estado or "").upper()
    return s in (models.AssetStatus.ASSIGNED, "ASIGNADO")


def log_inventory_movement(
    db: Session,
    *,
    asset_id: int,
    movement_type: str,
    created_by_id: int,
    from_user_id: int | None = None,
    to_user_id: int | None = None,
    from_persona_id: int | None = None,
    to_persona_id: int | None = None,
    from_warehouse_id: int | None = None,
    to_warehouse_id: int | None = None,
    reference: str | None = None,
    notes: str | None = None,
) -> models.InventoryMovement:
    m = models.InventoryMovement(
        asset_id=asset_id,
        movement_type=movement_type,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        from_persona_id=from_persona_id,
        to_persona_id=to_persona_id,
        from_warehouse_id=from_warehouse_id,
        to_warehouse_id=to_warehouse_id,
        movement_date=datetime.utcnow(),
        reference=reference,
        notes=notes,
        created_by_id=created_by_id,
    )
    db.add(m)
    return m


def create_assignment(
    db: Session,
    *,
    bien_id: int,
    persona_id: int,
    observaciones: str | None,
    acting_user: models.User,
    ip_address: str | None = None,
) -> models.Asignacion:
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        raise HTTPException(status_code=400, detail="Asset not found")
    persona = (
        db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    )
    if not persona:
        raise HTTPException(status_code=400, detail="Person not found")

    if bien.estado in (models.AssetStatus.OBSOLETE, models.AssetStatus.DAMAGED):
        raise HTTPException(
            status_code=400,
            detail="Cannot assign damaged or obsolete assets",
        )
    if bien.estado == models.AssetStatus.ASSIGNED:
        raise HTTPException(
            status_code=400,
            detail="Asset is already assigned; return it before reassigning",
        )
    if bien.estado not in (
        models.AssetStatus.AVAILABLE,
        models.AssetStatus.IN_WAREHOUSE,
    ):
        raise HTTPException(
            status_code=400,
            detail="Only AVAILABLE or IN_WAREHOUSE assets can be assigned",
        )

    stock = _total_stock(db, bien_id)
    if stock <= 0:
        raise HTTPException(
            status_code=400,
            detail="Asset has no stock in any warehouse; record a warehouse entry first",
        )

    if _active_assignment(db, bien_id):
        raise HTTPException(
            status_code=400,
            detail="Asset already has an active assignment",
        )

    try:
        asignacion = models.Asignacion(
            bien_id=bien_id,
            persona_id=persona_id,
            observaciones=observaciones,
            is_active=True,
            ended_at=None,
        )
        db.add(asignacion)
        bien.estado = models.AssetStatus.ASSIGNED
        log_inventory_movement(
            db,
            asset_id=bien_id,
            movement_type=models.InventoryMovementType.ASSIGNMENT,
            created_by_id=acting_user.id,
            to_persona_id=persona_id,
            notes=observaciones,
        )
        db.flush()
        db.commit()
        db.refresh(asignacion)
    except Exception:
        db.rollback()
        raise

    from app.services.audit_service import log_audit

    log_audit(
        db,
        user_id=acting_user.id,
        table_name="asignaciones",
        action="ASSIGN",
        old_data=None,
        new_data={
            "id": asignacion.id,
            "bien_id": bien_id,
            "persona_id": persona_id,
        },
        ip_address=ip_address,
    )
    return asignacion


def return_assignment(
    db: Session,
    *,
    bien_id: int,
    acting_user: models.User,
    ip_address: str | None = None,
) -> models.Asignacion | None:
    bien = db.query(models.Bien).filter(models.Bien.id == bien_id).first()
    if not bien:
        raise HTTPException(status_code=404, detail="Asset not found")

    row = _row_for_return(db, bien_id)
    if not row:
        if _estado_looks_assigned(bien.estado):
            try:
                stock = _total_stock(db, bien_id)
                bien.estado = (
                    models.AssetStatus.IN_WAREHOUSE
                    if stock > 0
                    else models.AssetStatus.AVAILABLE
                )
                db.commit()
            except Exception:
                db.rollback()
                raise
            from app.services.audit_service import log_audit

            log_audit(
                db,
                user_id=acting_user.id,
                table_name="bienes",
                action="RETURN_SYNC",
                old_data={"bien_id": bien_id, "estado": "ASSIGNED"},
                new_data={"estado": bien.estado},
                ip_address=ip_address,
            )
            return None
        raise HTTPException(status_code=404, detail="No active assignment for this asset")

    already_closed = row.ended_at is not None and row.is_active is False
    persona_for_audit = row.persona_id

    try:
        if not already_closed:
            row.is_active = False
            row.ended_at = row.ended_at or datetime.utcnow()
        stock = _total_stock(db, bien_id)
        bien.estado = (
            models.AssetStatus.IN_WAREHOUSE
            if stock > 0
            else models.AssetStatus.AVAILABLE
        )
        log_inventory_movement(
            db,
            asset_id=bien_id,
            movement_type=models.InventoryMovementType.RETURN,
            created_by_id=acting_user.id,
            from_persona_id=persona_for_audit,
            notes="Assignment returned"
            if not already_closed
            else "Assignment return (status sync)",
        )
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        raise

    from app.services.audit_service import log_audit

    log_audit(
        db,
        user_id=acting_user.id,
        table_name="asignaciones",
        action="RETURN",
        old_data={"bien_id": bien_id, "persona_id": persona_for_audit},
        new_data={"ended": True, "was_already_closed": already_closed},
        ip_address=ip_address,
    )
    return row
