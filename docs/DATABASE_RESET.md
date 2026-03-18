# Clean / reset the database

## 1. Wipe schema + re-run migrations (keeps Docker volume)

**All application data is deleted.** Schema is recreated from Alembic.

From the **backend container** (`docker exec -it inventory_backend bash` or one-off run):

```bash
cd /app
python -m scripts.reset_database --yes
```

Or with explicit confirmation:

```bash
CONFIRM_RESET=1 python -m scripts.reset_database
```

Local backend (with `DATABASE_URL` set):

```bash
cd backend
python -m scripts.reset_database --yes
```

After reset, create an admin user if your app uses seeding (e.g. run your seed script or first-time setup).

---

## 2. Remove PostgreSQL data volume (full disk wipe)

Stops containers and **deletes** the named volume `postgres_data` (fresh empty cluster on next `up`).

```bash
docker compose down -v
docker compose up -d postgres
# wait until healthy, then:
docker compose run --rm backend alembic upgrade head
```

---

## 3. Data cleanup only (keep schema, fix bad rows)

Report duplicates / inconsistent assignments (no destructive changes by default):

```bash
docker exec -it inventory_backend python -m scripts.data_cleanup_inventory
```

See `INVENTORY_BUSINESS_RULES.md` for `fix_inventory_data.py` when fixing data after migrations.
