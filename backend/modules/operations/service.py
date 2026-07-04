from __future__ import annotations

import sqlite3

from backend.core import group_count, group_sum, money
from backend.db import query_all
from backend.security import scope_kind, scoped_clause
from backend.modules.business.pipeline import get_opportunities, get_projects
from backend.modules.performance.service import get_kpi

def get_forecasts(conn: sqlite3.Connection, user: dict) -> list[dict]:
    clause, params = scoped_clause("p", user, "project")
    return query_all(
        conn,
        f"""
        SELECT f.*, p.name AS project_name, p.code AS project_code, p.org_id,
               customers.name AS customer_name, users.name AS project_manager_name
        FROM project_forecasts f
        JOIN projects p ON p.id = f.project_id
        JOIN customers ON customers.id = p.customer_id
        JOIN users ON users.id = p.project_manager_id
        WHERE {clause}
        ORDER BY f.month, f.forecast_revenue DESC
        """,
        params,
    )

def forecast_visible_to_user(conn: sqlite3.Connection, user: dict, forecast_id: int) -> bool:
    clause, params = scoped_clause("p", user, "project")
    row = conn.execute(
        f"""
        SELECT f.id
        FROM project_forecasts f
        JOIN projects p ON p.id = f.project_id
        WHERE f.id = ? AND {clause}
        """,
        [forecast_id, *params],
    ).fetchone()
    return bool(row)

def dispatch_visible_to_user(conn: sqlite3.Connection, user: dict, dispatch_id: int) -> bool:
    scope = scope_kind(user)
    if scope == "all":
        clause, params = "1=1", []
    elif scope == "org":
        clause, params = "d.org_id = ?", [user["org_id"]]
    else:
        clause, params = "d.owner_id = ?", [user["id"]]
    row = conn.execute(f"SELECT d.id FROM dispatch_actions d WHERE d.id = ? AND {clause}", [dispatch_id, *params]).fetchone()
    return bool(row)

def get_dispatch_actions(conn: sqlite3.Connection, user: dict) -> list[dict]:
    scope = scope_kind(user)
    if scope == "all":
        clause, params = "1=1", []
    elif scope == "org":
        clause, params = "d.org_id = ?", [user["org_id"]]
    else:
        clause, params = "d.owner_id = ?", [user["id"]]
    return query_all(
        conn,
        f"""
        SELECT d.*, users.name AS owner_name, organizations.name AS org_name,
               p.name AS project_name, o.name AS opportunity_name
        FROM dispatch_actions d
        JOIN users ON users.id = d.owner_id
        JOIN organizations ON organizations.id = d.org_id
        LEFT JOIN projects p ON p.id = d.project_id
        LEFT JOIN opportunities o ON o.id = d.opportunity_id
        WHERE {clause}
        ORDER BY
          CASE d.priority WHEN '高' THEN 1 WHEN '中' THEN 2 ELSE 3 END,
          d.due_date
        """,
        params,
    )

def get_dashboard(conn: sqlite3.Connection, user: dict) -> dict:
    opportunities = get_opportunities(conn, user)
    projects = get_projects(conn, user)
    forecasts = get_forecasts(conn, user)
    actions = get_dispatch_actions(conn, user)
    kpi = get_kpi(conn, user)

    actual_revenue = sum(float(p["actual_revenue"] or 0) for p in projects)
    actual_cost = sum(float(p["actual_cost"] or 0) for p in projects)
    actual_profit = sum(float(p["actual_gross_profit"] or 0) for p in projects)
    cash_in = sum(float(p["actual_cash_in"] or 0) for p in projects)
    receivable = sum(float(p["receivable"] or 0) for p in projects)
    forecast_revenue = sum(float(f["forecast_revenue"] or 0) for f in forecasts)
    forecast_profit = sum(float(f["forecast_gross_profit"] or 0) for f in forecasts)
    opportunity_total = sum(float(o["expected_contract_amount"] or 0) for o in opportunities)
    weighted_total = sum(float(o["weighted_amount"] or 0) for o in opportunities)
    red_yellow = sum(1 for p in projects if p["health"] in {"红", "黄"})
    margin = (actual_profit / actual_revenue * 100) if actual_revenue else 0

    return {
        "user": user,
        "cards": [
            {"label": "管理口径收入", "value": money(actual_revenue), "unit": "万元"},
            {"label": "分摊后毛利", "value": money(actual_profit), "unit": "万元"},
            {"label": "毛利率", "value": round(margin, 1), "unit": "%"},
            {"label": "预测收入", "value": money(forecast_revenue), "unit": "万元"},
            {"label": "预测毛利", "value": money(forecast_profit), "unit": "万元"},
            {"label": "商机储备", "value": money(opportunity_total), "unit": "万元"},
            {"label": "加权商机", "value": money(weighted_total), "unit": "万元"},
            {"label": "回款金额", "value": money(cash_in), "unit": "万元"},
            {"label": "应收余额", "value": money(receivable), "unit": "万元"},
            {"label": "红黄项目", "value": red_yellow, "unit": "个"},
        ],
        "kpi": kpi,
        "opportunities": opportunities[:5],
        "projects": projects[:8],
        "forecasts": forecasts[:8],
        "actions": actions[:8],
        "health": group_count(projects, "health"),
        "opportunityStages": group_sum(opportunities, "stage", "expected_contract_amount"),
    }
