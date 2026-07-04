from __future__ import annotations

import re
import sqlite3

from backend.config import today_iso
from backend.core import money, period_meta
from backend.db import query_all, update_row
from backend.security import has_permission, scope_kind, scoped_clause
from backend.modules.resources.hr import get_organizations, org_descendant_ids, org_hierarchy_sort_key

def get_kpi(conn: sqlite3.Connection, user: dict) -> list[dict]:
    scope = scope_kind(user)
    if scope in {"org", "own_project", "own_opportunity"} and user.get("org_id"):
        org_ids = org_descendant_ids(conn, int(user["org_id"]))
        placeholders = ", ".join(["?"] * len(org_ids))
        targets = query_all(conn, f"SELECT * FROM kpi_targets WHERE owner_type = 'org' AND owner_id IN ({placeholders})", org_ids)
    elif scope == "all":
        targets = query_all(conn, "SELECT * FROM kpi_targets WHERE owner_type = 'org' ORDER BY owner_id, metric")
    else:
        targets = []

    result = []
    for target in targets:
        metric_key = target["metric"]
        scoped_user = dict(user)
        scoped_user["role_data_scope"] = "本业务组"
        scoped_user["org_id"] = target["owner_id"]
        actual = actual_metrics(conn, scoped_user, target["period"], include_descendants=True).get(metric_key, 0)
        owner = conn.execute("SELECT name FROM organizations WHERE id = ?", [target["owner_id"]]).fetchone()["name"]
        target_value = float(target["target_value"])
        result.append(
            {
                **target,
                "owner_name": owner,
                "actual_value": money(actual),
                "completion_rate": round((actual / target_value) * 100, 1) if target_value else 0,
                "gap_value": money(actual - target_value),
            }
        )
    return result

def target_actual_value(conn: sqlite3.Connection, user: dict, target: dict) -> float:
    metric_key = target["metric"]
    if target["owner_type"] == "org":
        scoped_user = dict(user)
        scoped_user["role_data_scope"] = "本业务组"
        scoped_user["org_id"] = target["owner_id"]
        return float(actual_metrics(conn, scoped_user, target["period"], include_descendants=True).get(metric_key, 0))
    return float(actual_metrics(conn, user, target["period"]).get(metric_key, 0))

def performance_actual_value(conn: sqlite3.Connection, user: dict, item: dict, period: str | None = None) -> float:
    metric_map = {
        "revenue": "管理口径收入",
        "gross_profit": "分摊后毛利",
        "external_revenue": "商机储备金额",
    }
    metric = metric_map.get(item.get("metric_code") or "")
    if not metric:
        return 0.0
    scoped_user = dict(user)
    scoped_user["role_data_scope"] = "本业务组"
    scoped_user["org_id"] = item["org_id"]
    return float(actual_metrics(conn, scoped_user, period or item["cycle_year"], include_descendants=True).get(metric, 0))

def performance_item_row(conn: sqlite3.Connection, user: dict, item: dict) -> dict:
    target_value = item["target_value"]
    actual_value = performance_actual_value(conn, user, item)
    numeric_target = target_value is not None
    target_number = money(target_value) if numeric_target else 0
    return {
        "id": item["id"],
        "source": "performance_kpi_items",
        "owner_type": "org",
        "owner_id": item["org_id"],
        "owner_name": item["owner_name"],
        "parent_org_id": item["parent_org_id"],
        "org_type": item["org_type"],
        "parent_item_id": item["parent_item_id"],
        "item_id": item["id"],
        "kpi_code": item.get("kpi_code") or item.get("metric_code") or f"KPI-{item['id']}",
        "metric": item["name"],
        "category": item["category"],
        "definition": item["definition"],
        "target_text": item["target_text"],
        "target_value": target_number,
        "has_numeric_target": bool(numeric_target),
        "unit": item["unit"],
        "weight": item["weight"],
        "scoring_method": item["scoring_method"],
        "data_source": item["data_source"],
        "owner_department": item["owner_department"],
        "kpi_type": item["kpi_type"],
        "decomposition_mode": item["decomposition_mode"],
        "quarterly_mode": item["quarterly_mode"],
        "metric_code": item["metric_code"],
        "version_no": item.get("version_no") or "V1.0",
        "version_status": item.get("version_status") or "已发布",
        "is_locked": bool(item.get("is_locked")),
        "version_note": item.get("version_note") or "",
        "effective_from": item.get("effective_from") or "",
        "effective_to": item.get("effective_to") or "",
        "usage_count": int(item.get("usage_count") or 0),
        "is_in_use": bool(item.get("usage_count")),
        "status": item["status"],
        "period": item["cycle_year"],
        "period_type": "年度",
        "period_label": f"{item['cycle_year']} 年",
        "dimension": "分解组织" if item["parent_item_id"] else "顶层绩效组织",
        "level": 1 if item["parent_item_id"] else 0,
        "actual_value": money(actual_value),
        "completion_rate": round((actual_value / float(target_value)) * 100, 1) if numeric_target and float(target_value or 0) else 0,
        "gap_value": money(actual_value - float(target_value or 0)) if numeric_target else 0,
    }

