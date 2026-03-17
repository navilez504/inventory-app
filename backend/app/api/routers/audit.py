from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import require_permission
from app.database.database import get_db


router = APIRouter(tags=["audit"])


@router.get(
    "/",
    response_model=List[schemas.Auditoria],
)
def list_audit_logs(db: Session = Depends(get_db)):
    return db.query(models.Auditoria).order_by(models.Auditoria.timestamp.desc()).all()

