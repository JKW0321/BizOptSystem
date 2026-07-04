from __future__ import annotations

import re
import sqlite3

from backend.db import query_all


def get_suppliers(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT suppliers.id, suppliers.code, suppliers.name, suppliers.credit_code, suppliers.type,
               suppliers.contact_name, suppliers.phone, suppliers.email, suppliers.status,
               suppliers.effective_from, suppliers.effective_to, suppliers.remark,
               COALESCE(person_stats.person_count, 0) AS person_count,
               COALESCE(person_stats.third_party_count, 0) AS third_party_count,
               COALESCE(agreement_stats.contract_count, 0) AS contract_count,
               COALESCE(agreement_stats.lot_count, 0) AS lot_count,
               COALESCE(agreement_stats.price_item_count, 0) AS price_item_count
        FROM suppliers
        LEFT JOIN (
            SELECT supplier_id,
                   COUNT(id) AS person_count,
                   SUM(CASE WHEN person_type = '第三方' THEN 1 ELSE 0 END) AS third_party_count
            FROM persons
            GROUP BY supplier_id
        ) person_stats ON person_stats.supplier_id = suppliers.id
        LEFT JOIN (
            SELECT lot_supplier_prices.supplier_id,
                   COUNT(DISTINCT lot_supplier_prices.contract_id) AS contract_count,
                   COUNT(DISTINCT lot_supplier_prices.lot_id) AS lot_count,
                   COUNT(lot_supplier_prices.id) AS price_item_count
            FROM lot_supplier_prices
            GROUP BY lot_supplier_prices.supplier_id
        ) agreement_stats ON agreement_stats.supplier_id = suppliers.id
        ORDER BY suppliers.id
        """,
    )


def get_contracts(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT contracts.*,
               COALESCE(lot_stats.lot_count, 0) AS lot_count,
               COALESCE(supplier_stats.supplier_count, 0) AS supplier_count
        FROM contracts
        LEFT JOIN (
            SELECT contract_lots.contract_id,
                   COUNT(DISTINCT contract_lots.id) AS lot_count
            FROM contract_lots
            GROUP BY contract_lots.contract_id
        ) lot_stats ON lot_stats.contract_id = contracts.id
        LEFT JOIN (
            SELECT contract_id,
                   COUNT(DISTINCT supplier_id) AS supplier_count
            FROM lot_supplier_prices
            GROUP BY contract_id
        ) supplier_stats ON supplier_stats.contract_id = contracts.id
        ORDER BY contracts.signed_date DESC, contracts.id DESC
        """,
    )


def get_contract_lots(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT contract_lots.*, contracts.name AS contract_name, contracts.code AS contract_code,
               COALESCE(award_stats.supplier_count, 0) AS supplier_count,
               COALESCE(price_stats.price_item_count, 0) AS price_item_count
        FROM contract_lots
        JOIN contracts ON contracts.id = contract_lots.contract_id
        LEFT JOIN (
            SELECT lot_id,
                   COUNT(id) AS price_item_count
            FROM lot_supplier_prices
            GROUP BY lot_id
        ) price_stats ON price_stats.lot_id = contract_lots.id
        LEFT JOIN (
            SELECT lot_id,
                   COUNT(DISTINCT supplier_id) AS supplier_count
            FROM lot_supplier_awards
            GROUP BY lot_id
        ) award_stats ON award_stats.lot_id = contract_lots.id
        ORDER BY contracts.signed_date DESC, contract_lots.id
        """,
    )


def get_lot_supplier_awards(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT lot_supplier_awards.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code,
               contract_lots.name AS lot_name, contract_lots.code AS lot_code,
               contracts.name AS contract_name, contracts.code AS contract_code,
               COALESCE(price_stats.price_item_count, 0) AS price_item_count
        FROM lot_supplier_awards
        JOIN suppliers ON suppliers.id = lot_supplier_awards.supplier_id
        LEFT JOIN contract_lots ON contract_lots.id = lot_supplier_awards.lot_id
        JOIN contracts ON contracts.id = lot_supplier_awards.contract_id
        LEFT JOIN (
            SELECT contract_id, COALESCE(lot_id, 0) AS lot_key, supplier_id, COUNT(id) AS price_item_count
            FROM lot_supplier_prices
            GROUP BY contract_id, COALESCE(lot_id, 0), supplier_id
        ) price_stats
          ON price_stats.contract_id = lot_supplier_awards.contract_id
         AND price_stats.lot_key = COALESCE(lot_supplier_awards.lot_id, 0)
         AND price_stats.supplier_id = lot_supplier_awards.supplier_id
        ORDER BY contracts.signed_date DESC, COALESCE(contract_lots.id, 0), suppliers.name
        """,
    )