def performance_period_row(item_row: dict, period_target: dict) -> dict:
    meta = period_meta(period_target["period"])
    target_value = period_target["target_value"]
    actual_value = float(period_target["actual_value"] or 0)
    numeric_target = target_value is not None
    target_number = money(target_value) if numeric_target else 0
    return {
        **item_row,
        "id": 100000 + int(period_target["id"]),
        "source": "performance_period_targets",
        "item_id": item_row["item_id"],
        "parent_item_id": item_row["item_id"],
        "period_target_id": period_target["id"],
        "period": period_target["period"],
        "period_type": meta["type"],
        "period_label": meta["label"],
        "target_text": period_target["target_text"] or item_row["target_text"],
        "target_value": target_number,
        "has_numeric_target": bool(numeric_target),
        "actual_value": money(actual_value),
        "completion_rate": round((actual_value / float(target_value)) * 100, 1) if numeric_target and float(target_value or 0) else 0,
        "gap_value": money(actual_value - float(target_value or 0)) if numeric_target else 0,
        "status": period_target["status"],
    }

def get_performance(conn: sqlite3.Connection, user: dict) -> dict:
    scope = scope_kind(user)
    organizations = query_all(
        conn,
        """
        SELECT organizations.id, organizations.code, organizations.name, organizations.type,
               organizations.parent_id, organizations.status, persons.real_name AS owner_name,
               parent.name AS parent_name
        FROM organizations
        LEFT JOIN persons ON persons.id = organizations.owner_id
        LEFT JOIN organizations parent ON parent.id = organizations.parent_id
        ORDER BY organizations.parent_id, organizations.id
        """,
    )
    if scope == "all":
        visible_org_ids = {int(org["id"]) for org in organizations}
        org_targets = query_all(
            conn,
            """
            SELECT kt.*, organizations.name AS owner_name, organizations.parent_id AS parent_org_id, organizations.type AS org_type
            FROM kpi_targets kt
            JOIN organizations ON organizations.id = kt.owner_id
            WHERE kt.owner_type = 'org'
            ORDER BY kt.period, kt.metric, organizations.name
            """,
        )
    elif scope in {"org", "own_project", "own_opportunity"}:
        org_ids = org_descendant_ids(conn, int(user["org_id"])) if user.get("org_id") else []
        visible_org_ids = {int(org_id) for org_id in org_ids}
        placeholders = ", ".join(["?"] * len(org_ids)) or "NULL"
        org_targets = query_all(
            conn,
            f"""
            SELECT kt.*, organizations.name AS owner_name, organizations.parent_id AS parent_org_id, organizations.type AS org_type
            FROM kpi_targets kt
            JOIN organizations ON organizations.id = kt.owner_id
            WHERE kt.owner_type = 'org' AND kt.owner_id IN ({placeholders})
            ORDER BY kt.period, kt.metric
            """,
            org_ids,
        )
    else:
        visible_org_ids = set()
        org_targets = []
    visible_organizations = [org for org in organizations if int(org["id"]) in visible_org_ids]

    configured_count = conn.execute(
        f"SELECT COUNT(*) AS count FROM performance_kpi_items WHERE org_id IN ({', '.join(['?'] * len(visible_org_ids)) or 'NULL'})",
        list(visible_org_ids),
    ).fetchone()["count"] if visible_org_ids else 0
    if configured_count:
        placeholders = ", ".join(["?"] * len(visible_org_ids))
        items = query_all(
            conn,
            f"""
            SELECT pki.*, organizations.name AS owner_name, organizations.parent_id AS parent_org_id, organizations.type AS org_type,
                   (
                     SELECT COUNT(*) FROM performance_kpi_items child WHERE child.parent_item_id = pki.id
                   ) + (
                     SELECT COUNT(*) FROM performance_period_targets ppt WHERE ppt.item_id = pki.id
                   ) AS usage_count
            FROM performance_kpi_items pki
            JOIN organizations ON organizations.id = pki.org_id
            WHERE pki.org_id IN ({placeholders})
            ORDER BY pki.cycle_year, pki.org_id, pki.category, pki.id
            """,
            list(visible_org_ids),
        )
        item_rows = [performance_item_row(conn, user, item) for item in items]
        item_rows_by_id = {int(row["item_id"]): row for row in item_rows}
        period_targets = query_all(
            conn,
            f"""
            SELECT ppt.*
            FROM performance_period_targets ppt
            JOIN performance_kpi_items pki ON pki.id = ppt.item_id
            WHERE pki.org_id IN ({placeholders})
            ORDER BY ppt.period, ppt.id
            """,
            list(visible_org_ids),
        )
        period_rows = [
            performance_period_row(item_rows_by_id[int(row["item_id"])], row)
            for row in period_targets
            if int(row["item_id"]) in item_rows_by_id
        ]
        targets = [*item_rows, *period_rows]
        summary = [row for row in item_rows if not row["parent_item_id"]]
        periods = sorted(
            {row["period"]: period_meta(row["period"]) for row in targets}.values(),
            key=lambda item: item["sort"],
        )
        cards = [
            {"label": "年度 KPI", "value": len(summary), "unit": "项"},
            {"label": "定量指标", "value": sum(1 for row in summary if row["kpi_type"] == "定量"), "unit": "项"},
            {"label": "定性/混合", "value": sum(1 for row in summary if row["kpi_type"] in {"定性", "混合"}), "unit": "项"},
            {"label": "扣分/加分", "value": sum(1 for row in summary if row["kpi_type"] in {"扣分项", "加分项"}), "unit": "项"},
        ]
        return {"cards": cards, "summary": summary, "hierarchy": [], "targets": targets, "periods": periods, "organizations": visible_organizations, "model": "configured"}

    org_target_keys = {(row["metric"], row["period"], int(row["owner_id"])): row for row in org_targets}
    target_org_ids = {int(row["owner_id"]) for row in org_targets}
    hierarchy = []
    metric_periods = sorted({(row["metric"], row["period"]) for row in org_targets}, key=lambda item: (period_meta(item[1])["sort"], item[0]))
    for metric, period in metric_periods:
        meta = period_meta(period)
        visible_org_targets = sorted(
            [row for row in org_targets if row["metric"] == metric and row["period"] == period],
            key=org_hierarchy_sort_key,
        )
        for org_target in visible_org_targets:
            org_id = int(org_target["owner_id"])
            parent_id = org_target.get("parent_org_id")
            child_targets = [
                org_target_keys[(metric, period, int(child["id"]))]
                for child in organizations
                if child.get("parent_id") == org_id and (metric, period, int(child["id"])) in org_target_keys
            ]
            parent_visible = parent_id is not None and int(parent_id) in target_org_ids
            target_value = float(org_target["target_value"] or 0)
            decomposed = sum(float(row["target_value"] or 0) for row in child_targets)
            actual = target_actual_value(conn, user, org_target)
            has_children = bool(child_targets)
            hierarchy.append({
                **org_target,
                "period_type": meta["type"],
                "period_label": meta["label"],
                "parent_org_id": parent_id,
                "level": 1 if parent_visible else 0,
                "dimension": "分解组织" if parent_visible else "顶层绩效组织",
                "target_value": money(target_value),
                "decomposed_target": money(decomposed) if has_children else None,
                "decomposition_rate": round((decomposed / target_value) * 100, 1) if has_children and target_value else None,
                "decomposition_gap": money(decomposed - target_value) if has_children else None,
                "decomposition_status": "已覆盖" if has_children and decomposed >= target_value else ("分解不足" if has_children else "-"),
                "actual_value": money(actual),
                "completion_rate": round((actual / target_value) * 100, 1) if target_value else 0,
                "child_count": len(child_targets),
                "has_children": has_children,
            })

    target_rows = []
    for target in sorted(org_targets, key=lambda row: (period_meta(row["period"])["sort"], row["metric"], org_hierarchy_sort_key(row))):
        target_value = float(target["target_value"] or 0)
        actual_value = target_actual_value(conn, user, target)
        meta = period_meta(target["period"])
        parent_id = target.get("parent_org_id")
        parent_visible = parent_id is not None and int(parent_id) in target_org_ids
        target_rows.append({
            **target,
            "period_type": meta["type"],
            "period_label": meta["label"],
            "dimension": "分解组织" if parent_visible else "顶层绩效组织",
            "level": 1 if parent_visible else 0,
            "parent_org_id": parent_id,
            "target_value": money(target_value),
            "actual_value": money(actual_value),
            "completion_rate": round((actual_value / target_value) * 100, 1) if target_value else 0,
            "gap_value": money(actual_value - target_value),
        })

    summary = [row for row in hierarchy if row["level"] == 0]
    cards = [
        {"label": "顶层指标", "value": len(summary), "unit": "项"},
        {"label": "分解达标", "value": sum(1 for row in summary if row["decomposition_status"] == "已覆盖"), "unit": "项"},
        {"label": "平均完成率", "value": round(sum(row["completion_rate"] for row in summary) / len(summary), 1) if summary else 0, "unit": "%"},
        {"label": "分解预警", "value": sum(1 for row in summary if row["decomposition_status"] != "已覆盖"), "unit": "项"},
    ]
    periods = sorted(
        {row["period"]: period_meta(row["period"]) for row in org_targets}.values(),
        key=lambda item: item["sort"],
    )
    return {"cards": cards, "summary": summary, "hierarchy": hierarchy, "targets": target_rows, "periods": periods, "organizations": visible_organizations}

