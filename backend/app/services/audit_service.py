from typing import Any, Optional

from sqlalchemy.orm import Session

from app import models


def log_audit(
    db: Session,
    *,
    user_id: int,
    table_name: str,
    action: str,
    old_data: Optional[dict[str, Any]] = None,
    new_data: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> models.Auditoria:
    audit = models.Auditoria(
        user_id=user_id,
        table_name=table_name,
        action=action,
        old_data=old_data,
        new_data=new_data,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

