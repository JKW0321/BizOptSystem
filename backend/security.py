from __future__ import annotations

import sqlite3


def get_permission_codes(conn: sqlite3.Connection, role_code: str) -> list[str]:
    rows = conn.execute(
        "SELECT permission_code FROM role_permissions WHERE role_code = ? ORDER BY permission_code",
        [role_code],
    ).fetchall()
    return [row["permission_code"] for row in rows]


def has_permission(user: dict, permission_code: str) -> bool:
    return permission_code in set(user.get("permission_codes", []))


def scope_kind(user: dict) -> str:
    data_scope = user.get("role_data_scope") or ""
    if data_scope == "全部数据":
        return "all"
    if data_scope == "本业务组":
        return "org"
    if data_scope == "本人商机":
        return "own_opportunity"
    if data_scope == "本人项目":
        return "own_project"
    return "system"


def scoped_clause(alias: str, user: dict, object_type: str = "project") -> tuple[str, list]:
    scope = scope_kind(user)
    if scope == "all":
        return "1=1", []
    if scope == "org":
        if object_type == "customer":
            return f"{alias}.owner_org_id = ?", [user["org_id"]]
        return f"{alias}.org_id = ?", [user["org_id"]]
    if scope == "own_project":
        if object_type == "opportunity":
            return "1=0", []
        return f"{alias}.project_manager_id = ?", [user["id"]]
    if scope == "own_opportunity":
        if object_type == "opportunity":
            return f"{alias}.owner_id = ?", [user["id"]]
        return "1=0", []
    return "1=0", []

