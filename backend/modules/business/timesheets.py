from __future__ import annotations

import sqlite3
from datetime import date

from backend.config import today_iso
from backend.db import query_all, update_row
from backend.security import has_permission, scope_kind
from backend.modules.business.pipeline import get_projects, project_visible_to_user

def timesheet_scope_clause(user: dict) -> tuple[str, list]:
    scope = scope_kind(user)
    person_id = user.get("person_id")
    if scope == "all":
        return "1=1", []
    if scope == "org":
        return "p.org_id = ?", [user["org_id"]]
    if scope == "own_project":
        if person_id:
            return "(p.project_manager_id = ? OR t.person_id = ?)", [user["id"], person_id]
        return "p.project_manager_id = ?", [user["id"]]
    if person_id:
        return "t.person_id = ?", [person_id]
    return "1=0", []

def timesheet_visible_to_user(conn: sqlite3.Connection, user: dict, timesheet_id: int) -> bool:
    clause, params = timesheet_scope_clause(user)
    row = conn.execute(
        f"""
        SELECT t.id
        FROM project_timesheets t
        JOIN projects p ON p.id = t.project_id
        WHERE t.id = ? AND {clause}
        """,
        [timesheet_id, *params],
    ).fetchone()
    return bool(row)

def timesheet_write_allowed(conn: sqlite3.Connection, user: dict, project_id: int, person_id: int) -> bool:
    if not has_permission(user, "timesheet.edit"):
        return False
    if scope_kind(user) in {"all", "org", "own_project"} and project_visible_to_user(conn, user, project_id):
        return True
    return bool(user.get("person_id") and int(user["person_id"]) == int(person_id))

def period_label(period_type: str, period_start: str) -> str:
    try:
        parsed = date.fromisoformat(period_start)
    except ValueError:
        return period_start
    if period_type == "月":
        return parsed.strftime("%Y-%m")
    iso_year, iso_week, _ = parsed.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"

def timesheet_cost_snapshot(conn: sqlite3.Connection, person_id: int, entry_mode: str, ratio: float, hours: float) -> dict:
    person = conn.execute(
        """
        SELECT persons.outsourcing_contract_id, persons.outsourcing_lot_id, persons.outsourcing_award_id,
               persons.outsourcing_price_id, persons.person_type,
               lot_supplier_prices.price_unit, lot_supplier_prices.unit_price
        FROM persons
        LEFT JOIN lot_supplier_prices ON lot_supplier_prices.id = persons.outsourcing_price_id
        WHERE persons.id = ?
        """,
        [person_id],
    ).fetchone()
    if not person:
        raise ValueError("人员不存在，不能填报项目工时")
    unit_price = float(person.get("unit_price") or 0)
    price_unit = person.get("price_unit") or ""
    estimated_cost = 0.0
    if unit_price > 0:
        if entry_mode == "小时":
            if "月" in price_unit:
                estimated_cost = hours * unit_price / 176
            elif "日" in price_unit or "天" in price_unit:
                estimated_cost = hours * unit_price / 8
            else:
                estimated_cost = hours * unit_price
        else:
            if "日" in price_unit or "天" in price_unit:
                estimated_cost = ratio * 22 * unit_price
            else:
                estimated_cost = ratio * unit_price
    return {
        "contract_id": person.get("outsourcing_contract_id"),
        "lot_id": person.get("outsourcing_lot_id"),
        "award_id": person.get("outsourcing_award_id"),
        "price_id": person.get("outsourcing_price_id"),
        "standard_price_unit": price_unit,
        "standard_unit_price": unit_price,
        "estimated_cost": round(estimated_cost, 2),
    }

