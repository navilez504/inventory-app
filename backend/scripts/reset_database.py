#!/usr/bin/env python3
"""Wipe the PostgreSQL public schema and re-apply Alembic migrations (empty DB).

Run inside the backend container from /app:

  CONFIRM_RESET=1 python -m scripts.reset_database
  python -m scripts.reset_database --yes

Or from host (DATABASE_URL must point at your DB):

  cd backend && CONFIRM_RESET=1 python -m scripts.reset_database

Alternative (Docker): remove the volume entirely — see docs/DATABASE_RESET.md
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text

from app.core.config import get_settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Drop public schema and run alembic upgrade head")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip CONFIRM_RESET=1 requirement",
    )
    parser.add_argument(
        "--no-migrate",
        action="store_true",
        help="Only wipe schema; do not run alembic (you must run upgrade head yourself)",
    )
    args = parser.parse_args()

    if not args.yes and os.environ.get("CONFIRM_RESET") != "1":
        print(
            "This destroys ALL data in the database public schema.\n"
            "Run with: CONFIRM_RESET=1 python -m scripts.reset_database\n"
            "     or: python -m scripts.reset_database --yes",
            file=sys.stderr,
        )
        sys.exit(1)

    settings = get_settings()
    url = settings.DATABASE_URL
    engine = create_engine(url)
    parsed = urlparse(url)
    user = parsed.username

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        if user and re.match(r"^[a-zA-Z0-9_]+$", user):
            conn.execute(text(f'GRANT ALL ON SCHEMA public TO "{user}"'))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))

    print("Public schema reset.")

    if args.no_migrate:
        print("Skipped migrations. Run: alembic upgrade head")
        return

    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env = {**os.environ}
    r = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=backend_root,
        env=env,
    )
    if r.returncode != 0:
        sys.exit(r.returncode)
    print("Migrations applied (alembic upgrade head).")
    print("Optional: seed admin — see app.utils.seed or your startup hooks.")


if __name__ == "__main__":
    main()
