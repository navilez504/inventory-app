from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database.database import get_db


router = APIRouter(tags=["master_data"])


@router.get("/categorias", response_model=List[schemas.Categoria])
def list_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()


@router.post(
    "/categorias",
    response_model=schemas.Categoria,
    status_code=status.HTTP_201_CREATED,
)
def create_categoria(
    categoria_in: schemas.CategoriaCreate, db: Session = Depends(get_db)
):
    if (
        db.query(models.Categoria)
        .filter(models.Categoria.nombre == categoria_in.nombre)
        .first()
    ):
        raise HTTPException(status_code=400, detail="Category name already exists")
    categoria = models.Categoria(**categoria_in.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.get("/marcas", response_model=List[schemas.Marca])
def list_marcas(db: Session = Depends(get_db)):
    return db.query(models.Marca).all()


@router.post(
    "/marcas",
    response_model=schemas.Marca,
    status_code=status.HTTP_201_CREATED,
)
def create_marca(marca_in: schemas.MarcaCreate, db: Session = Depends(get_db)):
    if db.query(models.Marca).filter(models.Marca.nombre == marca_in.nombre).first():
        raise HTTPException(status_code=400, detail="Brand name already exists")
    marca = models.Marca(**marca_in.model_dump())
    db.add(marca)
    db.commit()
    db.refresh(marca)
    return marca


@router.get("/proveedores", response_model=List[schemas.Proveedor])
def list_proveedores(db: Session = Depends(get_db)):
    return db.query(models.Proveedor).all()


@router.post(
    "/proveedores",
    response_model=schemas.Proveedor,
    status_code=status.HTTP_201_CREATED,
)
def create_proveedor(
    proveedor_in: schemas.ProveedorCreate, db: Session = Depends(get_db)
):
    proveedor = models.Proveedor(**proveedor_in.model_dump())
    db.add(proveedor)
    db.commit()
    db.refresh(proveedor)
    return proveedor