def normalize_timesheet_payload(conn: sqlite3.Connection, user: dict, payload: dict) -> dict:
    project_id = int(payload.get("project_id") or 0)
    person_id = int(payload.get("person_id") or 0)
    if not project_id:
        raise ValueError("工时填报必须选择项目")
    if not person_id:
        raise ValueError("工时填报必须选择人员")
    if not conn.execute("SELECT id FROM projects WHERE id = ?", [project_id]).fetchone():
        raise ValueError("项目不存在")
    person = conn.execute("SELECT id, status FROM persons WHERE id = ?", [person_id]).fetchone()
    if not person:
        raise ValueError("人员不存在，不能在项目上填写工时")
    if person["status"] != "在职":
        raise ValueError("人员非在职状态，不能填写工时")
    if not timesheet_write_allowed(conn, user, project_id, person_id):
        raise ValueError("当前角色无该项目或人员的工时维护权限")
    period_type = payload.get("period_type") or "周"
    if period_type not in {"周", "月"}:
        raise ValueError("工时周期必须是周或月")
    period_start = payload.get("period_start") or today_iso()
    entry_mode = payload.get("entry_mode") or "比例"
    if entry_mode not in {"比例", "小时"}:
        raise ValueError("工时填报方式必须是比例或小时")
    ratio = float(payload.get("allocation_ratio") or 0)
    hours = float(payload.get("work_hours") or 0)
    if entry_mode == "比例":
        hours = 0
        if ratio <= 0:
            raise ValueError("比例填报必须填写大于 0 的投入比例")
    if entry_mode == "小时":
        ratio = 0
        if hours <= 0:
            raise ValueError("小时填报必须填写大于 0 的工作时长")
    status = payload.get("status") or "草稿"
    if status not in {"草稿", "已提交", "已确认"}:
        raise ValueError("工时状态不正确")
    snapshot = timesheet_cost_snapshot(conn, person_id, entry_mode, ratio, hours)
    normalized = {
        "project_id": project_id,
        "person_id": person_id,
        "period_type": period_type,
        "period_start": period_start,
        "period_label": period_label(period_type, period_start),
        "entry_mode": entry_mode,
        "allocation_ratio": ratio,
        "work_hours": hours,
        "work_content": payload.get("work_content") or "",
        "status": status,
        "submitted_by": user["id"] if status in {"已提交", "已确认"} else payload.get("submitted_by"),
        "submitted_at": today_iso() if status in {"已提交", "已确认"} else payload.get("submitted_at") or "",
        "updated_at": today_iso(),
        **snapshot,
    }
    return normalized

def get_timesheets(conn: sqlite3.Connection, user: dict) -> dict:
    clause, params = timesheet_scope_clause(user)
    rows = query_all(
        conn,
        f"""
        SELECT t.*, p.name AS project_name, p.code AS project_code, p.org_id, p.project_manager_id,
               organizations.name AS org_name, customers.name AS customer_name,
               manager.name AS project_manager_name,
               persons.real_name AS person_name, persons.employee_no, persons.person_type, persons.position,
               suppliers.name AS supplier_name,
               contracts.name AS contract_name, contract_lots.name AS lot_name,
               lot_supplier_prices.personnel_type, lot_supplier_prices.personnel_level
        FROM project_timesheets t
        JOIN projects p ON p.id = t.project_id
        JOIN organizations ON organizations.id = p.org_id
        JOIN customers ON customers.id = p.customer_id
        JOIN users manager ON manager.id = p.project_manager_id
        JOIN persons ON persons.id = t.person_id
        LEFT JOIN suppliers ON suppliers.id = persons.supplier_id
        LEFT JOIN contracts ON contracts.id = t.contract_id
        LEFT JOIN contract_lots ON contract_lots.id = t.lot_id
        LEFT JOIN lot_supplier_prices ON lot_supplier_prices.id = t.price_id
        WHERE {clause}
        ORDER BY t.period_start DESC, p.name, persons.real_name
        """,
        params,
    )
    ratio_totals: dict[tuple, float] = {}
    hour_totals: dict[tuple, float] = {}
    for row in rows:
        key = (row["person_id"], row["period_type"], row["period_start"])
        if row["entry_mode"] == "比例":
            ratio_totals[key] = ratio_totals.get(key, 0) + float(row["allocation_ratio"] or 0)
        if row["entry_mode"] == "小时":
            hour_totals[key] = hour_totals.get(key, 0) + float(row["work_hours"] or 0)
    warning_count = 0
    for row in rows:
        key = (row["person_id"], row["period_type"], row["period_start"])
        row["period_ratio_total"] = round(ratio_totals.get(key, 0), 3)
        row["period_hours_total"] = round(hour_totals.get(key, 0), 2)
        row["warning"] = ""
        if row["entry_mode"] == "比例" and row["period_ratio_total"] > 1:
            row["warning"] = "比例累计超过 1"
        if row["entry_mode"] == "小时" and row["period_hours_total"] > 8:
            row["warning"] = "小时累计超过 8"
        if row["warning"]:
            warning_count += 1
    projects = get_projects(conn, user)
    if scope_kind(user) in {"own_opportunity"}:
        projects = query_all(conn, "SELECT p.*, customers.name AS customer_name, organizations.name AS org_name, users.name AS project_manager_name FROM projects p JOIN customers ON customers.id = p.customer_id JOIN organizations ON organizations.id = p.org_id JOIN users ON users.id = p.project_manager_id ORDER BY p.name")
    persons = get_timesheet_people(conn, user)
    return {
        "rows": rows,
        "projects": projects,
        "persons": persons,
        "cards": [
            {"label": "工时记录", "value": len(rows), "unit": "条"},
            {"label": "预警记录", "value": warning_count, "unit": "条"},
            {"label": "小时合计", "value": round(sum(float(row["work_hours"] or 0) for row in rows), 1), "unit": "小时"},
            {"label": "估算外包成本", "value": round(sum(float(row["estimated_cost"] or 0) for row in rows), 1), "unit": "元"},
        ],
    }