def get_lot_supplier_prices(conn: sqlite3.Connection) -> list[dict]:
    return query_all(
        conn,
        """
        SELECT lot_supplier_prices.*, suppliers.name AS supplier_name, suppliers.code AS supplier_code,
               contract_lots.name AS lot_name, contract_lots.code AS lot_code,
               contracts.name AS contract_name, contracts.code AS contract_code,
               CASE
                   WHEN lot_supplier_prices.lot_id IS NULL THEN '合同'
                   ELSE '标段'
               END AS subject_type,
               CASE
                   WHEN lot_supplier_prices.lot_id IS NULL THEN contracts.name
                   ELSE contract_lots.name
               END AS subject_name,
               CASE
                   WHEN lot_supplier_prices.lot_id IS NULL THEN contracts.code
                   ELSE contract_lots.code
               END AS subject_code
        FROM lot_supplier_prices
        JOIN suppliers ON suppliers.id = lot_supplier_prices.supplier_id
        LEFT JOIN contract_lots ON contract_lots.id = lot_supplier_prices.lot_id
        JOIN contracts ON contracts.id = COALESCE(lot_supplier_prices.contract_id, contract_lots.contract_id)
        ORDER BY contracts.signed_date DESC, COALESCE(contract_lots.id, 0), suppliers.id, lot_supplier_prices.id
        """,
    )


def validate_supplier_payload(payload: dict) -> None:
    phone = (payload.get("phone") or "").strip()
    email = (payload.get("email") or "").strip()
    credit_code = (payload.get("credit_code") or "").strip()
    if credit_code and not re.fullmatch(r"[0-9A-Z]{15,18}", credit_code):
        raise ValueError("统一社会信用代码格式应为 15-18 位数字或大写字母")
    if phone and not re.fullmatch(r"[\d\-+() ]{7,20}", phone):
        raise ValueError("供应商联系电话格式不正确")
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("供应商邮箱格式不正确")


def validate_contract_payload(payload: dict) -> None:
    if not payload.get("name"):
        raise ValueError("请填写合同/协议名称")
    if not payload.get("code"):
        raise ValueError("请填写合同/协议编号")
    if not payload.get("effective_from") or not payload.get("effective_to"):
        raise ValueError("合同/协议必须维护有效期开始和结束日期")
    if payload.get("effective_from") and payload.get("effective_to") and payload["effective_from"] > payload["effective_to"]:
        raise ValueError("合同/协议有效期开始日期不能晚于结束日期")
    if payload.get("duration_months") not in (None, "") and int(payload.get("duration_months")) < 0:
        raise ValueError("合同/协议时长不能为负数")
    if payload.get("total_amount") not in (None, "") and float(payload.get("total_amount")) < 0:
        raise ValueError("合同/协议总额不能为负数")


def validate_contract_lot_payload(payload: dict) -> None:
    if not payload.get("contract_id"):
        raise ValueError("标段必须选择合同/协议")
    if not payload.get("name"):
        raise ValueError("请填写标段名称")
    if not payload.get("code"):
        raise ValueError("请填写标段编号")
    if not payload.get("effective_from") or not payload.get("effective_to"):
        raise ValueError("标段必须维护有效期开始和结束日期")
    if payload.get("effective_from") and payload.get("effective_to") and payload["effective_from"] > payload["effective_to"]:
        raise ValueError("标段有效期开始日期不能晚于结束日期")
    if payload.get("budget_amount") not in (None, "") and float(payload.get("budget_amount")) < 0:
        raise ValueError("标段预算不能为负数")


def normalize_lot_supplier_award_payload(conn: sqlite3.Connection, payload: dict) -> dict:
    result = dict(payload)
    if result.get("lot_id") == "":
        result["lot_id"] = None
    if result.get("contract_id") == "":
        result["contract_id"] = None
    if result.get("lot_id"):
        lot = conn.execute("SELECT contract_id, effective_from, effective_to FROM contract_lots WHERE id = ?", [result["lot_id"]]).fetchone()
        if not lot:
            raise ValueError("标段不存在")
        result["contract_id"] = lot["contract_id"]
        scope_from, scope_to = lot["effective_from"], lot["effective_to"]
    elif result.get("contract_id"):
        contract = conn.execute("SELECT id, effective_from, effective_to FROM contracts WHERE id = ?", [result["contract_id"]]).fetchone()
        if not contract:
            raise ValueError("合同/协议不存在")
        scope_from, scope_to = contract["effective_from"], contract["effective_to"]
    else:
        scope_from, scope_to = None, None
    if result.get("effective_from") and scope_from and result["effective_from"] < scope_from:
        raise ValueError("入围有效期不能早于所属合同/标段有效期")
    if result.get("effective_to") and scope_to and result["effective_to"] > scope_to:
        raise ValueError("入围有效期不能晚于所属合同/标段有效期")
    return result