def validate_kpi_target_payload(payload: dict) -> None:
    if "target_value" not in payload:
        raise ValueError("请填写目标值")
    if float(payload.get("target_value") or 0) < 0:
        raise ValueError("目标值不能为负数")

def assert_kpi_decomposition(conn: sqlite3.Connection, target_id: int, next_value: float) -> None:
    target = conn.execute("SELECT * FROM kpi_targets WHERE id = ?", [target_id]).fetchone()
    if not target:
        raise ValueError("绩效指标不存在")
    if target["owner_type"] != "org":
        raise ValueError("绩效指标按组织维护，请选择组织绩效目标")
    metric = target["metric"]
    period = target["period"]
    org_rows = conn.execute(
        """
        SELECT kt.*, organizations.parent_id
        FROM kpi_targets kt
        JOIN organizations ON organizations.id = kt.owner_id
        WHERE kt.owner_type = 'org' AND kt.metric = ? AND kt.period = ?
        """,
        [metric, period],
    ).fetchall()

    def target_value(row: dict | None) -> float:
        if not row:
            return 0
        return next_value if int(row["id"]) == int(target_id) else float(row["target_value"] or 0)

    org_by_id = {int(row["owner_id"]): row for row in org_rows}
    for parent_org_id, parent_target in org_by_id.items():
        child_rows = [row for row in org_rows if row["parent_id"] == parent_org_id]
        if child_rows and sum(target_value(row) for row in child_rows) < target_value(parent_target):
            raise ValueError("下级组织分项目标之和必须大于等于上级组织目标")

