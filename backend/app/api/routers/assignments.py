from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import get_current_active_user, get_current_user_optional, require_permission
from app.database.database import get_db
from app.services.audit_service import log_audit


router = APIRouter(tags=["assignments"])


@router.get(
    "/",
    response_model=List[schemas.Asignacion],
)
def list_assignments(db: Session = Depends(get_db)):
    return db.query(models.Asignacion).all()


@router.post(
    "/",
    response_model=schemas.Asignacion,
    status_code=status.HTTP_201_CREATED,
)
def create_assignment(
    asignacion_in: schemas.AsignacionCreate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user_optional),
    request: Request = None,
):
    bien = db.query(models.Bien).filter(models.Bien.id == asignacion_in.bien_id).first()
    if not bien:
        raise HTTPException(status_code=400, detail="Asset not found")
    persona = (
        db.query(models.Persona)
        .filter(models.Persona.id == asignacion_in.persona_id)
        .first()
    )
    if not persona:
        raise HTTPException(status_code=400, detail="Person not found")

    asignacion = models.Asignacion(**asignacion_in.model_dump())
    db.add(asignacion)
    bien.estado = models.BienEstadoEnum.ASIGNADO
    db.commit()
    db.refresh(asignacion)

    if current_user:
        log_audit(
            db,
            user_id=current_user.id,
            table_name="asignaciones",
            action="CREATE",
            old_data=None,
            new_data={
                "id": asignacion.id,
                "bien_id": asignacion.bien_id,
                "persona_id": asignacion.persona_id,
            },
            ip_address=request.client.host if request else None,
        )
    return asignacion