def validate_lot_supplier_award_payload(payload: dict) -> None:
    if not payload.get("contract_id") and not payload.get("lot_id"):
        raise ValueError("入围供应商必须选择合同/协议或标段")
    if not payload.get("supplier_id"):
        raise ValueError("入围供应商必须选择供应商")
    if not payload.get("effective_from") or not payload.get("effective_to"):
        raise ValueError("入围供应商必须维护有效期开始和结束日期")
    if payload.get("effective_from") and payload.get("effective_to") and payload["effective_from"] > payload["effective_to"]:
        raise ValueError("入围有效期开始日期不能晚于结束日期")


def assert_unique_lot_supplier_award(conn: sqlite3.Connection, payload: dict, row_id: int | None = None) -> None:
    duplicate = conn.execute(
        """
        SELECT id
        FROM lot_supplier_awards
        WHERE (? IS NULL OR id <> ?)
          AND contract_id = ?
          AND COALESCE(lot_id, 0) = COALESCE(?, 0)
          AND supplier_id = ?
        LIMIT 1
        """,
        [row_id, row_id, payload.get("contract_id"), payload.get("lot_id"), payload.get("supplier_id")],
    ).fetchone()
    if duplicate:
        raise ValueError("该供应商已在当前合同/标段入围")


def validate_lot_supplier_price_payload(payload: dict) -> None:
    if not payload.get("contract_id") and not payload.get("lot_id"):
        raise ValueError("价格体系必须选择合同/协议或标段")
    if not payload.get("supplier_id"):
        raise ValueError("价格体系必须选择供应商")
    if not payload.get("personnel_type"):
        raise ValueError("请填写人员类型")
    if not payload.get("personnel_level"):
        raise ValueError("请填写人员级别")
    if not payload.get("effective_from") or not payload.get("effective_to"):
        raise ValueError("入围供应商价格必须维护生效日期和失效日期")
    if payload.get("effective_from") and payload.get("effective_to") and payload["effective_from"] > payload["effective_to"]:
        raise ValueError("价格有效期开始日期不能晚于结束日期")
    if payload.get("unit_price") not in (None, "") and float(payload.get("unit_price")) < 0:
        raise ValueError("单价不能为负数")
    if payload.get("tax_rate") not in (None, "") and float(payload.get("tax_rate")) < 0:
        raise ValueError("税率不能为负数")


def normalize_lot_supplier_price_payload(conn: sqlite3.Connection, payload: dict) -> dict:
    result = dict(payload)
    if result.get("lot_id") == "":
        result["lot_id"] = None
    if result.get("contract_id") == "":
        result["contract_id"] = None
    if result.get("lot_id"):
        lot = conn.execute("SELECT contract_id, effective_from, effective_to FROM contract_lots WHERE id = ?", [result["lot_id"]]).fetchone()
        if not lot:
            raise ValueError("标段不存在")
        result["contract_id"] = lot["contract_id"]
        scope_from, scope_to = lot["effective_from"], lot["effective_to"]
    elif result.get("contract_id"):
        contract = conn.execute("SELECT id, effective_from, effective_to FROM contracts WHERE id = ?", [result["contract_id"]]).fetchone()
        if not contract:
            raise ValueError("合同/协议不存在")
        scope_from, scope_to = contract["effective_from"], contract["effective_to"]
    else:
        scope_from, scope_to = None, None
    if result.get("effective_from") and scope_from and result["effective_from"] < scope_from:
        raise ValueError("价格生效日期不能早于所属合同/标段有效期")
    if result.get("effective_to") and scope_to and result["effective_to"] > scope_to:
        raise ValueError("价格失效日期不能晚于所属合同/标段有效期")
    if not result.get("price_item") and (result.get("personnel_type") or result.get("personnel_level")):
        result["price_item"] = f"{result.get('personnel_type', '')}-{result.get('personnel_level', '')}".strip("-")
    return result


