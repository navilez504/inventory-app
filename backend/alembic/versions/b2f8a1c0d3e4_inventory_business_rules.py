"""Inventory business rules: status string, assignments is_active, movements, constraints.

Revision ID: b2f8a1c0d3e4
Revises: ad8668e3fb40

Idempotent: safe to re-run after a partial failure (e.g. inventory_movements already exists).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "b2f8a1c0d3e4"
down_revision = "ad8668e3fb40"
branch_labels = None
depends_on = None


def _has_column(conn, table: str, column: str) -> bool:
    r = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = :t AND column_name = :c
            """
        ),
        {"t": table, "c": column},
    ).fetchone()
    return r is not None


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(
        text(
            """
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = :t
            """
        ),
        {"t": table},
    ).fetchone()
    return r is not None


def _bienes_estado_is_varchar(conn) -> bool:
    r = conn.execute(
        text(
            """
            SELECT data_type, udt_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'bienes' AND column_name = 'estado'
            """
        )
    ).fetchone()
    if not r:
        return False
    if r[0] == "USER-DEFINED" and r[1] == "bien_estado_enum":
        return False
    return r[0] in ("character varying", "text")


def upgrade() -> None:
    conn = op.get_bind()

    if not _has_column(conn, "asignaciones", "is_active"):
        op.add_column(
            "asignaciones",
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        )
    if not _has_column(conn, "asignaciones", "ended_at"):
        op.add_column("asignaciones", sa.Column("ended_at", sa.DateTime(), nullable=True))

    if _has_column(conn, "asignaciones", "is_active"):
        conn.execute(
            text(
                """
                UPDATE asignaciones a
                SET is_active = false, ended_at = COALESCE(ended_at, NOW())
                FROM (
                    SELECT bien_id, MAX(id) AS keep_id
                    FROM asignaciones
                    GROUP BY bien_id
                    HAVING COUNT(*) > 1
                ) d
                WHERE a.bien_id = d.bien_id AND a.id != d.keep_id
                AND a.is_active = true;
                """
            )
        )

    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_asignacion_one_active_bien
        ON asignaciones (bien_id) WHERE is_active = true;
        """
    )

    if not _table_exists(conn, "inventory_movements"):
        op.create_table(
            "inventory_movements",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("asset_id", sa.Integer(), sa.ForeignKey("bienes.id"), nullable=False),
            sa.Column("movement_type", sa.String(32), nullable=False),
            sa.Column("from_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column(
                "from_persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=True
            ),
            sa.Column(
                "to_persona_id", sa.Integer(), sa.ForeignKey("personas.id"), nullable=True
            ),
            sa.Column(
                "from_warehouse_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=True
            ),
            sa.Column(
                "to_warehouse_id", sa.Integer(), sa.ForeignKey("bodegas.id"), nullable=True
            ),
            sa.Column(
                "movement_date",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("NOW()"),
            ),
            sa.Column("reference", sa.String(150), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_inv_mov_asset ON inventory_movements (asset_id);"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_inv_mov_date ON inventory_movements (movement_date);"
    )

    if _bienes_estado_is_varchar(conn):
        pass
    elif _has_column(conn, "bienes", "estado_new") and not _has_column(
        conn, "bienes", "estado"
    ):
        op.execute("ALTER TABLE bienes RENAME COLUMN estado_new TO estado")
        op.execute("UPDATE bienes SET estado = 'AVAILABLE' WHERE estado IS NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET NOT NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET DEFAULT 'AVAILABLE'")
    elif _has_column(conn, "bienes", "estado_new") and _has_column(
        conn, "bienes", "estado"
    ):
        conn.execute(
            text(
                """
                UPDATE bienes SET estado_new = CASE estado::text
                    WHEN 'ACTIVO' THEN 'AVAILABLE'
                    WHEN 'ASIGNADO' THEN 'ASSIGNED'
                    WHEN 'DADO_DE_BAJA' THEN 'OBSOLETE'
                    ELSE 'AVAILABLE' END
                WHERE estado_new IS NULL
                """
            )
        )
        op.drop_column("bienes", "estado")
        op.execute("ALTER TABLE bienes RENAME COLUMN estado_new TO estado")
        op.execute("UPDATE bienes SET estado = 'AVAILABLE' WHERE estado IS NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET NOT NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET DEFAULT 'AVAILABLE'")
    else:
        op.add_column("bienes", sa.Column("estado_new", sa.String(32), nullable=True))
        conn.execute(
            text(
                """
                UPDATE bienes SET estado_new = CASE estado::text
                    WHEN 'ACTIVO' THEN 'AVAILABLE'
                    WHEN 'ASIGNADO' THEN 'ASSIGNED'
                    WHEN 'DADO_DE_BAJA' THEN 'OBSOLETE'
                    ELSE 'AVAILABLE' END
                """
            )
        )
        op.drop_column("bienes", "estado")
        op.execute("ALTER TABLE bienes RENAME COLUMN estado_new TO estado")
        op.execute("UPDATE bienes SET estado = 'AVAILABLE' WHERE estado IS NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET NOT NULL")
        op.execute("ALTER TABLE bienes ALTER COLUMN estado SET DEFAULT 'AVAILABLE'")

    op.execute(
        """
        DO $$ BEGIN
            ALTER TABLE bienes ADD CONSTRAINT uq_bienes_numero_inventario
            UNIQUE (numero_inventario);
        EXCEPTION
            WHEN duplicate_table THEN NULL;
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE bienes DROP CONSTRAINT IF EXISTS uq_bienes_numero_inventario;"
    )
    op.add_column("bienes", sa.Column("estado_enum", sa.String(32), nullable=True))
    op.execute(
        """
        UPDATE bienes SET estado_enum = CASE estado
            WHEN 'AVAILABLE' THEN 'ACTIVO'
            WHEN 'IN_WAREHOUSE' THEN 'ACTIVO'
            WHEN 'ASSIGNED' THEN 'ASIGNADO'
            WHEN 'OBSOLETE' THEN 'DADO_DE_BAJA'
            WHEN 'DAMAGED' THEN 'DADO_DE_BAJA'
            ELSE 'ACTIVO' END
        """
    )
    op.drop_column("bienes", "estado")
    op.execute("ALTER TABLE bienes RENAME COLUMN estado_enum TO estado")
    op.drop_table("inventory_movements")
    op.execute("DROP INDEX IF EXISTS uq_asignacion_one_active_bien;")
    op.drop_column("asignaciones", "ended_at")
    op.drop_column("asignaciones", "is_active")
