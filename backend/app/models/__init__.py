from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    roles = relationship("Role", secondary="user_roles", back_populates="users")
    sessions = relationship("Session", back_populates="user")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    users = relationship("User", secondary="user_roles", back_populates="roles")
    permissions = relationship(
        "Permission", secondary="role_permissions", back_populates="roles"
    )


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    roles = relationship(
        "Role", secondary="role_permissions", back_populates="permissions"
    )


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id"), primary_key=True)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")


class Gerencia(Base):
    __tablename__ = "gerencias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, unique=True)

    unidades = relationship("Unidad", back_populates="gerencia")


class Unidad(Base):
    __tablename__ = "unidades"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    gerencia_id = Column(Integer, ForeignKey("gerencias.id"), nullable=False)

    gerencia = relationship("Gerencia", back_populates="unidades")
    personas = relationship("Persona", back_populates="unidad")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, index=True)
    nombres = Column(String(150), nullable=False)
    apellidos = Column(String(150), nullable=False)
    identificacion = Column(String(50), unique=True, nullable=False)
    unidad_id = Column(Integer, ForeignKey("unidades.id"), nullable=False)

    unidad = relationship("Unidad", back_populates="personas")
    asignaciones = relationship("Asignacion", back_populates="persona")


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)

    bienes = relationship("Bien", back_populates="categoria")


class Marca(Base):
    __tablename__ = "marcas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)

    bienes = relationship("Bien", back_populates="marca")


class Proveedor(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    contacto = Column(String(150), nullable=True)
    telefono = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    direccion = Column(Text, nullable=True)

    bienes = relationship("Bien", back_populates="proveedor")


class Bodega(Base):
    __tablename__ = "bodegas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)

    ubicaciones = relationship("Ubicacion", back_populates="bodega")


class Ubicacion(Base):
    __tablename__ = "ubicaciones"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    bodega_id = Column(Integer, ForeignKey("bodegas.id"), nullable=False)

    bodega = relationship("Bodega", back_populates="ubicaciones")
    stocks = relationship("Stock", back_populates="ubicacion")


class AssetStatus:
    """Asset lifecycle — enforced in services and DB."""

    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    IN_WAREHOUSE = "IN_WAREHOUSE"
    DAMAGED = "DAMAGED"
    OBSOLETE = "OBSOLETE"


# Legacy enum values mapped in migration to string statuses above
class BienEstadoEnum(str):
    ACTIVO = "ACTIVO"
    ASIGNADO = "ASIGNADO"
    DADO_DE_BAJA = "DADO_DE_BAJA"


class Bien(Base):
    __tablename__ = "bienes"

    id = Column(Integer, primary_key=True, index=True)
    numero_inventario = Column(String(100), unique=True, nullable=False, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    marca_id = Column(Integer, ForeignKey("marcas.id"), nullable=False)
    modelo = Column(String(150), nullable=True)
    serie = Column(String(150), nullable=True)
    precio = Column(Numeric(12, 2), nullable=False)
    fecha_adquisicion = Column(Date, nullable=False, default=date.today)
    proveedor_id = Column(Integer, ForeignKey("proveedores.id"), nullable=True)
    estado = Column(
        String(32),
        default=AssetStatus.AVAILABLE,
        nullable=False,
        index=True,
    )
    observaciones = Column(Text, nullable=True)

    categoria = relationship("Categoria", back_populates="bienes")
    marca = relationship("Marca", back_populates="bienes")
    proveedor = relationship("Proveedor", back_populates="bienes")
    stocks = relationship("Stock", back_populates="bien")
    asignaciones = relationship("Asignacion", back_populates="bien")


class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, index=True)
    bien_id = Column(Integer, ForeignKey("bienes.id"), nullable=False, index=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=False, index=True)
    cantidad = Column(Integer, nullable=False, default=0)

    bien = relationship("Bien", back_populates="stocks")
    ubicacion = relationship("Ubicacion", back_populates="stocks")


class MovimientoTipoEnum(str):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"
    TRANSFERENCIA = "TRANSFERENCIA"
    AJUSTE = "AJUSTE"


class Movimiento(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(
        Enum(
            MovimientoTipoEnum.ENTRADA,
            MovimientoTipoEnum.SALIDA,
            MovimientoTipoEnum.TRANSFERENCIA,
            MovimientoTipoEnum.AJUSTE,
            name="movimiento_tipo_enum",
        ),
        nullable=False,
    )
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    detalles = relationship("DetalleMovimiento", back_populates="movimiento")


class DetalleMovimiento(Base):
    __tablename__ = "detalle_movimientos"

    id = Column(Integer, primary_key=True, index=True)
    movimiento_id = Column(Integer, ForeignKey("movimientos.id"), nullable=False)
    bien_id = Column(Integer, ForeignKey("bienes.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    bodega_origen_id = Column(Integer, ForeignKey("bodegas.id"), nullable=True)
    ubicacion_origen_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    bodega_destino_id = Column(Integer, ForeignKey("bodegas.id"), nullable=True)
    ubicacion_destino_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)

    movimiento = relationship("Movimiento", back_populates="detalles")


class Asignacion(Base):
    __tablename__ = "asignaciones"

    id = Column(Integer, primary_key=True, index=True)
    bien_id = Column(Integer, ForeignKey("bienes.id"), nullable=False, index=True)
    persona_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    ended_at = Column(DateTime, nullable=True)

    bien = relationship("Bien", back_populates="asignaciones")
    persona = relationship("Persona", back_populates="asignaciones")


class InventoryMovementType:
    ENTRY = "ENTRY"
    ASSIGNMENT = "ASSIGNMENT"
    TRANSFER = "TRANSFER"
    RETURN = "RETURN"
    DISPOSAL = "DISPOSAL"
    DAMAGE = "DAMAGE"


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("bienes.id"), nullable=False, index=True)
    movement_type = Column(String(32), nullable=False, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    from_persona_id = Column(Integer, ForeignKey("personas.id"), nullable=True)
    to_persona_id = Column(Integer, ForeignKey("personas.id"), nullable=True)
    from_warehouse_id = Column(Integer, ForeignKey("bodegas.id"), nullable=True)
    to_warehouse_id = Column(Integer, ForeignKey("bodegas.id"), nullable=True)
    movement_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    reference = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    asset = relationship("Bien")
    created_by = relationship("User", foreign_keys=[created_by_id])


class Reasignacion(Base):
    __tablename__ = "reasignaciones"

    id = Column(Integer, primary_key=True, index=True)
    bien_id = Column(Integer, ForeignKey("bienes.id"), nullable=False)
    persona_origen_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    persona_destino_id = Column(Integer, ForeignKey("personas.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    observaciones = Column(Text, nullable=True)


class Descargo(Base):
    __tablename__ = "descargos"

    id = Column(Integer, primary_key=True, index=True)
    bien_id = Column(Integer, ForeignKey("bienes.id"), nullable=False)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    motivo = Column(Text, nullable=True)


class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    table_name = Column(String(100), nullable=False)
    action = Column(String(50), nullable=False)
    old_data = Column(JSONB, nullable=True)
    new_data = Column(JSONB, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True)

