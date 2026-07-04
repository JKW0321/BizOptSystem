from __future__ import annotations


ENTITIES = {
    "organization": {
        "name": "组织",
        "description": "部门、业务组、项目组等绩效和数据权限的归属主体。",
        "primary_table": "organizations",
        "key_fields": ["id", "code", "name", "type", "parent_id", "status", "effective_from", "effective_to"],
    },
    "person": {
        "name": "人员",
        "description": "自有、第三方、分公司人员，是工时、项目成本和用户账号的人员基础。",
        "primary_table": "persons",
        "key_fields": ["id", "employee_no", "real_name", "person_type", "org_id", "supplier_id", "status"],
    },
    "user": {
        "name": "用户",
        "description": "系统登录账号，通过角色和数据范围决定功能权限和可见数据。",
        "primary_table": "users",
        "key_fields": ["id", "username", "person_id", "role", "org_id", "status"],
    },
    "customer": {
        "name": "客户",
        "description": "商机和项目的客户主线。",
        "primary_table": "customers",
        "key_fields": ["id", "name", "industry", "owner_org_id", "owner_id"],
    },
    "opportunity": {
        "name": "商机",
        "description": "从线索到赢单转项目的全过程经营对象。",
        "primary_table": "opportunities",
        "key_fields": ["id", "customer_id", "stage", "owner_id", "expected_contract_amount", "project_id"],
    },
    "project": {
        "name": "项目",
        "description": "收入、成本、资金、工时和交付健康度的核心管理对象。",
        "primary_table": "projects",
        "key_fields": ["id", "code", "name", "customer_id", "org_id", "project_manager_id", "health", "progress"],
    },
    "contract": {
        "name": "合同/框架",
        "description": "人员外包框架和服务合同的主对象，下挂标段、供应商和价格体系。",
        "primary_table": "contracts",
        "key_fields": ["id", "code", "name", "contract_attribute", "contract_type", "effective_from", "effective_to"],
    },
    "contract_lot": {
        "name": "标段/服务包",
        "description": "合同下的服务包，是入围供应商和人员价格的主要承载对象。",
        "primary_table": "contract_lots",
        "key_fields": ["id", "contract_id", "code", "name", "lot_type", "effective_from", "effective_to"],
    },
    "supplier": {
        "name": "供应商",
        "description": "第三方人员、外包框架和价格体系的供应主体。",
        "primary_table": "suppliers",
        "key_fields": ["id", "code", "name", "type", "status"],
    },
    "timesheet": {
        "name": "项目工时",
        "description": "人员在项目上的周/月投入，是项目自有和外包成本归集基础。",
        "primary_table": "project_timesheets",
        "key_fields": ["id", "project_id", "person_id", "period_type", "period_start", "entry_mode"],
    },
    "fund_plan": {
        "name": "项目资金计划",
        "description": "项目经理半月填报、逐级审核的项目收支计划。",
        "primary_table": "project_fund_plans",
        "key_fields": ["id", "project_id", "month", "period_half", "plan_type", "status"],
    },
    "kpi": {
        "name": "KPI 指标",
        "description": "组织绩效中的指标主数据、年度目标、分解和完成值。",
        "primary_table": "performance_kpi_items",
        "key_fields": ["id", "cycle_year", "org_id", "kpi_code", "name", "version_no", "status"],
    },
}


RELATIONS = [
    {"from": "organization", "to": "organization", "type": "parent_child", "description": "组织上下级关系"},
    {"from": "user", "to": "person", "type": "login_identity", "description": "用户账号关联真实人员"},
    {"from": "person", "to": "organization", "type": "belongs_to", "description": "人员归属组织"},
    {"from": "person", "to": "supplier", "type": "third_party_source", "description": "第三方人员来源供应商"},
    {"from": "customer", "to": "opportunity", "type": "has_opportunity", "description": "客户下挂商机"},
    {"from": "opportunity", "to": "project", "type": "converted_to", "description": "赢单商机转项目"},
    {"from": "project", "to": "fund_plan", "type": "has_fund_plan", "description": "项目资金计划"},
    {"from": "project", "to": "timesheet", "type": "has_timesheet", "description": "项目工时归集"},
    {"from": "contract", "to": "contract_lot", "type": "contains", "description": "合同下挂标段"},
    {"from": "contract_lot", "to": "supplier", "type": "awards_supplier", "description": "标段入围供应商"},
    {"from": "organization", "to": "kpi", "type": "owns_target", "description": "组织承载绩效指标"},
]


def describe_entity(entity_key: str) -> dict:
    return ENTITIES[entity_key]


def ontology_snapshot() -> dict:
    return {"entities": ENTITIES, "relations": RELATIONS}

