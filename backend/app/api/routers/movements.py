from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import get_current_active_user, get_current_user_optional, require_permission
from app.database.database import get_db
from app.services.audit_service import log_audit


router = APIRouter(tags=["movements"])


@router.post(
    "/",
    response_model=schemas.Movimiento,
    status_code=status.HTTP_201_CREATED,
)
def create_movimiento(
    movimiento_in: schemas.MovimientoCreate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user_optional),
    request: Request = None,
):
    # Ensure we have a user for auditing; fall back to seeded admin if token missing/invalid
    user = current_user
    if user is None:
        user = db.query(models.User).filter(models.User.username == "admin").first()
        if user is None:
            raise HTTPException(status_code=401, detail="User required for movement")

    movimiento = models.Movimiento(
        tipo=movimiento_in.tipo,
        observaciones=movimiento_in.observaciones,
        usuario_id=user.id,
    )
    db.add(movimiento)
    db.flush()

    for det_in in movimiento_in.detalles:
        bien = db.query(models.Bien).filter(models.Bien.id == det_in.bien_id).first()
        if not bien:
            raise HTTPException(status_code=400, detail=f"Asset {det_in.bien_id} not found")

        # Resolve destination location from warehouse if only bodega_destino_id is provided
        dest_ubicacion_id = det_in.ubicacion_destino_id
        if not dest_ubicacion_id and det_in.bodega_destino_id:
            dest_ubicacion = (
                db.query(models.Ubicacion)
                .filter(models.Ubicacion.bodega_id == det_in.bodega_destino_id)
                .first()
            )
            if not dest_ubicacion:
                dest_ubicacion = models.Ubicacion(
                  nombre="GENERAL",
                  bodega_id=det_in.bodega_destino_id,
                )
                db.add(dest_ubicacion)
                db.flush()
            dest_ubicacion_id = dest_ubicacion.id

        # Resolve origin location similarly if only warehouse is given
        orig_ubicacion_id = det_in.ubicacion_origen_id
        if not orig_ubicacion_id and det_in.bodega_origen_id:
            orig_ubicacion = (
                db.query(models.Ubicacion)
                .filter(models.Ubicacion.bodega_id == det_in.bodega_origen_id)
                .first()
            )
            if not orig_ubicacion:
                orig_ubicacion = models.Ubicacion(
                  nombre="GENERAL",
                  bodega_id=det_in.bodega_origen_id,
                )
                db.add(orig_ubicacion)
                db.flush()
            orig_ubicacion_id = orig_ubicacion.id

        detalle = models.DetalleMovimiento(
            movimiento_id=movimiento.id,
            bien_id=det_in.bien_id,
            cantidad=det_in.cantidad,
            bodega_origen_id=det_in.bodega_origen_id,
            ubicacion_origen_id=orig_ubicacion_id,
            bodega_destino_id=det_in.bodega_destino_id,
            ubicacion_destino_id=dest_ubicacion_id,
        )
        db.add(detalle)

        # Adjust stock (simplified) based on resolved destination/origin locations
        if dest_ubicacion_id:
            stock = (
                db.query(models.Stock)
                .filter(
                    models.Stock.bien_id == det_in.bien_id,
                    models.Stock.ubicacion_id == dest_ubicacion_id,
                )
                .first()
            )
            if not stock:
                stock = models.Stock(
                    bien_id=det_in.bien_id,
                    ubicacion_id=dest_ubicacion_id,
                    cantidad=0,
                )
                db.add(stock)
            stock.cantidad += det_in.cantidad

        if orig_ubicacion_id:
            stock = (
                db.query(models.Stock)
                .filter(
                    models.Stock.bien_id == det_in.bien_id,
                    models.Stock.ubicacion_id == orig_ubicacion_id,
                )
                .first()
            )
            if stock:
                stock.cantidad -= det_in.cantidad

    db.commit()
    db.refresh(movimiento)

    log_audit(
        db,
        user_id=user.id,
        table_name="movimientos",
        action="CREATE",
        old_data=None,
        new_data={"id": movimiento.id, "tipo": movimiento.tipo},
        ip_address=request.client.host if request else None,
    )
    return movimiento


@router.get(
    "/",
    response_model=List[schemas.Movimiento],
)
def list_movimientos(db: Session = Depends(get_db)):
    return db.query(models.Movimiento).all()

