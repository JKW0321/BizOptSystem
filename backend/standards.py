from __future__ import annotations


MODULE_GROUPS = {
    "operations": {
        "name": "经营驾驶舱",
        "modules": ["dashboard", "forecast", "dispatch"],
    },
    "business": {
        "name": "业务经营",
        "modules": ["customers", "opportunities", "projects", "funds", "timesheets"],
    },
    "resource": {
        "name": "资源管理",
        "modules": ["hr", "suppliers", "contracts"],
    },
    "performance": {
        "name": "组织绩效",
        "modules": ["kpi_library", "performance_plans", "org_targets", "performance_dashboard"],
    },
    "system": {
        "name": "系统管理",
        "modules": ["users", "roles", "permissions", "menus"],
    },
}


ENTITY_CATEGORIES = {
    "master_data": ["organizations", "persons", "customers", "suppliers", "contracts", "kpis"],
    "transaction": ["opportunities", "projects", "fund_plans", "fund_actuals", "timesheets"],
    "analysis": ["forecasts", "dispatch_actions", "performance_results"],
    "governance": ["users", "roles", "permissions", "data_scopes", "menu_items"],
}

