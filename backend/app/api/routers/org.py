from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database.database import get_db


router = APIRouter(tags=["organization"])


@router.get("/gerencias", response_model=List[schemas.Gerencia])
def list_gerencias(db: Session = Depends(get_db)):
    return db.query(models.Gerencia).all()


@router.post(
    "/gerencias",
    response_model=schemas.Gerencia,
    status_code=status.HTTP_201_CREATED,
)
def create_gerencia(
    gerencia_in: schemas.GerenciaCreate, db: Session = Depends(get_db)
):
    if (
        db.query(models.Gerencia)
        .filter(models.Gerencia.nombre == gerencia_in.nombre)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Gerencia name already exists")
    gerencia = models.Gerencia(**gerencia_in.model_dump())
    db.add(gerencia)
    db.commit()
    db.refresh(gerencia)
    return gerencia


@router.get("/unidades", response_model=List[schemas.Unidad])
def list_unidades(db: Session = Depends(get_db)):
    return db.query(models.Unidad).all()


@router.post(
    "/unidades",
    response_model=schemas.Unidad,
    status_code=status.HTTP_201_CREATED,
)
def create_unidad(unidad_in: schemas.UnidadCreate, db: Session = Depends(get_db)):
    gerencia = (
        db.query(models.Gerencia)
        .filter(models.Gerencia.id == unidad_in.gerencia_id)
        .first()
    )
    if not gerencia:
        raise HTTPException(status_code=400, detail="Gerencia not found")
    unidad = models.Unidad(**unidad_in.model_dump())
    db.add(unidad)
    db.commit()
    db.refresh(unidad)
    return unidad


@router.get("/personas", response_model=List[schemas.Persona])
def list_personas(db: Session = Depends(get_db)):
    return db.query(models.Persona).all()


@router.post(
    "/personas",
    response_model=schemas.Persona,
    status_code=status.HTTP_201_CREATED,
)
def create_persona(persona_in: schemas.PersonaCreate, db: Session = Depends(get_db)):
    if (
        db.query(models.Persona)
        .filter(models.Persona.identificacion == persona_in.identificacion)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Identification already exists")
    unidad = (
        db.query(models.Unidad)
        .filter(models.Unidad.id == persona_in.unidad_id)
        .first()
    )
    if not unidad:
        raise HTTPException(status_code=400, detail="Unidad not found")
    persona = models.Persona(**persona_in.model_dump())
    db.add(persona)
    db.commit()
    db.refresh(persona)
    return persona
