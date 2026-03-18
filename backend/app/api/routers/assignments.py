from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, or_
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import get_current_user_optional
from app.database.database import get_db
from app.services import assignment_service


router = APIRouter(tags=["assignments"])


def _acting_user(db: Session, current_user: models.User | None) -> models.User:
    if current_user:
        return current_user
    u = db.query(models.User).filter(models.User.username == "admin").first()
    if not u:
        raise HTTPException(status_code=401, detail="Authentication required")
    return u


@router.get("/", response_model=List[schemas.Asignacion])
def list_assignments(
    db: Session = Depends(get_db),
    active_only: bool = True,
):
    q = db.query(models.Asignacion)
    if active_only:
        q = q.join(models.Bien, models.Asignacion.bien_id == models.Bien.id).filter(
            or_(
                models.Asignacion.is_active.is_(True),
                and_(
                    models.Asignacion.ended_at.is_(None),
                    models.Bien.estado.in_(
                        (models.AssetStatus.ASSIGNED, "ASIGNADO"),
                    ),
                ),
            )
        )
    return q.order_by(models.Asignacion.fecha.desc()).all()


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
    user = _acting_user(db, current_user)
    return assignment_service.create_assignment(
        db,
        bien_id=asignacion_in.bien_id,
        persona_id=asignacion_in.persona_id,
        observaciones=asignacion_in.observaciones,
        acting_user=user,
        ip_address=request.client.host if request else None,
    )


@router.post("/return/{bien_id}")
def return_assignment(
    bien_id: int,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_current_user_optional),
    request: Request = None,
):
    user = _acting_user(db, current_user)
    result = assignment_service.return_assignment(
        db,
        bien_id=bien_id,
        acting_user=user,
        ip_address=request.client.host if request else None,
    )
    if result is None:
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "synced": True,
                "message": "Asset had no assignment row; status was updated to match inventory.",
            },
        )
    return result