def assert_no_overlapping_price(conn: sqlite3.Connection, payload: dict, row_id: int | None = None) -> None:
    if (payload.get("status") or "有效") != "有效":
        return
    overlap = conn.execute(
        """
        SELECT id
        FROM lot_supplier_prices
        WHERE (? IS NULL OR id <> ?)
          AND contract_id = ?
          AND COALESCE(lot_id, 0) = COALESCE(?, 0)
          AND supplier_id = ?
          AND personnel_type = ?
          AND personnel_level = ?
          AND price_unit = ?
          AND status = '有效'
          AND ? <= effective_to
          AND ? >= effective_from
        LIMIT 1
        """,
        [
            row_id,
            row_id,
            payload.get("contract_id"),
            payload.get("lot_id"),
            payload.get("supplier_id"),
            payload.get("personnel_type"),
            payload.get("personnel_level"),
            payload.get("price_unit"),
            payload.get("effective_from"),
            payload.get("effective_to"),
        ],
    ).fetchone()
    if overlap:
        raise ValueError("同一标段、供应商、人员类型、级别和计价单位下存在有效期重叠的价格")


def create_supplier(conn: sqlite3.Connection, payload: dict) -> dict:
    validate_supplier_payload(payload)
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM suppliers").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO suppliers (code, name, credit_code, type, contact_name, phone, email, status, effective_from, effective_to, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("code") or f"SUP-{int(next_id):03d}",
            payload.get("name", "新供应商"),
            payload.get("credit_code", ""),
            payload.get("type", "第三方人力"),
            payload.get("contact_name", ""),
            payload.get("phone", ""),
            payload.get("email", ""),
            payload.get("status", "合作中"),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("remark", ""),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM suppliers WHERE id = ?", [cursor.lastrowid]).fetchone()


def create_contract(conn: sqlite3.Connection, payload: dict) -> dict:
    validate_contract_payload(payload)
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM contracts").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO contracts (
            code, name, contract_attribute, contract_type, signing_subject, counterparty_name,
            signed_date, duration_months, total_amount, currency, tax_included, payment_terms,
            owner_department, status, effective_from, effective_to, remark
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("code") or f"CON-{int(next_id):03d}",
            payload.get("name", "新合同/协议"),
            payload.get("contract_attribute", "框架"),
            payload.get("contract_type", "服务采购"),
            payload.get("signing_subject", ""),
            payload.get("counterparty_name", ""),
            payload.get("signed_date", ""),
            payload.get("duration_months") or 12,
            payload.get("total_amount") or 0,
            payload.get("currency", "CNY"),
            payload.get("tax_included", "含税"),
            payload.get("payment_terms", ""),
            payload.get("owner_department", ""),
            payload.get("status", "履行中"),
            payload.get("effective_from") or payload.get("signed_date") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("remark", ""),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM contracts WHERE id = ?", [cursor.lastrowid]).fetchone()


def create_contract_lot(conn: sqlite3.Connection, payload: dict) -> dict:
    validate_contract_lot_payload(payload)
    contract = conn.execute("SELECT effective_from, effective_to FROM contracts WHERE id = ?", [payload.get("contract_id")]).fetchone()
    if contract:
        if payload.get("effective_from") < contract["effective_from"] or payload.get("effective_to") > contract["effective_to"]:
            raise ValueError("标段有效期不能超过合同/协议有效期")
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM contract_lots").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO contract_lots (contract_id, code, name, lot_type, service_scope, effective_from, effective_to, budget_amount, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("contract_id"),
            payload.get("code") or f"LOT-{int(next_id):03d}",
            payload.get("name", "新标段"),
            payload.get("lot_type", "服务标段"),
            payload.get("service_scope", ""),
            payload.get("effective_from", contract["effective_from"] if contract else ""),
            payload.get("effective_to", contract["effective_to"] if contract else ""),
            payload.get("budget_amount") or 0,
            payload.get("status", "启用"),
            payload.get("remark", ""),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM contract_lots WHERE id = ?", [cursor.lastrowid]).fetchone()


