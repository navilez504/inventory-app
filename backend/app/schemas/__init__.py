from datetime import date, datetime
from typing import Optional, List, Dict

from pydantic import BaseModel, EmailStr


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class Role(RoleBase):
    id: int

    class Config:
        from_attributes = True


class RoleWithPermissions(Role):
    permissions: List["Permission"] = []

    class Config:
        from_attributes = True


class PermissionBase(BaseModel):
    code: str
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class Permission(PermissionBase):
    id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    username: str
    full_name: str
    email: EmailStr
    is_active: bool = True


class UserCreate(UserBase):
    password: str
    is_superuser: bool = False
    role_ids: List[int] = []


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None


class User(UserBase):
    id: int
    is_superuser: bool
    roles: List[Role] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
    exp: int


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
    replaced_previous_session: bool = False


class CategoriaBase(BaseModel):
    nombre: str


class CategoriaCreate(CategoriaBase):
    pass


class Categoria(CategoriaBase):
    id: int

    class Config:
        from_attributes = True


class MarcaBase(BaseModel):
    nombre: str


class MarcaCreate(MarcaBase):
    pass


class Marca(MarcaBase):
    id: int

    class Config:
        from_attributes = True


class ProveedorBase(BaseModel):
    nombre: str
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[EmailStr] = None
    direccion: Optional[str] = None


class ProveedorCreate(ProveedorBase):
    pass


class Proveedor(ProveedorBase):
    id: int

    class Config:
        from_attributes = True


class BienBase(BaseModel):
    numero_inventario: str
    categoria_id: int
    marca_id: int
    modelo: Optional[str] = None
    serie: Optional[str] = None
    precio: float
    fecha_adquisicion: date
    proveedor_id: Optional[int] = None
    estado: str = "AVAILABLE"
    observaciones: Optional[str] = None


class BienCreate(BienBase):
    pass


class BienUpdate(BaseModel):
    modelo: Optional[str] = None
    serie: Optional[str] = None
    precio: Optional[float] = None
    proveedor_id: Optional[int] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None


class Bien(BienBase):
    id: int

    class Config:
        from_attributes = True


class BodegaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class BodegaCreate(BodegaBase):
    pass


class Bodega(BodegaBase):
    id: int

    class Config:
        from_attributes = True


class UbicacionBase(BaseModel):
    nombre: str
    bodega_id: int


class UbicacionCreate(UbicacionBase):
    pass


class Ubicacion(UbicacionBase):
    id: int

    class Config:
        from_attributes = True


class MovimientoBase(BaseModel):
    tipo: str
    observaciones: Optional[str] = None


class DetalleMovimientoBase(BaseModel):
    bien_id: int
    cantidad: int
    bodega_origen_id: Optional[int] = None
    ubicacion_origen_id: Optional[int] = None
    bodega_destino_id: Optional[int] = None
    ubicacion_destino_id: Optional[int] = None


class MovimientoCreate(MovimientoBase):
    detalles: List[DetalleMovimientoBase]


class Movimiento(MovimientoBase):
    id: int
    fecha: datetime

    class Config:
        from_attributes = True


class Auditoria(BaseModel):
    id: int
    user_id: int
    table_name: str
    action: str
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class AuditoriaEnriched(BaseModel):
    """Audit row with actor names and a short summary for list views."""

    id: int
    user_id: int
    username: str = ""
    full_name: str = ""
    table_name: str
    action: str
    summary: str
    old_data: Optional[dict] = None
    new_data: Optional[dict] = None
    timestamp: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class AsignacionBase(BaseModel):
    bien_id: int
    persona_id: int
    observaciones: Optional[str] = None


class AsignacionCreate(AsignacionBase):
    pass


class Asignacion(AsignacionBase):
    id: int
    fecha: datetime
    is_active: bool = True
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GerenciaBase(BaseModel):
    nombre: str


class GerenciaCreate(GerenciaBase):
    pass


class Gerencia(GerenciaBase):
    id: int

    class Config:
        from_attributes = True


class UnidadBase(BaseModel):
    nombre: str
    gerencia_id: int


class UnidadCreate(UnidadBase):
    pass


class Unidad(UnidadBase):
    id: int

    class Config:
        from_attributes = True


class PersonaBase(BaseModel):
    nombres: str
    apellidos: str
    identificacion: str
    unidad_id: int


class PersonaCreate(PersonaBase):
    pass


class Persona(PersonaBase):
    id: int

    class Config:
        from_attributes = True


class StockWithDetails(BaseModel):
    id: int
    bien_id: int
    ubicacion_id: int
    cantidad: int
    bien_numero_inventario: str = ""
    bien_modelo: Optional[str] = None
    ubicacion_nombre: str = ""
    bodega_nombre: str = ""

    class Config:
        from_attributes = True


class NameCount(BaseModel):
    """Label + numeric value for charts."""

    name: str
    value: float


class DashboardKPIs(BaseModel):
    total_assets: int
    total_book_value_usd: float
    total_stock_units: int
    warehouses_count: int
    personas_count: int
    active_assignments: int
    movements_total: int
    movements_last_30_days: int
    assets_by_status: Dict[str, int]
    top_categories: List[NameCount]
    stock_by_warehouse: List[NameCount]
    movements_by_type: Dict[str, int]
    movements_by_month: List[NameCount]

