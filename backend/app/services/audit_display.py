"""Human-readable summaries for audit log rows."""

from __future__ import annotations

from typing import Any, Optional

_PERSONA_ID_KEYS = frozenset({"persona_id", "from_persona_id", "to_persona_id"})


def collect_persona_ids_from_audit_payloads(
    payloads: list[tuple[Optional[dict[str, Any]], Optional[dict[str, Any]]]],
) -> set[int]:
    ids: set[int] = set()
    for old_data, new_data in payloads:
        for d in (old_data, new_data):
            if not d or not isinstance(d, dict):
                continue
            for k in _PERSONA_ID_KEYS:
                v = d.get(k)
                if v is None:
                    continue
                try:
                    ids.add(int(v))
                except (TypeError, ValueError):
                    pass
    return ids


def load_persona_labels(db: Any, persona_ids: set[int]) -> dict[int, str]:
    """Map persona id → display name. db: SQLAlchemy Session."""
    if not persona_ids:
        return {}
    from app import models

    rows = (
        db.query(models.Persona)
        .filter(models.Persona.id.in_(persona_ids))
        .all()
    )
    out: dict[int, str] = {}
    for p in rows:
        name = f"{p.nombres or ''} {p.apellidos or ''}".strip()
        out[p.id] = name if name else f"Person #{p.id}"
    return out


def _fmt(v: Any) -> str:
    if v is None:
        return "—"
    if isinstance(v, (dict, list)):
        return str(v)[:120] + ("…" if len(str(v)) > 120 else "")
    return str(v)


def _person_label(
    pid: Any,
    persona_labels: Optional[dict[int, str]],
) -> str:
    if pid is None:
        return "—"
    try:
        i = int(pid)
    except (TypeError, ValueError):
        return str(pid)
    if persona_labels and i in persona_labels:
        return persona_labels[i]
    return f"person #{i}"


def audit_summary(
    table_name: str,
    action: str,
    old_data: Optional[dict[str, Any]],
    new_data: Optional[dict[str, Any]],
    *,
    persona_labels: Optional[dict[int, str]] = None,
) -> str:
    od = old_data or {}
    nd = new_data or {}
    pl = persona_labels

    if table_name == "asignaciones":
        if action == "ASSIGN":
            who = _person_label(nd.get("persona_id"), pl)
            return (
                f"Assigned asset (bien) #{nd.get('bien_id')} to {who} "
                f"(assignment id {nd.get('id')})"
            )
        if action == "RETURN":
            sync = nd.get("was_already_closed")
            extra = " (status sync)" if sync else ""
            who = _person_label(od.get("persona_id"), pl)
            return f"Returned asset #{od.get('bien_id')} from {who}{extra}"

    if table_name == "bienes":
        if action == "CREATE":
            return f"Created asset id {nd.get('id')} — inventory # {_fmt(nd.get('numero_inventario'))}"
        if action == "DELETE":
            return f"Deleted asset id {od.get('id')} — inventory # {_fmt(od.get('numero_inventario'))}"
        if action == "UPDATE":
            inv = nd.get("numero_inventario") or od.get("numero_inventario")
            parts = [f"Updated asset id {nd.get('id') or od.get('id')}"]
            if inv:
                parts.append(f"inventory # {inv}")
            changed = _changed_keys(od, nd, ignore={"id"})
            if changed:
                parts.append(f"fields: {', '.join(sorted(changed)[:12])}")
                if len(changed) > 12:
                    parts.append("…")
            return " — ".join(parts) if len(parts) > 1 else parts[0]
        if action == "RETURN_SYNC":
            return (
                f"Corrected asset #{od.get('bien_id')} status from assigned → {_fmt(nd.get('estado'))} "
                "(no assignment row)"
            )

    if table_name == "movimientos" and action == "CREATE":
        return f"Inventory movement id {nd.get('id')} — type {_fmt(nd.get('tipo'))}"

    if table_name == "users":
        if action == "CREATE":
            return f"Created user @{nd.get('username')} (id {nd.get('id')})"
        if action == "UPDATE":
            return f"Updated user @{nd.get('username') or od.get('username')} (id {nd.get('id')})"

    if table_name == "roles":
        if action == "CREATE":
            return f"Created role “{nd.get('name')}” (id {nd.get('id')})"
        if action == "UPDATE":
            return f"Updated role “{nd.get('name') or od.get('name')}” (id {nd.get('id')})"
        if action == "DELETE":
            return f"Deleted role “{od.get('name')}” (id {od.get('id')})"

    if action == "UPDATE" and od and nd:
        changed = _changed_keys(od, nd)
        if changed:
            return f"{action} on {table_name}: {', '.join(sorted(changed)[:15])}"
    if action == "DELETE" and od:
        return f"{action} on {table_name}: record id {od.get('id', '—')}"
    if action == "CREATE" and nd:
        return f"{action} on {table_name}: id {nd.get('id', '—')}"

    return f"{action} on {table_name}"


def _changed_keys(
    old: dict[str, Any],
    new: dict[str, Any],
    *,
    ignore: Optional[set[str]] = None,
) -> set[str]:
    ignore = ignore or set()
    keys = (set(old) | set(new)) - ignore
    return {k for k in keys if old.get(k) != new.get(k)}