def create_lot_supplier_award(conn: sqlite3.Connection, payload: dict) -> dict:
    payload = normalize_lot_supplier_award_payload(conn, payload)
    validate_lot_supplier_award_payload(payload)
    assert_unique_lot_supplier_award(conn, payload)
    cursor = conn.execute(
        """
        INSERT INTO lot_supplier_awards
          (contract_id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name, effective_from, effective_to, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("contract_id"),
            payload.get("lot_id"),
            payload.get("supplier_id"),
            payload.get("shortlist_status", "已入围"),
            payload.get("agreement_code", ""),
            payload.get("agreement_name", ""),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("status", "有效"),
            payload.get("remark", ""),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM lot_supplier_awards WHERE id = ?", [cursor.lastrowid]).fetchone()


def create_lot_supplier_price(conn: sqlite3.Connection, payload: dict) -> dict:
    payload = normalize_lot_supplier_price_payload(conn, payload)
    validate_lot_supplier_price_payload(payload)
    assert_no_overlapping_price(conn, payload)
    cursor = conn.execute(
        """
        INSERT INTO lot_supplier_prices
          (contract_id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name, personnel_type, personnel_level, price_item, price_unit, unit_price, tax_rate, effective_from, effective_to, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("contract_id"),
            payload.get("lot_id"),
            payload.get("supplier_id"),
            payload.get("shortlist_status", "已入围"),
            payload.get("agreement_code", ""),
            payload.get("agreement_name", ""),
            payload.get("personnel_type", "人员服务"),
            payload.get("personnel_level", ""),
            payload.get("price_item") or f"{payload.get('personnel_type', '人员服务')}-{payload.get('personnel_level', '')}".strip("-"),
            payload.get("price_unit", "人天"),
            payload.get("unit_price") or 0,
            payload.get("tax_rate") or 0,
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("status", "有效"),
            payload.get("remark", ""),
        ],
    )
    conn.execute(
        """
        INSERT INTO lot_supplier_awards
          (contract_id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name, effective_from, effective_to, status, remark)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, '有效', ''
        WHERE NOT EXISTS (
            SELECT 1
            FROM lot_supplier_awards
            WHERE contract_id = ?
              AND COALESCE(lot_id, 0) = COALESCE(?, 0)
              AND supplier_id = ?
        )
        """,
        [
            payload.get("contract_id"),
            payload.get("lot_id"),
            payload.get("supplier_id"),
            payload.get("shortlist_status", "已入围"),
            payload.get("agreement_code", ""),
            payload.get("agreement_name", ""),
            payload.get("effective_from") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("contract_id"),
            payload.get("lot_id"),
            payload.get("supplier_id"),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM lot_supplier_prices WHERE id = ?", [cursor.lastrowid]).fetchone()

def validate_supplier_agreement_payload(payload: dict) -> None:
    supplier_id = payload.get("supplier_id")
    agreement_type = payload.get("agreement_type") or ""
    personnel_rate_type = (payload.get("personnel_rate_type") or "").strip()
    duration_months = payload.get("duration_months")
    total_amount = payload.get("total_amount")
    unit_price = payload.get("unit_price")

    if not supplier_id:
        raise ValueError("协议/合同必须选择供应商")
    if not payload.get("name"):
        raise ValueError("请填写协议/合同名称")
    if duration_months not in (None, "") and int(duration_months) < 0:
        raise ValueError("协议时长不能为负数")
    if total_amount not in (None, "") and float(total_amount) < 0:
        raise ValueError("协议总额不能为负数")
    if unit_price not in (None, "") and float(unit_price) < 0:
        raise ValueError("人员单价不能为负数")
    if agreement_type == "人员框架协议" and not personnel_rate_type:
        raise ValueError("人员框架协议必须维护人员类型")
    if agreement_type == "人员框架协议" and not unit_price:
        raise ValueError("人员框架协议必须维护人员单价")

def create_supplier_agreement(conn: sqlite3.Connection, payload: dict) -> dict:
    validate_supplier_agreement_payload(payload)
    next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM supplier_agreements").fetchone()["next_id"]
    cursor = conn.execute(
        """
        INSERT INTO supplier_agreements (
            supplier_id, code, name, agreement_type, signed_date, duration_months, bid_section,
            total_amount, personnel_rate_type, price_unit, unit_price, status, effective_from, effective_to, remark
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            payload.get("supplier_id"),
            payload.get("code") or f"AGR-{int(next_id):03d}",
            payload.get("name", "新协议/合同"),
            payload.get("agreement_type", "框架协议"),
            payload.get("signed_date", ""),
            payload.get("duration_months") or 12,
            payload.get("bid_section", ""),
            payload.get("total_amount") or 0,
            payload.get("personnel_rate_type", ""),
            payload.get("price_unit", "人天"),
            payload.get("unit_price") or 0,
            payload.get("status", "履行中"),
            payload.get("effective_from") or payload.get("signed_date") or "2026-01-01",
            payload.get("effective_to") or "",
            payload.get("remark", ""),
        ],
    )
    conn.commit()
    return conn.execute("SELECT * FROM supplier_agreements WHERE id = ?", [cursor.lastrowid]).fetchone()

