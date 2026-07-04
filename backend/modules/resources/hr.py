from __future__ import annotations

import re
import sqlite3

from backend.db import query_all

def org_descendant_ids(conn: sqlite3.Connection, org_id: int) -> list[int]:
    organizations = conn.execute("SELECT id, parent_id FROM organizations").fetchall()
    children: dict[int | None, list[int]] = {}
    for org in organizations:
        children.setdefault(org["parent_id"], []).append(org["id"])
    result: list[int] = []
    stack = [org_id]
    while stack:
        current = int(stack.pop())
        if current in result:
            continue
        result.append(current)
        stack.extend(children.get(current, []))
    return result

def org_hierarchy_sort_key(row: dict) -> tuple:
    parent_id = row.get("parent_org_id")
    owner_id = int(row.get("owner_id") or 0)
    group_id = owner_id if parent_id is None else int(parent_id)
    return (group_id, 0 if parent_id is None else 1, row.get("owner_name") or "")

def get_persons(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT persons.*, organizations.name AS org_name,
               suppliers.name AS supplier_name, suppliers.code AS supplier_code,
               contracts.name AS outsourcing_contract_name, contracts.code AS outsourcing_contract_code,
               contract_lots.name AS outsourcing_lot_name, contract_lots.code AS outsourcing_lot_code,
               award_supplier.name AS outsourcing_award_supplier_name,
               lot_supplier_prices.personnel_type AS outsourcing_personnel_type,
               lot_supplier_prices.personnel_level AS outsourcing_personnel_level,
               lot_supplier_prices.price_unit AS outsourcing_price_unit,
               lot_supplier_prices.unit_price AS outsourcing_unit_price
        FROM persons
        LEFT JOIN organizations ON organizations.id = persons.org_id
        LEFT JOIN suppliers ON suppliers.id = persons.supplier_id
        LEFT JOIN contracts ON contracts.id = persons.outsourcing_contract_id
        LEFT JOIN contract_lots ON contract_lots.id = persons.outsourcing_lot_id
        LEFT JOIN lot_supplier_awards ON lot_supplier_awards.id = persons.outsourcing_award_id
        LEFT JOIN suppliers award_supplier ON award_supplier.id = lot_supplier_awards.supplier_id
        LEFT JOIN lot_supplier_prices ON lot_supplier_prices.id = persons.outsourcing_price_id
        ORDER BY persons.id
        """,
    )

def get_organizations(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT child.id, child.name, child.type, child.parent_id,
               child.code, child.owner_id, owner.real_name AS owner_name,
               child.short_name, child.leader_id, leader.real_name AS leader_name,
               child.sort_order, child.remark,
               child.status, child.effective_from, child.effective_to,
               parent.name AS parent_name, parent.code AS parent_code,
               COUNT(users.id) AS user_count
        FROM organizations child
        LEFT JOIN organizations parent ON parent.id = child.parent_id
        LEFT JOIN persons owner ON owner.id = child.owner_id
        LEFT JOIN persons leader ON leader.id = child.leader_id
        LEFT JOIN users ON users.org_id = child.id
        GROUP BY child.id
        ORDER BY child.parent_id IS NOT NULL, child.parent_id, child.sort_order, child.id
        """,
    )

def validate_person_payload(payload: dict) -> None:
    id_card = (payload.get("id_card") or "").strip()
    email = (payload.get("email") or "").strip()
    mobile = (payload.get("mobile") or "").strip()
    person_type = payload.get("person_type") or "合同制"
    branch_company = (payload.get("branch_company") or "").strip()
    supplier_id = payload.get("supplier_id")
    outsourcing_contract_id = payload.get("outsourcing_contract_id")

    if id_card and not re.fullmatch(r"\d{17}[\dXx]", id_card):
        raise ValueError("身份证格式应为 18 位，最后一位可为数字或 X")
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("邮箱格式不正确")
    if mobile and not re.fullmatch(r"1\d{10}", mobile):
        raise ValueError("手机号格式应为 11 位中国大陆手机号")
    if person_type == "第三方" and not supplier_id:
        raise ValueError("第三方人员必须选择第三方供应商")
    if person_type == "第三方" and not outsourcing_contract_id:
        raise ValueError("第三方人员必须关联人员外包框架协议")
    if person_type == "分公司" and not branch_company:
        raise ValueError("分公司人员必须选择所属分公司")

