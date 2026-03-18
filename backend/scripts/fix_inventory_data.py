#!/usr/bin/env python3
"""
Repair inventory data for Alembic / business rules.

  Dry run (default): print what would change.
  Apply:           python scripts/fix_inventory_data.py --apply

Run inside backend container:
  cd /app && PYTHONPATH=/app python scripts/fix_inventory_data.py --apply

Steps:
  1) Duplicate numero_inventario → rename extras to INV-ORIGINAL-DUP-{id} (truncated to 100 chars)
  2) Multiple active assignments per asset → keep newest row active, end others
  3) Normalize bienes.estado vs active assignments and stock totals
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


def bienes_estado_is_varchar(conn) -> bool:
    """False if still PostgreSQL enum (only ACTIVO/ASIGNADO/DADO_DE_BAJA)."""
    r = conn.execute(
        text(
            """
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'bienes' AND column_name = 'estado'
            """
        )
    ).fetchone()
    if not r:
        return False
    if r[0] == "USER-DEFINED" and r[1] == "bien_estado_enum":
        return False
    return r[0] in ("character varying", "text")


def column_exists(conn, table: str, column: str) -> bool:
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


def fix_duplicates(conn, dry_run: bool) -> int:
    """Return count of rows updated."""
    rows = conn.execute(
        text(
            """
            SELECT numero_inventario, array_agg(id ORDER BY id) AS ids
            FROM bienes
            GROUP BY numero_inventario
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    n = 0
    for num, ids in rows:
        ids = list(ids)
        keep = ids[0]
        for bid in ids[1:]:
            suffix = f"-DUP-{bid}"
            base = (num or "")[: max(0, 100 - len(suffix))]
            new_num = f"{base}{suffix}"[:100]
            print(f"  Duplicate '{num}' id={bid} → numero_inventario='{new_num}'")
            if not dry_run:
                conn.execute(
                    text("UPDATE bienes SET numero_inventario = :n WHERE id = :id"),
                    {"n": new_num, "id": bid},
                )
            n += 1
    return n


def fix_assignments(conn, dry_run: bool) -> int:
    if not column_exists(conn, "asignaciones", "is_active"):
        print("  (skip assignments: column is_active missing — run alembic first)")
        return 0
    sub = """
        SELECT a.id
        FROM asignaciones a
        JOIN (
            SELECT bien_id, MAX(id) AS keep_id
            FROM asignaciones
            WHERE is_active = true
            GROUP BY bien_id
            HAVING COUNT(*) > 1
        ) d ON a.bien_id = d.bien_id AND a.is_active = true AND a.id != d.keep_id
    """
    rows = conn.execute(text(f"SELECT id FROM ({sub}) t")).fetchall()
    ids = [r[0] for r in rows]
    for aid in ids:
        print(f"  End duplicate active assignment id={aid}")
    if not dry_run and ids:
        for aid in ids:
            conn.execute(
                text(
                    """
                    UPDATE asignaciones
                    SET is_active = false, ended_at = :ts
                    WHERE id = :id
                    """
                ),
                {"id": aid, "ts": datetime.utcnow()},
            )
    return len(ids)


def normalize_estado(conn, dry_run: bool) -> int:
    """Align estado with active assignment and stock."""
    if not column_exists(conn, "asignaciones", "is_active"):
        return 0
    changes = 0
    # ASSIGNED where there is an active assignment
    r = conn.execute(
        text(
            """
            SELECT b.id FROM bienes b
            WHERE EXISTS (
                SELECT 1 FROM asignaciones a
                WHERE a.bien_id = b.id AND a.is_active = true
            )
            AND (b.estado IS DISTINCT FROM 'ASSIGNED')
            AND b.estado NOT IN ('OBSOLETE', 'DAMAGED')
            """
        )
    ).fetchall()
    for row in r:
        print(f"  bien id={row[0]} → estado ASSIGNED (has active assignment)")
        changes += 1
        if not dry_run:
            conn.execute(
                text("UPDATE bienes SET estado = 'ASSIGNED' WHERE id = :id"),
                {"id": row[0]},
            )
    # IN_WAREHOUSE: stock > 0, not assigned, not obsolete/damaged
    r2 = conn.execute(
        text(
            """
            SELECT b.id FROM bienes b
            WHERE NOT EXISTS (
                SELECT 1 FROM asignaciones a
                WHERE a.bien_id = b.id AND a.is_active = true
            )
            AND b.estado NOT IN ('OBSOLETE', 'DAMAGED', 'AVAILABLE')
            AND COALESCE((
                SELECT SUM(s.cantidad) FROM stock s WHERE s.bien_id = b.id
            ), 0) > 0
            """
        )
    ).fetchall()
    for row in r2:
        if row[0] in {x[0] for x in r}:
            continue
        print(f"  bien id={row[0]} → estado IN_WAREHOUSE (has stock, not assigned)")
        changes += 1
        if not dry_run:
            conn.execute(
                text("UPDATE bienes SET estado = 'IN_WAREHOUSE' WHERE id = :id"),
                {"id": row[0]},
            )
    # AVAILABLE: no assignment, no stock
    r3 = conn.execute(
        text(
            """
            SELECT b.id FROM bienes b
            WHERE NOT EXISTS (
                SELECT 1 FROM asignaciones a
                WHERE a.bien_id = b.id AND a.is_active = true
            )
            AND b.estado NOT IN ('OBSOLETE', 'DAMAGED')
            AND COALESCE((
                SELECT SUM(s.cantidad) FROM stock s WHERE s.bien_id = b.id
            ), 0) <= 0
            AND b.estado IN ('IN_WAREHOUSE', 'ASSIGNED', 'ACTIVO', 'ASIGNADO')
            """
        )
    ).fetchall()
    for row in r3:
        print(f"  bien id={row[0]} → estado AVAILABLE")
        changes += 1
        if not dry_run:
            conn.execute(
                text("UPDATE bienes SET estado = 'AVAILABLE' WHERE id = :id"),
                {"id": row[0]},
            )
    return changes


