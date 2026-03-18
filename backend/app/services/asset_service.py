"""Asset creation and validation — transactional, DB integrity."""

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models


def create_asset(
    db: Session,
    *,
    bien_in,
    current_user: models.User | None = None,
) -> models.Bien:
    numero = (bien_in.numero_inventario or "").strip()
    if not numero:
        raise HTTPException(status_code=400, detail="Inventory number is required")
    if (
        db.query(models.Bien)
        .filter(models.Bien.numero_inventario == numero)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Inventory number already exists")

    data = bien_in.model_dump()
    data["numero_inventario"] = numero
    legacy = {
        "ACTIVO": models.AssetStatus.AVAILABLE,
        "ASIGNADO": models.AssetStatus.ASSIGNED,
        "DADO_DE_BAJA": models.AssetStatus.OBSOLETE,
    }
    st = data.get("estado") or models.AssetStatus.AVAILABLE
    if st in legacy:
        st = legacy[st]
    if st not in (
        models.AssetStatus.AVAILABLE,
        models.AssetStatus.IN_WAREHOUSE,
        models.AssetStatus.ASSIGNED,
        models.AssetStatus.DAMAGED,
        models.AssetStatus.OBSOLETE,
    ):
        st = models.AssetStatus.AVAILABLE
    data["estado"] = st

    bien = models.Bien(**data)
    db.add(bien)
    try:
        db.flush()
        db.commit()
        db.refresh(bien)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Inventory number already exists",
        )
    return bien


def update_asset(
    db: Session,
    *,
    bien: models.Bien,
    bien_in,
) -> models.Bien:
    payload = bien_in.model_dump(exclude_unset=True)
    if "estado" in payload and payload["estado"]:
        st = payload["estado"]
        legacy = {
            "ACTIVO": models.AssetStatus.AVAILABLE,
            "ASIGNADO": models.AssetStatus.ASSIGNED,
            "DADO_DE_BAJA": models.AssetStatus.OBSOLETE,
        }
        payload["estado"] = legacy.get(st, st)
        if payload["estado"] not in (
            models.AssetStatus.AVAILABLE,
            models.AssetStatus.IN_WAREHOUSE,
            models.AssetStatus.ASSIGNED,
            models.AssetStatus.DAMAGED,
            models.AssetStatus.OBSOLETE,
        ):
            del payload["estado"]
    if "numero_inventario" in payload and payload["numero_inventario"]:
        n = payload["numero_inventario"].strip()
        other = (
            db.query(models.Bien)
            .filter(
                models.Bien.numero_inventario == n,
                models.Bien.id != bien.id,
            )
            .first()
        )
        if other:
            raise HTTPException(status_code=400, detail="Inventory number already exists")
        payload["numero_inventario"] = n
    for field, value in payload.items():
        setattr(bien, field, value)
    try:
        db.commit()
        db.refresh(bien)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Inventory number already exists")
    return bien