def update_kpi_target(conn: sqlite3.Connection, user: dict, target_id: int, payload: dict) -> dict:
    if not has_permission(user, "kpi.manage"):
        raise ValueError("当前角色无绩效指标维护权限")
    validate_kpi_target_payload(payload)
    next_value = float(payload.get("target_value") or 0)
    assert_kpi_decomposition(conn, target_id, next_value)
    return update_row(conn, "kpi_targets", target_id, {"target_value"}, {"target_value": next_value})

def performance_kpi_usage_count(conn: sqlite3.Connection, item_id: int) -> int:
    child_count = conn.execute(
        "SELECT COUNT(*) AS count FROM performance_kpi_items WHERE parent_item_id = ?",
        [item_id],
    ).fetchone()["count"]
    period_count = conn.execute(
        "SELECT COUNT(*) AS count FROM performance_period_targets WHERE item_id = ?",
        [item_id],
    ).fetchone()["count"]
    return int(child_count or 0) + int(period_count or 0)

def normalize_performance_kpi_payload(payload: dict) -> dict:
    normalized = dict(payload)
    if normalized.get("target_value") in {"", None}:
        normalized["target_value"] = None
    elif "target_value" in normalized:
        normalized["target_value"] = float(normalized["target_value"] or 0)
    if normalized.get("org_id") in {"", None}:
        normalized.pop("org_id", None)
    if normalized.get("parent_item_id") in {"", None}:
        normalized["parent_item_id"] = None
    return normalized