def create_person(conn: sqlite3.Connection, payload: dict) -> dict:
    supplier_id = payload.get("supplier_id")
    if supplier_id == "":
        supplier_id = None
    payload["supplier_id"] = supplier_id
    for key in ("outsourcing_contract_id", "outsourcing_lot_id", "outsourcing_award_id", "outsourcing_price_id"):
        if payload.get(key) == "":
            payload[key] = None
    if payload.get("person_type") != "第三方":
        payload["supplier_id"] = None
        for key in ("outsourcing_contract_id", "outsourcing_lot_id", "outsourcing_award_id", "outsourcing_price_id"):
            payload[key] = None
    if payload.get("person_type") != "分公司":
        payload["branch_company"] = ""
    validate_person_payload(payload)
    cursor = conn.execute(
        """
        INSERT INTO persons (
          employee_no, real_name, photo_url, id_card, person_type, branch_company, supplier_id,
          outsourcing_contract_id, outsourcing_lot_id, outsourcing_award_id, outsourcing_price_id,
          org_id, position, email, mobile, status, effective_from, effective_to
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("employee_no", ""),
            payload.get("real_name", "新人员"),
            payload.get("photo_url", ""),
            payload.get("id_card", ""),
            payload.get("person_type", "合同制"),
            payload.get("branch_company", ""),
            payload.get("supplier_id"),
            payload.get("outsourcing_contract_id"),
            payload.get("outsourcing_lot_id"),
            payload.get("outsourcing_award_id"),
            payload.get("outsourcing_price_id"),
            payload.get("org_id"),
            payload.get("position", ""),
            payload.get("email", ""),
            payload.get("mobile", ""),
            payload.get("status", "在职"),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM persons WHERE id = ?", [cursor.lastrowid]).fetchone()

def create_organization(conn: sqlite3.Connection, payload: dict) -> dict:
    parent_id = payload.get("parent_id")
    if parent_id == "":
        parent_id = None
    if parent_id is not None:
        assert_valid_parent(conn, -1, parent_id)
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM organizations").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO organizations (code, name, type, parent_id, owner_id, short_name, leader_id, sort_order, status, effective_from, effective_to, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("code") or f"ORG-{int(next_id):03d}",
            payload.get("name", "新组织"),
            payload.get("type", "business_group"),
            parent_id,
            payload.get("owner_id"),
            payload.get("short_name") or "",
            payload.get("leader_id"),
            payload.get("sort_order") or 0,
            payload.get("status", "启用"),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("remark") or "",
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM organizations WHERE id = ?", [cursor.lastrowid]).fetchone()

def assert_valid_parent(conn: sqlite3.Connection, org_id: int, parent_id: int | None) -> None:
    if parent_id is None:
        return
    if int(parent_id) == int(org_id):
        raise ValueError("上级组织不能选择自己")
    parent = conn.execute("SELECT id FROM organizations WHERE id = ?", [parent_id]).fetchone()
    if not parent:
        raise ValueError("上级组织不存在")

    current = parent_id
    visited: set[int] = set()
    while current is not None:
        if int(current) == int(org_id):
            raise ValueError("上级组织不能选择自己的下级组织")
        if int(current) in visited:
            raise ValueError("组织层级存在循环")
        visited.add(int(current))
        row = conn.execute("SELECT parent_id FROM organizations WHERE id = ?", [current]).fetchone()
        current = row["parent_id"] if row else None
