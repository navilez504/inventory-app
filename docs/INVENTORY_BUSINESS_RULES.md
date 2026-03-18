# Inventory business rules

## Asset status (`bienes.estado`)

| Value           | Meaning                                      |
|-----------------|----------------------------------------------|
| `AVAILABLE`     | Registered, not in warehouse stock yet      |
| `IN_WAREHOUSE`  | Has positive stock in at least one location |
| `ASSIGNED`      | Active assignment to a person                 |
| `DAMAGED`       | Damaged — no assignment                       |
| `OBSOLETE`      | Written off                                   |

## Assignment rules

1. Only `AVAILABLE` or `IN_WAREHOUSE` assets may be assigned.
2. Asset must have **total stock &gt; 0** across all locations.
3. Only **one active assignment** per asset (`asignaciones.is_active`, partial unique index).
4. To reassign, call **POST `/assignments/return/{bien_id}`** first, then create a new assignment.

## Inventory number

- Globally unique (`uq_bienes_numero_inventario`).
- API and service layer reject duplicates; DB enforces uniqueness.

## Movements

- **ENTRY** movements set status to `IN_WAREHOUSE` when coming from `AVAILABLE`.
- Each entry line creates an `inventory_movements` row (`ENTRY`).

## Migrations

```bash
cd backend && alembic upgrade head
```

## Fix inconsistent data (before / after migrations)

While `bienes.estado` is still the old PostgreSQL enum (`ACTIVO` / `ASIGNADO` / `DADO_DE_BAJA`), the script **only** updates duplicate inventory numbers and (if present) `is_active` assignments — it does **not** write `AVAILABLE` / `ASSIGNED` until Alembic has migrated `estado` to `VARCHAR`.

**Recommended order**

1. Fix duplicate numbers (if any), then migrate:
   ```bash
   PYTHONPATH=/app python scripts/fix_inventory_data.py --apply --duplicates-only
   alembic upgrade head
   ```
2. Normalize estado and assignments:
   ```bash
   PYTHONPATH=/app python scripts/fix_inventory_data.py --apply
   ```

**Dry run:** `python scripts/fix_inventory_data.py`  
**Full apply (after `estado` is varchar):** `python scripts/fix_inventory_data.py --apply`

Report-only (no writes):
```bash
PYTHONPATH=/app python scripts/data_cleanup_inventory.py
```