def default_performance_org_id(conn: sqlite3.Connection, user: dict, payload: dict) -> int:
    if payload.get("org_id"):
        return int(payload["org_id"])
    if user.get("org_id"):
        return int(user["org_id"])
    row = conn.execute(
        """
        SELECT id FROM organizations
        WHERE parent_id IS NULL OR parent_id NOT IN (SELECT id FROM organizations)
        ORDER BY id
        LIMIT 1
        """
    ).fetchone()
    if not row:
        raise ValueError("缺少可用组织，无法创建 KPI 指标")
    return int(row["id"])

def performance_kpi_allowed_fields() -> set[str]:
    return {
        "cycle_year",
        "org_id",
        "parent_item_id",
        "kpi_code",
        "category",
        "name",
        "definition",
        "target_text",
        "target_value",
        "unit",
        "weight",
        "scoring_method",
        "data_source",
        "owner_department",
        "kpi_type",
        "decomposition_mode",
        "quarterly_mode",
        "metric_code",
        "version_note",
        "effective_from",
        "effective_to",
        "status",
    }

def update_performance_kpi(conn: sqlite3.Connection, user: dict, item_id: int, payload: dict) -> dict:
    if not has_permission(user, "kpi.manage"):
        raise ValueError("当前角色无 KPI 指标库维护权限")
    item = conn.execute("SELECT * FROM performance_kpi_items WHERE id = ?", [item_id]).fetchone()
    if not item:
        raise ValueError("KPI 指标不存在")
    usage_count = performance_kpi_usage_count(conn, item_id)
    if int(item["is_locked"] or 0) or item["version_status"] != "草稿" or usage_count:
        raise ValueError("该 KPI 版本已发布或已被使用，不能直接修改，请复制新版本后维护")
    payload = normalize_performance_kpi_payload(payload)
    return update_row(conn, "performance_kpi_items", item_id, performance_kpi_allowed_fields(), payload)

def create_performance_kpi(conn: sqlite3.Connection, user: dict, payload: dict) -> dict:
    if not has_permission(user, "kpi.manage"):
        raise ValueError("当前角色无 KPI 指标库维护权限")
    payload = normalize_performance_kpi_payload(payload)
    org_id = default_performance_org_id(conn, user, payload)
    fields = {
        "cycle_year": payload.get("cycle_year") or today_iso()[:4],
        "org_id": org_id,
        "parent_item_id": payload.get("parent_item_id"),
        "kpi_code": payload.get("kpi_code") or payload.get("metric_code") or f"KPI-{today_iso()[:4]}",
        "category": payload.get("category") or "经营",
        "name": payload.get("name") or "新的 KPI 指标",
        "definition": payload.get("definition") or "",
        "target_text": payload.get("target_text") or "",
        "target_value": payload.get("target_value"),
        "unit": payload.get("unit") or "",
        "weight": payload.get("weight") or "",
        "scoring_method": payload.get("scoring_method") or "",
        "data_source": payload.get("data_source") or "",
        "owner_department": payload.get("owner_department") or "",
        "kpi_type": payload.get("kpi_type") or "定量",
        "decomposition_mode": payload.get("decomposition_mode") or "严格汇总",
        "quarterly_mode": payload.get("quarterly_mode") or "按季度",
        "metric_code": payload.get("metric_code") or "",
        "version_no": payload.get("version_no") or "V1.0",
        "version_status": "草稿",
        "is_locked": 0,
        "version_note": payload.get("version_note") or "新建草稿版本",
        "effective_from": payload.get("effective_from") or today_iso(),
        "effective_to": payload.get("effective_to") or "",
        "status": "草稿",
    }
    columns = ", ".join(fields.keys())
    placeholders = ", ".join(["?"] * len(fields))
    cursor = conn.execute(
        f"INSERT INTO performance_kpi_items ({columns}) VALUES ({placeholders})",
        list(fields.values()),
    )
    conn.commit()
    return conn.execute("SELECT * FROM performance_kpi_items WHERE id = ?", [cursor.lastrowid]).fetchone()

