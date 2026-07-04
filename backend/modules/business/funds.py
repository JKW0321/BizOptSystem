from __future__ import annotations

import sqlite3

from backend.config import today_iso
from backend.core import money
from backend.db import query_all, update_row
from backend.security import has_permission, scoped_clause
from backend.modules.business.pipeline import project_visible_to_user

def validate_fund_plan_payload(payload: dict) -> None:
    if not payload.get("project_id"):
        raise ValueError("资金计划必须选择项目")
    if not payload.get("month"):
        raise ValueError("资金计划必须选择月份")
    if payload.get("period_half") not in {"上半月", "下半月"}:
        raise ValueError("资金计划必须选择上半月或下半月")
    if payload.get("plan_type") not in {"收款计划", "支出计划"}:
        raise ValueError("资金计划必须选择收款计划或支出计划")
    if payload.get("planned_receipt") not in (None, "") and float(payload.get("planned_receipt")) < 0:
        raise ValueError("计划收款不能为负数")
    if payload.get("planned_payment") not in (None, "") and float(payload.get("planned_payment")) < 0:
        raise ValueError("计划付款不能为负数")
    if payload.get("plan_type") == "收款计划" and float(payload.get("planned_receipt") or 0) <= 0:
        raise ValueError("收款计划必须填写计划收款")
    if payload.get("plan_type") == "支出计划" and float(payload.get("planned_payment") or 0) <= 0:
        raise ValueError("支出计划必须填写计划付款")

def validate_fund_actual_payload(payload: dict) -> None:
    if not payload.get("project_id"):
        raise ValueError("实际收付必须选择项目")
    if payload.get("direction") not in {"收款", "付款"}:
        raise ValueError("实际收付方向必须是收款或付款")
    if not payload.get("occurred_date"):
        raise ValueError("实际收付必须填写发生日期")
    if payload.get("amount") in (None, "") or float(payload.get("amount")) <= 0:
        raise ValueError("实际收付金额必须大于 0")

