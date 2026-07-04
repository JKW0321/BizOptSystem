from __future__ import annotations

import sqlite3

from backend.config import today_iso
from backend.db import query_all
from backend.security import has_permission, scope_kind, scoped_clause

OPPORTUNITY_STAGES = [
    "线索",
    "初步接触",
    "需求确认",
    "方案交流",
    "立项推进",
    "投标报价",
    "商务谈判",
    "赢单转项目",
    "输单关闭",
]

def validate_opportunity_payload(payload: dict) -> None:
    if "stage" in payload and payload.get("stage") not in OPPORTUNITY_STAGES:
        raise ValueError("商机阶段不在标准阶段内")
    if "probability" in payload:
        probability = float(payload.get("probability") or 0)
        if probability < 0 or probability > 1:
            raise ValueError("赢单概率必须在 0 到 1 之间")
    if "risk_level" in payload and payload.get("risk_level") not in {"低", "中", "高"}:
        raise ValueError("风险等级必须是低、中、高")

def validate_project_payload(payload: dict) -> None:
    if "progress" in payload:
        progress = int(payload.get("progress") or 0)
        if progress < 0 or progress > 100:
            raise ValueError("项目进度必须在 0 到 100 之间")
    if "health" in payload and payload.get("health") not in {"绿", "黄", "红"}:
        raise ValueError("项目健康度必须是绿、黄、红")

def project_visible_to_user(conn: sqlite3.Connection, user: dict, project_id: int) -> bool:
    clause, params = scoped_clause("p", user, "project")
    row = conn.execute(f"SELECT p.id FROM projects p WHERE p.id = ? AND {clause}", [project_id, *params]).fetchone()
    return bool(row)

def get_customers(conn: sqlite3.Connection, user: dict) -> list[dict]:
    scope = scope_kind(user)
    params: list = []
    opportunity_clause, opportunity_params = scoped_clause("o", user, "opportunity")
    project_clause, project_params = scoped_clause("p", user, "project")
    if scope == "all":
        clause = "1=1"
    elif scope == "org":
        clause = """
            c.owner_org_id = ?
            OR EXISTS (SELECT 1 FROM opportunities visible_o WHERE visible_o.customer_id = c.id AND visible_o.org_id = ?)
            OR EXISTS (SELECT 1 FROM projects visible_p WHERE visible_p.customer_id = c.id AND visible_p.org_id = ?)
        """
        params = [user["org_id"], user["org_id"], user["org_id"]]
    elif scope == "own_opportunity":
        clause = "EXISTS (SELECT 1 FROM opportunities visible_o WHERE visible_o.customer_id = c.id AND visible_o.owner_id = ?)"
        params = [user["id"]]
    elif scope == "own_project":
        clause = "EXISTS (SELECT 1 FROM projects visible_p WHERE visible_p.customer_id = c.id AND visible_p.project_manager_id = ?)"
        params = [user["id"]]
    else:
        clause = "1=0"
    return query_all(
        conn,
        f"""
        SELECT c.*, organizations.name AS owner_org_name,
               COALESCE(opp_stats.opportunity_count, 0) AS opportunity_count,
               COALESCE(opp_stats.open_opportunity_count, 0) AS open_opportunity_count,
               COALESCE(opp_stats.pipeline_amount, 0) AS pipeline_amount,
               COALESCE(opp_stats.weighted_amount, 0) AS weighted_amount,
               COALESCE(project_stats.project_count, 0) AS project_count,
               COALESCE(project_stats.active_project_count, 0) AS active_project_count
        FROM customers c
        LEFT JOIN organizations ON organizations.id = c.owner_org_id
        LEFT JOIN (
            SELECT customer_id,
                   COUNT(*) AS opportunity_count,
                   SUM(CASE WHEN stage NOT IN ('赢单转项目', '输单关闭') THEN 1 ELSE 0 END) AS open_opportunity_count,
                   SUM(CASE WHEN stage <> '输单关闭' THEN expected_contract_amount ELSE 0 END) AS pipeline_amount,
                   SUM(CASE WHEN stage <> '输单关闭' THEN expected_contract_amount * probability ELSE 0 END) AS weighted_amount
            FROM opportunities o
            WHERE {opportunity_clause}
            GROUP BY customer_id
        ) opp_stats ON opp_stats.customer_id = c.id
        LEFT JOIN (
            SELECT customer_id,
                   COUNT(*) AS project_count,
                   SUM(CASE WHEN status NOT IN ('已关闭', '终止') THEN 1 ELSE 0 END) AS active_project_count
            FROM projects p
            WHERE {project_clause}
            GROUP BY customer_id
        ) project_stats ON project_stats.customer_id = c.id
        WHERE {clause}
        ORDER BY pipeline_amount DESC, opportunity_count DESC, c.name
        """,
        [*opportunity_params, *project_params, *params],
    )