def next_version_no(version_no: str) -> str:
    match = re.search(r"(\d+)(?:\.(\d+))?", version_no or "")
    if not match:
        return "V1.1"
    major = int(match.group(1))
    minor = int(match.group(2) or 0) + 1
    return f"V{major}.{minor}"

def copy_performance_kpi_version(conn: sqlite3.Connection, user: dict, item_id: int, payload: dict) -> dict:
    if not has_permission(user, "kpi.manage"):
        raise ValueError("当前角色无 KPI 指标库维护权限")
    source = conn.execute("SELECT * FROM performance_kpi_items WHERE id = ?", [item_id]).fetchone()
    if not source:
        raise ValueError("KPI 指标不存在")
    copy_payload = dict(source)
    copy_payload.update(payload or {})
    copy_payload["version_no"] = payload.get("version_no") if payload else None
    copy_payload["version_no"] = copy_payload["version_no"] or next_version_no(source["version_no"])
    copy_payload["version_note"] = payload.get("version_note") if payload else None
    copy_payload["version_note"] = copy_payload["version_note"] or f"由 {source['version_no']} 复制"
    copy_payload["parent_item_id"] = None
    copy_payload["target_value"] = source["target_value"]
    copy_payload["target_text"] = source["target_text"]
    copy_payload["status"] = "草稿"
    row = create_performance_kpi(conn, user, copy_payload)
    conn.execute(
        "UPDATE performance_kpi_items SET version_no = ?, version_note = ? WHERE id = ?",
        [copy_payload["version_no"], copy_payload["version_note"], row["id"]],
    )
    conn.commit()
    return conn.execute("SELECT * FROM performance_kpi_items WHERE id = ?", [row["id"]]).fetchone()

def actual_metrics(conn: sqlite3.Connection, user: dict, period: str | None = None, include_descendants: bool = False) -> dict:
    meta = period_meta(period)
    if include_descendants and user.get("org_id"):
        org_ids = org_descendant_ids(conn, int(user["org_id"]))
        placeholders = ", ".join(["?"] * len(org_ids))
        project_clause, project_params = f"p.org_id IN ({placeholders})", org_ids
        opportunity_clause, opportunity_params = f"o.org_id IN ({placeholders})", org_ids
    else:
        project_clause, project_params = scoped_clause("p", user, "project")
        opportunity_clause, opportunity_params = scoped_clause("o", user, "opportunity")
    scope = scope_kind(user)
    month_join = ""
    project_period_params: list = []
    opportunity_period_clause = ""
    opportunity_period_params: list = []
    if meta["start"] and meta["end"]:
        month_join = " AND a.month BETWEEN ? AND ?"
        project_period_params = [meta["start"], meta["end"]]
        opportunity_period_clause = " AND o.expected_sign_month BETWEEN ? AND ?"
        opportunity_period_params = [meta["start"], meta["end"]]
    if scope == "own_opportunity":
        project = {"revenue": 0, "gross_profit": 0, "cash_in": 0, "receivable": 0}
    else:
        project = conn.execute(
            f"""
            SELECT COALESCE(SUM(a.revenue), 0) AS revenue,
                   COALESCE(SUM(a.gross_profit), 0) AS gross_profit,
                   COALESCE(SUM(a.cash_in), 0) AS cash_in,
                   COALESCE(SUM(a.receivable), 0) AS receivable
            FROM projects p
            LEFT JOIN project_actuals a ON a.project_id = p.id{month_join}
            WHERE {project_clause}
            """,
            [*project_period_params, *project_params],
        ).fetchone()
    if scope == "own_project":
        opportunity_amount = 0
    else:
        opportunity_amount = conn.execute(
            f"SELECT COALESCE(SUM(expected_contract_amount), 0) AS amount FROM opportunities o WHERE {opportunity_clause}{opportunity_period_clause}",
            [*opportunity_params, *opportunity_period_params],
        ).fetchone()["amount"]
    return {
        "管理口径收入": money(project["revenue"]),
        "分摊后毛利": money(project["gross_profit"]),
        "回款金额": money(project["cash_in"]),
        "应收余额": money(project["receivable"]),
        "商机储备金额": money(opportunity_amount),
    }
