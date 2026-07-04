from __future__ import annotations

import sqlite3

from backend.db import query_all
from backend.security import get_permission_codes, has_permission
from backend.modules.resources.contracts import (
    get_contract_lots,
    get_contracts,
    get_lot_supplier_awards,
    get_lot_supplier_prices,
    get_suppliers,
)
from backend.modules.resources.hr import get_organizations, get_persons

def user_context(conn: sqlite3.Connection, user_id: int) -> dict:
    user = conn.execute(
        """
        SELECT users.id, users.username, users.person_id, users.name, users.role,
               users.org_id, users.status, users.email, users.effective_from, users.effective_to,
               persons.real_name, persons.employee_no, persons.position,
               organizations.name AS org_name,
               roles.name AS role_name, roles.data_scope AS role_data_scope
        FROM users
        LEFT JOIN persons ON persons.id = users.person_id
        LEFT JOIN organizations ON organizations.id = users.org_id
        LEFT JOIN roles ON roles.code = users.role
        WHERE users.id = ?
        """,
        (user_id,),
    ).fetchone()
    if not user:
        raise ValueError("Unknown user")
    user["permission_codes"] = get_permission_codes(conn, user["role"])
    return user

def get_users(conn: sqlite3.Connection) -> list[dict]:
    users = query_all(
        conn,
        """
        SELECT users.id, users.username, users.person_id, persons.real_name, persons.employee_no,
               persons.position, users.name, users.role, roles.name AS role_name,
               users.org_id, organizations.name AS org_name,
               users.status, users.email, users.effective_from, users.effective_to,
               roles.data_scope AS role_data_scope
        FROM users
        LEFT JOIN persons ON persons.id = users.person_id
        LEFT JOIN organizations ON organizations.id = users.org_id
        LEFT JOIN roles ON roles.code = users.role
        ORDER BY users.id
        """,
    )
    for user in users:
        user["permission_codes"] = get_permission_codes(conn, user["role"])
    return users

def get_roles(conn: sqlite3.Connection) -> list[dict]:
    roles = query_all(conn, "SELECT * FROM roles ORDER BY rowid")
    permission_rows = query_all(
        conn,
        """
        SELECT rp.role_code, p.code, p.module, p.name, p.description
        FROM role_permissions rp
        JOIN permissions p ON p.code = rp.permission_code
        ORDER BY p.module, p.code
        """,
    )
    by_role: dict[str, list[dict]] = {}
    for row in permission_rows:
        by_role.setdefault(row["role_code"], []).append(
            {"code": row["code"], "module": row["module"], "name": row["name"], "description": row["description"]}
        )
    for role in roles:
        role["permissions"] = by_role.get(role["code"], [])
        role["permission_codes"] = [permission["code"] for permission in role["permissions"]]
    return roles

def get_permissions(conn: sqlite3.Connection) -> list[dict]:
    return query_all(conn, "SELECT * FROM permissions ORDER BY module, code")