def create_fund_plan(conn: sqlite3.Connection, user: dict, payload: dict) -> dict:
    if not has_permission(user, "fund.plan.edit"):
        raise ValueError("当前角色无资金计划填报权限")
    validate_fund_plan_payload(payload)
    project_id = int(payload.get("project_id"))
    if not project_visible_to_user(conn, user, project_id):
        raise ValueError("当前角色无该项目资金计划权限")
    planned_receipt = float(payload.get("planned_receipt") or 0)
    planned_payment = float(payload.get("planned_payment") or 0)
    if payload.get("plan_type") == "收款计划":
        planned_payment = 0
    if payload.get("plan_type") == "支出计划":
        planned_receipt = 0
    cursor = conn.execute(
        """
        INSERT INTO project_fund_plans (
            project_id, month, period_half, plan_type, planned_receipt, planned_payment, funding_gap, plan_note,
            status, submitted_by, submitted_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            project_id,
            payload.get("month"),
            payload.get("period_half"),
            payload.get("plan_type"),
            planned_receipt,
            planned_payment,
            planned_receipt - planned_payment,
            payload.get("plan_note", ""),
            payload.get("status", "草稿"),
            user["id"],
            today_iso(),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM project_fund_plans WHERE id = ?", [cursor.lastrowid]).fetchone()

def update_fund_plan(conn: sqlite3.Connection, user: dict, plan_id: int, payload: dict) -> dict:
    plan = conn.execute("SELECT * FROM project_fund_plans WHERE id = ?", [plan_id]).fetchone()
    if not plan:
        raise ValueError("资金计划不存在")
    if not project_visible_to_user(conn, user, int(plan["project_id"])):
        raise ValueError("当前角色无该项目资金计划权限")
    if payload.get("transition"):
        return transition_fund_plan(conn, user, plan, payload.get("transition"), payload.get("comment", ""))
    if not has_permission(user, "fund.plan.edit"):
        raise ValueError("当前角色无资金计划维护权限")
    if plan["status"] not in {"草稿", "退回"}:
        raise ValueError("仅草稿或退回状态可以修改资金计划")
    validate_fund_plan_payload({**plan, **payload})
    planned_receipt = float(payload.get("planned_receipt", plan["planned_receipt"]) or 0)
    planned_payment = float(payload.get("planned_payment", plan["planned_payment"]) or 0)
    plan_type = payload.get("plan_type", plan["plan_type"])
    if plan_type == "收款计划":
        planned_payment = 0
    if plan_type == "支出计划":
        planned_receipt = 0
    return update_row(
        conn,
        "project_fund_plans",
        plan_id,
        {"project_id", "month", "period_half", "plan_type", "planned_receipt", "planned_payment", "funding_gap", "plan_note", "status"},
        {**payload, "planned_receipt": planned_receipt, "planned_payment": planned_payment, "funding_gap": planned_receipt - planned_payment},
    )

def transition_fund_plan(conn: sqlite3.Connection, user: dict, plan: dict, transition: str, comment: str = "") -> dict:
    transitions = {
        "submit": ("草稿", "已提交", "提交", "fund.plan.edit", "submitted_by", "submitted_at"),
        "resubmit": ("退回", "已提交", "重新提交", "fund.plan.edit", "submitted_by", "submitted_at"),
        "director_review": ("已提交", "总监审核", "总监审核", "fund.plan.review", "director_reviewed_by", "director_reviewed_at"),
        "operations_confirm": ("总监审核", "经管确认", "经管确认", "fund.plan.review", "operations_confirmed_by", "operations_confirmed_at"),
        "department_approve": ("经管确认", "审批生效", "审批生效", "fund.plan.review", "department_approved_by", "department_approved_at"),
        "reject": (None, "退回", "退回", "fund.plan.review", "operations_confirmed_by", "operations_confirmed_at"),
    }
    if transition not in transitions:
        raise ValueError("未知资金计划流转动作")
    from_status, to_status, action, permission, user_column, time_column = transitions[transition]
    if not has_permission(user, permission):
        raise ValueError("当前角色无资金计划流转权限")
    if from_status and plan["status"] != from_status:
        raise ValueError(f"当前状态为{plan['status']}，不能执行{action}")
    if transition == "reject" and plan["status"] not in {"已提交", "总监审核", "经管确认"}:
        raise ValueError("当前状态不能退回")
    today = today_iso()
    conn.execute(
        f"UPDATE project_fund_plans SET status = ?, {user_column} = ?, {time_column} = ? WHERE id = ?",
        [to_status, user["id"], today, plan["id"]],
    )
    conn.execute(
        """
        INSERT INTO project_fund_approvals (plan_id, action, from_status, to_status, operator_id, operated_at, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [plan["id"], action, plan["status"], to_status, user["id"], today, comment],
    )
    conn.commit()
    return conn.execute("SELECT * FROM project_fund_plans WHERE id = ?", [plan["id"]]).fetchone()

def create_fund_actual(conn: sqlite3.Connection, user: dict, payload: dict) -> dict:
    if not has_permission(user, "fund.actual.edit"):
        raise ValueError("当前角色无实际收付登记权限")
    validate_fund_actual_payload(payload)
    project_id = int(payload.get("project_id"))
    if not project_visible_to_user(conn, user, project_id):
        raise ValueError("当前角色无该项目实际收付登记权限")
    plan_id = payload.get("plan_id")
    if not plan_id:
        raise ValueError("实际收付必须关联审批生效的资金计划")
    plan = conn.execute("SELECT * FROM project_fund_plans WHERE id = ?", [plan_id]).fetchone()
    if not plan or int(plan["project_id"]) != project_id:
        raise ValueError("选择的资金计划和项目不匹配")
    if plan["status"] != "审批生效":
        raise ValueError("只有审批生效后的资金计划才允许登记实际收付")
    if payload.get("direction") == "收款" and plan["plan_type"] != "收款计划":
        raise ValueError("收款登记必须关联审批生效的收款计划")
    if payload.get("direction") == "付款" and plan["plan_type"] != "支出计划":
        raise ValueError("付款登记必须关联审批生效的支出计划")
    receivable_id = payload.get("receivable_id")
    amount = float(payload.get("amount") or 0)
    if payload.get("direction") == "收款":
        if not receivable_id:
            raise ValueError("收款登记必须关联应收账款")
        receivable = conn.execute("SELECT * FROM project_receivables WHERE id = ?", [receivable_id]).fetchone()
        if not receivable or int(receivable["project_id"]) != project_id:
            raise ValueError("选择的应收账款和项目不匹配")
        balance = float(receivable["receivable_amount"] or 0) - float(receivable["received_amount"] or 0)
        if amount > balance:
            raise ValueError("收款金额不能超过应收余额")
    else:
        available = conn.execute(
            """
            SELECT
              COALESCE(SUM(CASE WHEN direction = '收款' THEN amount ELSE 0 END), 0)
              - COALESCE(SUM(CASE WHEN direction = '付款' THEN amount ELSE 0 END), 0) AS available_cash
            FROM project_fund_actuals
            WHERE project_id = ?
            """,
            [project_id],
        ).fetchone()["available_cash"]
        if amount > float(available or 0):
            raise ValueError("项目可用资金不足，不能登记该付款")
    cursor = conn.execute(
        """
        INSERT INTO project_fund_actuals (
            project_id, plan_id, receivable_id, occurred_date, direction, amount, counterparty,
            category, remark, registered_by, registered_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            project_id,
            plan_id,
            receivable_id,
            payload.get("occurred_date"),
            payload.get("direction"),
            amount,
            payload.get("counterparty", ""),
            payload.get("category", ""),
            payload.get("remark", ""),
            user["id"],
            today_iso(),
        ],
    )
    if payload.get("direction") == "收款":
        conn.execute(
            """
            UPDATE project_receivables
            SET received_amount = received_amount + ?,
                status = CASE
                  WHEN received_amount + ? >= receivable_amount THEN '已结清'
                  ELSE '部分回款'
                END
            WHERE id = ?
            """,
            [amount, amount, receivable_id],
        )
    conn.commit()
    return conn.execute("SELECT * FROM project_fund_actuals WHERE id = ?", [cursor.lastrowid]).fetchone()

def get_project_funds(conn: sqlite3.Connection, user: dict) -> dict:
    clause, params = scoped_clause("p", user, "project")
    projects = query_all(
        conn,
        f"""
        SELECT p.id, p.code, p.name, p.status, p.phase, p.health, p.org_id,
               customers.name AS customer_name, organizations.name AS org_name,
               users.name AS project_manager_name,
               COALESCE(plan_stats.planned_receipt, 0) AS planned_receipt,
               COALESCE(plan_stats.planned_payment, 0) AS planned_payment,
               COALESCE(plan_stats.effective_receipt, 0) AS effective_receipt,
               COALESCE(plan_stats.effective_payment, 0) AS effective_payment,
               COALESCE(actual_stats.actual_receipt, 0) AS actual_receipt,
               COALESCE(actual_stats.actual_payment, 0) AS actual_payment,
               COALESCE(receivable_stats.receivable_balance, 0) AS receivable_balance,
               COALESCE(receivable_stats.long_aging_receivable, 0) AS long_aging_receivable,
               COALESCE(receivable_stats.max_aging_days, 0) AS max_aging_days,
               COALESCE(plan_stats.effective_receipt, 0) - COALESCE(actual_stats.actual_receipt, 0) AS receipt_gap,
               COALESCE(plan_stats.effective_payment, 0) - COALESCE(actual_stats.actual_payment, 0) AS payment_gap,
               COALESCE(actual_stats.actual_receipt, 0) - COALESCE(actual_stats.actual_payment, 0) AS net_cash,
               COALESCE(plan_stats.pending_count, 0) AS pending_plan_count,
               COALESCE(plan_stats.effective_count, 0) AS effective_plan_count
        FROM projects p
        JOIN customers ON customers.id = p.customer_id
        JOIN organizations ON organizations.id = p.org_id
        JOIN users ON users.id = p.project_manager_id
        LEFT JOIN (
            SELECT project_id,
                   SUM(planned_receipt) AS planned_receipt,
                   SUM(planned_payment) AS planned_payment,
                   SUM(CASE WHEN status = '审批生效' THEN planned_receipt ELSE 0 END) AS effective_receipt,
                   SUM(CASE WHEN status = '审批生效' THEN planned_payment ELSE 0 END) AS effective_payment,
                   SUM(CASE WHEN status = '审批生效' THEN 1 ELSE 0 END) AS effective_count,
                   SUM(CASE WHEN status <> '审批生效' THEN 1 ELSE 0 END) AS pending_count
            FROM project_fund_plans
            GROUP BY project_id
        ) plan_stats ON plan_stats.project_id = p.id
        LEFT JOIN (
            SELECT project_id,
                   SUM(CASE WHEN direction = '收款' THEN amount ELSE 0 END) AS actual_receipt,
                   SUM(CASE WHEN direction = '付款' THEN amount ELSE 0 END) AS actual_payment
            FROM project_fund_actuals
            GROUP BY project_id
        ) actual_stats ON actual_stats.project_id = p.id
        LEFT JOIN (
            SELECT project_id,
                   SUM(CASE WHEN receivable_amount > received_amount THEN receivable_amount - received_amount ELSE 0 END) AS receivable_balance,
                   SUM(CASE WHEN receivable_amount > received_amount AND julianday(?) - julianday(due_date) >= 180 THEN receivable_amount - received_amount ELSE 0 END) AS long_aging_receivable,
                   MAX(CASE WHEN receivable_amount > received_amount THEN CAST(julianday(?) - julianday(due_date) AS INTEGER) ELSE 0 END) AS max_aging_days
            FROM project_receivables
            GROUP BY project_id
        ) receivable_stats ON receivable_stats.project_id = p.id
        WHERE {clause}
        ORDER BY receipt_gap DESC, p.health DESC, p.planned_end
        """,
        [today_iso(), today_iso(), *params],
    )
    plans = query_all(
        conn,
        f"""
        SELECT fp.*, p.code AS project_code, p.name AS project_name, p.org_id,
               customers.name AS customer_name, organizations.name AS org_name,
               users.name AS project_manager_name,
               submitter.name AS submitted_by_name,
               reviewer.name AS director_reviewed_by_name,
               confirmer.name AS operations_confirmed_by_name,
               approver.name AS department_approved_by_name,
               COALESCE(actual_stats.actual_receipt, 0) AS actual_receipt,
               COALESCE(actual_stats.actual_payment, 0) AS actual_payment,
               fp.planned_receipt - COALESCE(actual_stats.actual_receipt, 0) AS receipt_gap,
               fp.planned_payment - COALESCE(actual_stats.actual_payment, 0) AS payment_gap
        FROM project_fund_plans fp
        JOIN projects p ON p.id = fp.project_id
        JOIN customers ON customers.id = p.customer_id
        JOIN organizations ON organizations.id = p.org_id
        JOIN users ON users.id = p.project_manager_id
        LEFT JOIN users submitter ON submitter.id = fp.submitted_by
        LEFT JOIN users reviewer ON reviewer.id = fp.director_reviewed_by
        LEFT JOIN users confirmer ON confirmer.id = fp.operations_confirmed_by
        LEFT JOIN users approver ON approver.id = fp.department_approved_by
        LEFT JOIN (
            SELECT plan_id,
                   SUM(CASE WHEN direction = '收款' THEN amount ELSE 0 END) AS actual_receipt,
                   SUM(CASE WHEN direction = '付款' THEN amount ELSE 0 END) AS actual_payment
            FROM project_fund_actuals
            WHERE plan_id IS NOT NULL
            GROUP BY plan_id
        ) actual_stats ON actual_stats.plan_id = fp.id
        WHERE {clause}
        ORDER BY fp.month DESC, p.id
        """,
        params,
    )
    actuals = query_all(
        conn,
        f"""
        SELECT fa.*, p.code AS project_code, p.name AS project_name, p.org_id,
               fp.month AS plan_month, fp.period_half AS plan_period_half, fp.plan_type,
               receivables.due_date AS receivable_due_date,
               receivables.receivable_amount AS receivable_amount,
               receivables.received_amount AS receivable_received_amount,
               users.name AS registered_by_name
        FROM project_fund_actuals fa
        JOIN projects p ON p.id = fa.project_id
        LEFT JOIN project_fund_plans fp ON fp.id = fa.plan_id
        LEFT JOIN project_receivables receivables ON receivables.id = fa.receivable_id
        LEFT JOIN users ON users.id = fa.registered_by
        WHERE {clause}
        ORDER BY fa.occurred_date DESC, fa.id DESC
        """,
        params,
    )
    receivables = query_all(
        conn,
        f"""
        SELECT receivables.*, p.code AS project_code, p.name AS project_name, p.org_id,
               customers.name AS customer_name,
               receivables.receivable_amount - receivables.received_amount AS balance_amount,
               CAST(julianday(?) - julianday(receivables.due_date) AS INTEGER) AS aging_days
        FROM project_receivables receivables
        JOIN projects p ON p.id = receivables.project_id
        JOIN customers ON customers.id = p.customer_id
        WHERE {clause}
        ORDER BY aging_days DESC, balance_amount DESC
        """,
        [today_iso(), *params],
    )
    approvals = query_all(
        conn,
        f"""
        SELECT approvals.*, fp.month, p.name AS project_name, p.code AS project_code,
               users.name AS operator_name
        FROM project_fund_approvals approvals
        JOIN project_fund_plans fp ON fp.id = approvals.plan_id
        JOIN projects p ON p.id = fp.project_id
        LEFT JOIN users ON users.id = approvals.operator_id
        WHERE {clause}
        ORDER BY approvals.operated_at DESC, approvals.id DESC
        """,
        params,
    )
    cards = [
        {"label": "计划收款", "value": money(sum(row["planned_receipt"] for row in projects)), "unit": "万元"},
        {"label": "计划付款", "value": money(sum(row["planned_payment"] for row in projects)), "unit": "万元"},
        {"label": "实际收款", "value": money(sum(row["actual_receipt"] for row in projects)), "unit": "万元"},
        {"label": "应收余额", "value": money(sum(row["receivable_balance"] for row in projects)), "unit": "万元"},
        {"label": "长账龄应收", "value": money(sum(row["long_aging_receivable"] for row in projects)), "unit": "万元"},
    ]
    warnings = []
    for row in projects:
        if row["long_aging_receivable"] > 0:
            warnings.append({
                "project_name": row["name"],
                "org_name": row["org_name"],
                "warning": f"长账龄应收 {int(row['max_aging_days'] or 0)} 天",
                "amount": money(row["long_aging_receivable"]),
            })
        if row["net_cash"] < 0:
            warnings.append({
                "project_name": row["name"],
                "org_name": row["org_name"],
                "warning": "项目资金不足，存在付款压力",
                "amount": money(abs(row["net_cash"])),
            })
        if row["receipt_gap"] > 100:
            warnings.append({
                "project_name": row["name"],
                "org_name": row["org_name"],
                "warning": "回款滞后",
                "amount": money(row["receipt_gap"]),
            })
    return {"cards": cards, "projects": projects, "plans": plans, "actuals": actuals, "receivables": receivables, "approvals": approvals, "warnings": warnings}