def map_legacy_estado(conn, dry_run: bool) -> int:
    """Map legacy strings that are unambiguous (not ASIGNADO — handled in normalize)."""
    n = 0
    for old, new in [("ACTIVO", "AVAILABLE"), ("DADO_DE_BAJA", "OBSOLETE")]:
        r = conn.execute(
            text("SELECT id FROM bienes WHERE estado = :o"), {"o": old}
        ).fetchall()
        for row in r:
            print(f"  bien id={row[0]} estado {old!r} → {new}")
            n += 1
            if not dry_run:
                conn.execute(
                    text("UPDATE bienes SET estado = :n WHERE id = :id"),
                    {"n": new, "id": row[0]},
                )
    return n


def fix_legacy_asignado(conn, dry_run: bool) -> int:
    """ASIGNADO → ASSIGNED / IN_WAREHOUSE / AVAILABLE based on assignment + stock."""
    if not column_exists(conn, "asignaciones", "is_active"):
        return 0
    n = 0
    r = conn.execute(text("SELECT id FROM bienes WHERE estado = 'ASIGNADO'")).fetchall()
    for (bid,) in r:
        has_active = conn.execute(
            text(
                "SELECT 1 FROM asignaciones WHERE bien_id = :b AND is_active = true LIMIT 1"
            ),
            {"b": bid},
        ).fetchone()
        stock = conn.execute(
            text(
                "SELECT COALESCE(SUM(cantidad),0) FROM stock WHERE bien_id = :b"
            ),
            {"b": bid},
        ).scalar()
        stock = int(stock or 0)
        if has_active:
            new_st = "ASSIGNED"
        elif stock > 0:
            new_st = "IN_WAREHOUSE"
        else:
            new_st = "AVAILABLE"
        print(f"  bien id={bid} ASIGNADO → {new_st}")
        n += 1
        if not dry_run:
            conn.execute(
                text("UPDATE bienes SET estado = :s WHERE id = :id"),
                {"s": new_st, "id": bid},
            )
    return n


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="Write changes (default is dry-run)")
    p.add_argument(
        "--duplicates-only",
        action="store_true",
        help="Only fix duplicate inventory numbers (safe before Alembic estado migration)",
    )
    args = p.parse_args()
    dry_run = not args.apply

    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    conn = db.connection()

    print("=== Fix duplicate numero_inventario ===")
    n1 = fix_duplicates(conn, dry_run)

    if args.duplicates_only:
        if not dry_run:
            db.commit()
            print("Committed (duplicates only).")
        else:
            db.rollback()
            print(f"Dry-run: {n1} duplicate(s). Use --apply --duplicates-only to apply.")
        db.close()
        return

    print("=== Fix multiple active assignments ===")
    n2 = fix_assignments(conn, dry_run)

    if not bienes_estado_is_varchar(conn):
        print(
            "\n*** bienes.estado is still PostgreSQL enum (ACTIVO/ASIGNADO/DADO_DE_BAJA). ***"
            "\n    Skipping estado remapping (AVAILABLE/ASSIGNED/… not valid until migration)."
            "\n    Next:  alembic upgrade head"
            "\n    Then:  python scripts/fix_inventory_data.py --apply"
        )
        n3 = n3b = n4 = 0
    else:
        print("=== Map legacy ACTIVO / DADO_DE_BAJA ===")
        n3 = map_legacy_estado(conn, dry_run)

        print("=== Fix legacy ASIGNADO ===")
        n3b = fix_legacy_asignado(conn, dry_run)

        print("=== Normalize estado (assignment / stock) ===")
        n4 = normalize_estado(conn, dry_run)

    if not dry_run:
        db.commit()
        print("Committed.")
    else:
        db.rollback()
        print(
            f"Dry-run summary: {n1} duplicates, {n2} assignment rows, "
            f"{n3}+{n3b} legacy, {n4} normalize. Use --apply to execute."
        )
    db.close()


if __name__ == "__main__":
    main()
