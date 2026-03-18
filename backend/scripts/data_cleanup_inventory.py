#!/usr/bin/env python3
"""Detect duplicate inventory numbers and multiple active assignments. Run inside backend container:
   python -m scripts.data_cleanup_inventory
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()

    print("=== Duplicate numero_inventario ===")
    rows = db.execute(
        text(
            """
            SELECT numero_inventario, COUNT(*) AS c
            FROM bienes
            GROUP BY numero_inventario
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    for r in rows:
        print(f"  {r[0]}: {r[1]} rows")

    print("=== Assets with multiple active assignments ===")
    rows = db.execute(
        text(
            """
            SELECT bien_id, COUNT(*) AS c
            FROM asignaciones
            WHERE is_active = true
            GROUP BY bien_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    for r in rows:
        print(f"  bien_id={r[0]}: {r[1]} active")

    db.close()


if __name__ == "__main__":
    main()