def get_data_scopes(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT ds.*, users.name AS user_name, organizations.name AS scope_name
        FROM data_scopes ds
        JOIN users ON users.id = ds.user_id
        LEFT JOIN organizations ON organizations.id = ds.scope_id AND ds.scope_type = 'org'
        ORDER BY users.id
        """,
    )

def get_governance(conn: sqlite3.Connection, user: dict) -> dict:
    data = {
        "users": [],
        "persons": [],
        "suppliers": [],
        "contracts": [],
        "contractLots": [],
        "lotSupplierAwards": [],
        "lotSupplierPrices": [],
        "organizations": [],
        "roles": [],
        "permissions": [],
        "dataScopes": [],
    }
    if has_permission(user, "system.users"):
        data["users"] = get_users(conn)
        data["persons"] = get_persons(conn)
        data["organizations"] = get_organizations(conn)
        data["roles"] = get_roles(conn)
    if has_permission(user, "system.persons"):
        data["persons"] = get_persons(conn)
        data["suppliers"] = get_suppliers(conn)
        data["organizations"] = get_organizations(conn)
        data["contracts"] = get_contracts(conn)
        data["contractLots"] = get_contract_lots(conn)
        data["lotSupplierAwards"] = get_lot_supplier_awards(conn)
        data["lotSupplierPrices"] = get_lot_supplier_prices(conn)
    if has_permission(user, "system.suppliers"):
        data["suppliers"] = get_suppliers(conn)
    if has_permission(user, "system.contracts"):
        data["suppliers"] = get_suppliers(conn)
        data["contracts"] = get_contracts(conn)
        data["contractLots"] = get_contract_lots(conn)
        data["lotSupplierAwards"] = get_lot_supplier_awards(conn)
        data["lotSupplierPrices"] = get_lot_supplier_prices(conn)
    if has_permission(user, "system.orgs"):
        data["users"] = get_users(conn)
        data["persons"] = get_persons(conn)
        data["organizations"] = get_organizations(conn)
    if has_permission(user, "system.permissions"):
        data["roles"] = get_roles(conn)
        data["permissions"] = get_permissions(conn)
        data["dataScopes"] = get_data_scopes(conn)
    return data

def has_system_access(user: dict) -> bool:
    return any(
        has_permission(user, permission_code)
        for permission_code in {"system.control", "system.users", "system.persons", "system.suppliers", "system.contracts", "system.orgs", "system.permissions"}
    )

def login_user(conn: sqlite3.Connection, payload: dict) -> dict:
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username:
        raise ValueError("请输入用户名")
    user = conn.execute(
        """
        SELECT users.id, users.status
        FROM users
        WHERE lower(users.username) = lower(?)
          AND users.password = ?
        """,
        [username, password],
    ).fetchone()
    if not user:
        raise ValueError("用户名或密码不正确")
    if user["status"] != "启用":
        raise ValueError("该账号已停用")
    return user_context(conn, user["id"])

def get_control_panel(conn: sqlite3.Connection) -> dict:
    users = get_users(conn)
    persons = get_persons(conn)
    organizations = get_organizations(conn)
    roles = get_roles(conn)
    permissions = get_permissions(conn)
    data_scopes = get_data_scopes(conn)
    linked_person_ids = {user["person_id"] for user in users if user.get("person_id")}
    return {
        "cards": [
            {"label": "账号数", "value": len(users), "unit": "个"},
            {"label": "人员数", "value": len(persons), "unit": "人"},
            {"label": "组织数", "value": len(organizations), "unit": "个"},
            {"label": "角色数", "value": len(roles), "unit": "个"},
            {"label": "权限点", "value": len(permissions), "unit": "个"},
            {"label": "数据范围", "value": len(data_scopes), "unit": "条"},
        ],
        "warnings": [
            {"label": "未关联人员账号", "value": sum(1 for user in users if not user.get("person_id"))},
            {"label": "无登录账号人员", "value": sum(1 for person in persons if person["id"] not in linked_person_ids)},
            {"label": "停用账号", "value": sum(1 for user in users if user["status"] != "启用")},
            {"label": "停用组织", "value": sum(1 for org in organizations if org["status"] != "启用")},
        ],
        "recentUsers": users[-6:],
        "organizations": organizations[:8],
        "roles": roles,
    }

def refresh_user_scope(conn: sqlite3.Connection, user_id: int) -> None:
    user = conn.execute(
        """
        SELECT users.*, roles.data_scope AS role_data_scope
        FROM users
        LEFT JOIN roles ON roles.code = users.role
        WHERE users.id = ?
        """,
        [user_id],
    ).fetchone()
    if not user:
        return
    conn.execute("DELETE FROM data_scopes WHERE user_id = ?", [user_id])
    scope_type, scope_id, level = default_scope_for_user(user)
    conn.execute(
        """
        INSERT INTO data_scopes (user_id, scope_type, scope_id, permission_level)
        VALUES (?, ?, ?, ?)
        """,
        [user_id, scope_type, scope_id, level],
    )

def default_scope_for_user(user: dict) -> tuple[str, int | None, str]:
    data_scope = user.get("role_data_scope") or ""
    if data_scope == "全部数据":
        return "all", None, "manage"
    if data_scope == "本业务组":
        return "org", user["org_id"], "manage"
    if data_scope == "本人商机":
        return "own_opportunity", user["id"], "edit"
    if data_scope == "本人项目":
        return "own_project", user["id"], "edit"
    return "system", None, "manage"

def create_user(conn: sqlite3.Connection, payload: dict) -> dict:
    person_id = payload.get("person_id")
    if person_id == "":
        person_id = None
    person = conn.execute("SELECT * FROM persons WHERE id = ?", [person_id]).fetchone() if person_id else None
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO users (username, password, person_id, name, role, org_id, status, email, effective_from, effective_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("username") or f"user{int(next_id):03d}",
            payload.get("password") or "123456",
            person_id,
            payload.get("name") or (person["real_name"] if person else "新用户"),
            payload.get("role", "project_manager"),
            payload.get("org_id") or (person["org_id"] if person else None),
            payload.get("status", "启用"),
            payload.get("email") or (person["email"] if person else ""),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
        ],
    )
    refresh_user_scope(conn, cursor.lastrowid)
    conn.commit()
    return conn.execute("SELECT * FROM users WHERE id = ?", [cursor.lastrowid]).fetchone()
