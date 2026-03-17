import logging

from sqlalchemy.orm import Session

from app import models
from app.core.security import hash_password


logger = logging.getLogger("inventory")


DEFAULT_PERMISSIONS: dict[str, str] = {
    "users:view": "View users",
    "users:create": "Create users",
    "users:update": "Update users",
    "roles:view": "View roles and permissions",
    "roles:manage": "Manage roles and permissions",
    "org:view": "View organizational structure",
    "org:manage": "Manage organizational structure",
    "assets:view": "View assets",
    "assets:create": "Create assets",
    "assets:update": "Update assets",
    "assets:delete": "Delete assets",
    "warehouses:view": "View warehouses and locations",
    "warehouses:create": "Create warehouses and locations",
    "warehouses:update": "Update warehouses and locations",
    "movements:view": "View inventory movements",
    "movements:create": "Create inventory movements",
    "audit:view": "View audit logs",
}


DEFAULT_ROLES: dict[str, dict] = {
    "Admin": {
        "description": "System administrator with full access",
        "permissions": list(DEFAULT_PERMISSIONS.keys()),
    },
    "InventoryManager": {
        "description": "Manages assets, stock, and movements",
        "permissions": [
            "assets:view",
            "assets:create",
            "assets:update",
            "assets:delete",
            "warehouses:view",
            "warehouses:create",
            "warehouses:update",
            "movements:view",
            "movements:create",
            "org:view",
        ],
    },
    "Auditor": {
        "description": "Read-only access to audit logs and reports",
        "permissions": [
            "audit:view",
            "assets:view",
            "warehouses:view",
            "movements:view",
            "org:view",
            "users:view",
        ],
    },
}


def seed_permissions(db: Session) -> dict[str, models.Permission]:
    existing = {
        p.code: p for p in db.query(models.Permission).filter(models.Permission.code.in_(DEFAULT_PERMISSIONS.keys())).all()
    }
    for code, description in DEFAULT_PERMISSIONS.items():
        if code not in existing:
            perm = models.Permission(code=code, description=description)
            db.add(perm)
            existing[code] = perm
    db.commit()
    return existing


def seed_roles(db: Session, permissions_by_code: dict[str, models.Permission]) -> dict[str, models.Role]:
    roles_by_name: dict[str, models.Role] = {
        r.name: r for r in db.query(models.Role).filter(models.Role.name.in_(DEFAULT_ROLES.keys())).all()
    }

    for role_name, data in DEFAULT_ROLES.items():
        role = roles_by_name.get(role_name)
        if not role:
            role = models.Role(name=role_name, description=data.get("description"))
            db.add(role)
            db.flush()
            roles_by_name[role_name] = role

        # Ensure permission set matches desired (idempotent)
        desired_codes = set(data.get("permissions", []))
        desired_perms = [permissions_by_code[c] for c in desired_codes if c in permissions_by_code]
        role.permissions = desired_perms

    db.commit()
    return roles_by_name


def seed_admin_user(db: Session, admin_role: models.Role) -> models.User:
    username = "admin"
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        user = models.User(
            username="admin",
            full_name="Administrator",
            email="admin@example.com",
            hashed_password=hash_password("Admin123"),
            is_active=True,
            is_superuser=True,
        )
        user.roles = [admin_role]
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("Seeded initial admin user")
        return user

    # If user exists, ensure it’s active, superuser, has Admin role, and known password
    changed = False
    if not user.is_active:
        user.is_active = True
        changed = True
    if not user.is_superuser:
        user.is_superuser = True
        changed = True
    if admin_role not in user.roles:
        user.roles.append(admin_role)
        changed = True

    # Always reset admin password to the known seed value to avoid hash mismatch
    user.hashed_password = hash_password("Admin123")
    changed = True

    if changed:
        db.commit()
        db.refresh(user)
        logger.info("Updated existing admin user to ensure admin access")
    return user


def seed_initial_data(db: Session) -> None:
    permissions_by_code = seed_permissions(db)
    roles_by_name = seed_roles(db, permissions_by_code)
    seed_admin_user(db, roles_by_name["Admin"])
    logger.info("Seeding completed")