def get_opportunities(conn: sqlite3.Connection, user: dict) -> list[dict]:
    clause, params = scoped_clause("o", user, "opportunity")
    return query_all(
        conn,
        f"""
        SELECT o.*, customers.name AS customer_name, organizations.name AS org_name,
               users.name AS owner_name,
               p.id AS project_id, p.code AS project_code, p.name AS project_name,
               ROUND(o.expected_contract_amount * o.probability, 1) AS weighted_amount
        FROM opportunities o
        JOIN customers ON customers.id = o.customer_id
        JOIN organizations ON organizations.id = o.org_id
        JOIN users ON users.id = o.owner_id
        LEFT JOIN projects p ON p.opportunity_id = o.id
        WHERE {clause}
        ORDER BY CASE o.stage
          WHEN '线索' THEN 1
          WHEN '初步接触' THEN 2
          WHEN '需求确认' THEN 3
          WHEN '方案交流' THEN 4
          WHEN '立项推进' THEN 5
          WHEN '投标报价' THEN 6
          WHEN '商务谈判' THEN 7
          WHEN '赢单转项目' THEN 8
          WHEN '输单关闭' THEN 9
          ELSE 99 END,
          o.expected_sign_month, o.expected_contract_amount DESC
        """,
        params,
    )

def opportunity_visible_to_user(conn: sqlite3.Connection, user: dict, opportunity_id: int) -> bool:
    clause, params = scoped_clause("o", user, "opportunity")
    row = conn.execute(f"SELECT o.id FROM opportunities o WHERE o.id = ? AND {clause}", [opportunity_id, *params]).fetchone()
    return bool(row)

def convert_opportunity_to_project(conn: sqlite3.Connection, user: dict, opportunity_id: int, payload: dict) -> dict:
    if not has_permission(user, "opportunity.edit"):
        raise ValueError("当前角色无商机转项目权限")
    if not opportunity_visible_to_user(conn, user, opportunity_id):
        raise ValueError("当前角色无该商机权限")
    opportunity = conn.execute("SELECT * FROM opportunities WHERE id = ?", [opportunity_id]).fetchone()
    if not opportunity:
        raise ValueError("商机不存在")
    existing = conn.execute("SELECT * FROM projects WHERE opportunity_id = ?", [opportunity_id]).fetchone()
    if existing:
        return existing
    if opportunity["stage"] != "赢单转项目":
        raise ValueError("商机阶段需先推进到“赢单转项目”")
    project_manager_id = payload.get("project_manager_id")
    if not project_manager_id:
        manager = conn.execute(
            "SELECT id FROM users WHERE role = 'project_manager' AND org_id = ? AND status = '启用' ORDER BY id LIMIT 1",
            [opportunity["org_id"]],
        ).fetchone()
        project_manager_id = manager["id"] if manager else opportunity["owner_id"]
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM projects").fetchone()["next_id"]
    project_code = payload.get("code") or f"PRJ-{today_iso()[:4]}-{int(next_id):04d}"
    cursor = conn.execute(
        """
        INSERT INTO projects (
            code, name, customer_id, org_id, opportunity_id, project_manager_id,
            status, phase, progress, health, planned_end
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            project_code,
            payload.get("name") or opportunity["name"].replace("升级", "项目"),
            opportunity["customer_id"],
            opportunity["org_id"],
            opportunity_id,
            int(project_manager_id),
            payload.get("status", "已立项"),
            payload.get("phase", "立项启动"),
            int(payload.get("progress") or 0),
            payload.get("health", "绿"),
            payload.get("planned_end") or f"{opportunity['expected_sign_month']}-30",
        ],
    )
    conn.execute(
        "UPDATE opportunities SET probability = 1, updated_at = ? WHERE id = ?",
        [today_iso(), opportunity_id],
    )
    conn.commit()
    return conn.execute("SELECT * FROM projects WHERE id = ?", [cursor.lastrowid]).fetchone()

def get_projects(conn: sqlite3.Connection, user: dict) -> list[dict]:
    clause, params = scoped_clause("p", user, "project")
    return query_all(
        conn,
        f"""
        SELECT p.*, customers.name AS customer_name, organizations.name AS org_name,
               users.name AS project_manager_name,
               COALESCE(SUM(a.revenue), 0) AS actual_revenue,
               COALESCE(SUM(a.cost), 0) AS actual_cost,
               COALESCE(SUM(a.gross_profit), 0) AS actual_gross_profit,
               COALESCE(SUM(a.cash_in), 0) AS actual_cash_in,
               COALESCE(MAX(a.receivable), 0) AS receivable
        FROM projects p
        JOIN customers ON customers.id = p.customer_id
        JOIN organizations ON organizations.id = p.org_id
        JOIN users ON users.id = p.project_manager_id
        LEFT JOIN project_actuals a ON a.project_id = p.id
        WHERE {clause}
        GROUP BY p.id
        ORDER BY p.health DESC, p.planned_end
        """,
        params,
    )
