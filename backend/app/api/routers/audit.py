from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.security import require_permission
from app.database.database import get_db
from app.services.audit_display import (
    audit_summary,
    collect_persona_ids_from_audit_payloads,
    load_persona_labels,
)


router = APIRouter(tags=["audit"])


@router.get(
    "/",
    response_model=List[schemas.AuditoriaEnriched],
)
def list_audit_logs(
    db: Session = Depends(get_db),
    _perm: models.User = Depends(require_permission("audit:view")),
    table_name: Optional[str] = Query(None, description="Filter by affected table"),
    action: Optional[str] = Query(None, description="Filter by action (CREATE, UPDATE, …)"),
    user_id: Optional[int] = Query(None, description="Filter by acting user id"),
    limit: int = Query(300, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    q = (
        db.query(models.Auditoria, models.User.username, models.User.full_name)
        .outerjoin(models.User, models.User.id == models.Auditoria.user_id)
        .order_by(models.Auditoria.timestamp.desc())
    )
    if table_name:
        q = q.filter(models.Auditoria.table_name == table_name)
    if action:
        q = q.filter(models.Auditoria.action == action)
    if user_id is not None:
        q = q.filter(models.Auditoria.user_id == user_id)
    rows = q.offset(offset).limit(limit).all()

    persona_ids = collect_persona_ids_from_audit_payloads(
        [(a.old_data, a.new_data) for a, _, _ in rows]
    )
    persona_labels = load_persona_labels(db, persona_ids)

    out: List[schemas.AuditoriaEnriched] = []
    for a, username, full_name in rows:
        un = username or ""
        fn = full_name or ""
        if not un and not fn:
            un = f"#{a.user_id}"
        out.append(
            schemas.AuditoriaEnriched(
                id=a.id,
                user_id=a.user_id,
                username=un,
                full_name=fn,
                table_name=a.table_name,
                action=a.action,
                summary=audit_summary(
                    a.table_name,
                    a.action,
                    a.old_data,
                    a.new_data,
                    persona_labels=persona_labels,
                ),
                old_data=a.old_data,
                new_data=a.new_data,
                timestamp=a.timestamp,
                ip_address=a.ip_address,
            )
        )
    return out


@router.get("/meta/filters", response_model=dict)
def audit_filter_options(
    db: Session = Depends(get_db),
    _perm: models.User = Depends(require_permission("audit:view")),
):
    """Distinct table names and actions for UI filters."""
    tables = [
        r[0]
        for r in db.query(models.Auditoria.table_name)
        .distinct()
        .order_by(models.Auditoria.table_name)
        .all()
    ]
    actions = [
        r[0]
        for r in db.query(models.Auditoria.action)
        .distinct()
        .order_by(models.Auditoria.action)
        .all()
    ]
    return {"tables": tables, "actions": actions}