def get_timesheet_people(conn: sqlite3.Connection, user: dict) -> list[dict]:
    scope = scope_kind(user)
    if scope == "all":
        clause, params = "1=1", []
    elif scope == "org":
        clause, params = "persons.org_id = ?", [user["org_id"]]
    elif scope == "own_project":
        clause, params = """
            persons.id = ?
            OR persons.org_id = ?
        """, [user.get("person_id") or 0, user.get("org_id") or 0]
    else:
        clause, params = "persons.id = ?", [user.get("person_id") or 0]
    return query_all(
        conn,
        f"""
        SELECT persons.id, persons.employee_no, persons.real_name, persons.person_type,
               persons.org_id, organizations.name AS org_name, persons.position,
               suppliers.name AS supplier_name,
               contracts.name AS outsourcing_contract_name,
               contract_lots.name AS outsourcing_lot_name,
               lot_supplier_prices.personnel_type AS outsourcing_personnel_type,
               lot_supplier_prices.personnel_level AS outsourcing_personnel_level,
               lot_supplier_prices.price_unit AS outsourcing_price_unit,
               lot_supplier_prices.unit_price AS outsourcing_unit_price
        FROM persons
        LEFT JOIN organizations ON organizations.id = persons.org_id
        LEFT JOIN suppliers ON suppliers.id = persons.supplier_id
        LEFT JOIN contracts ON contracts.id = persons.outsourcing_contract_id
        LEFT JOIN contract_lots ON contract_lots.id = persons.outsourcing_lot_id
        LEFT JOIN lot_supplier_prices ON lot_supplier_prices.id = persons.outsourcing_price_id
        WHERE persons.status = '在职' AND ({clause})
        ORDER BY persons.org_id, persons.real_name
        """,
        params,
    )

def create_timesheet(conn: sqlite3.Connection, user: dict, payload: dict) -> dict:
    normalized = normalize_timesheet_payload(conn, user, payload)
    normalized["created_by"] = user["id"]
    columns = ", ".join(normalized.keys())
    placeholders = ", ".join(["?"] * len(normalized))
    cursor = conn.execute(
        f"INSERT INTO project_timesheets ({columns}) VALUES ({placeholders})",
        list(normalized.values()),
    )
    conn.commit()
    return conn.execute("SELECT * FROM project_timesheets WHERE id = ?", [cursor.lastrowid]).fetchone()

def update_timesheet(conn: sqlite3.Connection, user: dict, timesheet_id: int, payload: dict) -> dict:
    if not timesheet_visible_to_user(conn, user, timesheet_id):
        raise ValueError("当前角色无该工时记录权限")
    current = conn.execute("SELECT * FROM project_timesheets WHERE id = ?", [timesheet_id]).fetchone()
    if not current:
        raise ValueError("工时记录不存在")
    merged = dict(current)
    merged.update(payload)
    normalized = normalize_timesheet_payload(conn, user, merged)
    return update_row(
        conn,
        "project_timesheets",
        timesheet_id,
        {
            "project_id", "person_id", "period_type", "period_start", "period_label", "entry_mode",
            "allocation_ratio", "work_hours", "work_content", "contract_id", "lot_id", "award_id",
            "price_id", "standard_price_unit", "standard_unit_price", "estimated_cost", "status",
            "submitted_by", "submitted_at", "updated_at",
        },
        normalized,
    )
