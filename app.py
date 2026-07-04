from __future__ import annotations

import json
import os
import sqlite3
import urllib.parse
from http import HTTPStatus
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

from backend.config import STATIC_DIR, today_iso
from backend.db import connect, update_row
from backend.modules.business.funds import create_fund_actual, create_fund_plan, get_project_funds, update_fund_plan
from backend.modules.business.pipeline import (
    convert_opportunity_to_project,
    get_customers,
    get_opportunities,
    get_projects,
    opportunity_visible_to_user,
    project_visible_to_user,
    validate_opportunity_payload,
    validate_project_payload,
)
from backend.modules.business.timesheets import create_timesheet, get_timesheets, timesheet_visible_to_user, update_timesheet
from backend.modules.operations.service import (
    dispatch_visible_to_user,
    forecast_visible_to_user,
    get_dashboard,
    get_dispatch_actions,
    get_forecasts,
)
from backend.modules.performance.service import (
    copy_performance_kpi_version,
    create_performance_kpi,
    get_kpi,
    get_performance,
    update_kpi_target,
    update_performance_kpi,
)
from backend.modules.resources.contracts import (
    assert_no_overlapping_price,
    assert_unique_lot_supplier_award,
    create_contract,
    create_contract_lot,
    create_lot_supplier_award,
    create_lot_supplier_price,
    create_supplier,
    create_supplier_agreement,
    get_contract_lots,
    get_contracts,
    get_lot_supplier_awards,
    get_lot_supplier_prices,
    get_suppliers,
    normalize_lot_supplier_award_payload,
    normalize_lot_supplier_price_payload,
    validate_contract_lot_payload,
    validate_contract_payload,
    validate_lot_supplier_award_payload,
    validate_lot_supplier_price_payload,
    validate_supplier_agreement_payload,
    validate_supplier_payload,
)
from backend.modules.resources.hr import (
    assert_valid_parent,
    create_organization,
    create_person,
    get_organizations,
    get_persons,
    validate_person_payload,
)
from backend.modules.system.governance import (
    create_user,
    get_control_panel,
    get_data_scopes,
    get_governance,
    get_permissions,
    get_roles,
    get_users,
    has_system_access,
    login_user,
    refresh_user_scope,
    user_context,
)
from backend.llm.gateway import llm_status
from backend.integrations.component_registry import component_registry_snapshot
from backend.ontology.schema import ontology_snapshot
from backend.security import has_permission, scope_kind


PERFORMANCE_TARGET_SEED = [
    (11, "company", None, "管理口径收入", 24000, "2026"),
    (12, "company", None, "分摊后毛利", 4200, "2026"),
    (13, "company", None, "商机储备金额", 6000, "2026"),
    (14, "org", 1, "管理口径收入", 24000, "2026"),
    (15, "org", 1, "分摊后毛利", 4200, "2026"),
    (16, "org", 1, "商机储备金额", 6000, "2026"),
    (17, "org", 2, "管理口径收入", 14000, "2026"),
    (18, "org", 2, "分摊后毛利", 1800, "2026"),
    (19, "org", 2, "商机储备金额", 3200, "2026"),
    (20, "org", 3, "管理口径收入", 7000, "2026"),
    (21, "org", 3, "分摊后毛利", 1900, "2026"),
    (22, "org", 3, "商机储备金额", 2200, "2026"),
    (23, "org", 4, "管理口径收入", 3000, "2026"),
    (24, "org", 4, "分摊后毛利", 500, "2026"),
    (25, "org", 4, "商机储备金额", 600, "2026"),
    (26, "company", None, "管理口径收入", 7200, "2026-Q3"),
    (27, "company", None, "分摊后毛利", 1260, "2026-Q3"),
    (28, "company", None, "商机储备金额", 3600, "2026-Q3"),
    (29, "org", 1, "管理口径收入", 7200, "2026-Q3"),
    (30, "org", 1, "分摊后毛利", 1260, "2026-Q3"),
    (31, "org", 1, "商机储备金额", 3600, "2026-Q3"),
    (32, "org", 2, "管理口径收入", 4200, "2026-Q3"),
    (33, "org", 2, "分摊后毛利", 540, "2026-Q3"),
    (34, "org", 2, "商机储备金额", 1900, "2026-Q3"),
    (35, "org", 3, "管理口径收入", 2100, "2026-Q3"),
    (36, "org", 3, "分摊后毛利", 570, "2026-Q3"),
    (37, "org", 3, "商机储备金额", 1300, "2026-Q3"),
    (38, "org", 4, "管理口径收入", 900, "2026-Q3"),
    (39, "org", 4, "分摊后毛利", 150, "2026-Q3"),
    (40, "org", 4, "商机储备金额", 400, "2026-Q3"),
    (41, "company", None, "商机储备金额", 2700, "2026-07"),
    (42, "org", 1, "管理口径收入", 4200, "2026-07"),
    (43, "org", 1, "分摊后毛利", 780, "2026-07"),
    (44, "org", 1, "商机储备金额", 2700, "2026-07"),
    (45, "org", 4, "商机储备金额", 0, "2026-07"),
    (46, "org", 1, "管理口径收入", 4800, "2026-Q1"),
    (47, "org", 2, "管理口径收入", 2800, "2026-Q1"),
    (48, "org", 3, "管理口径收入", 1400, "2026-Q1"),
    (49, "org", 4, "管理口径收入", 600, "2026-Q1"),
    (50, "org", 1, "分摊后毛利", 840, "2026-Q1"),
    (51, "org", 2, "分摊后毛利", 360, "2026-Q1"),
    (52, "org", 3, "分摊后毛利", 380, "2026-Q1"),
    (53, "org", 4, "分摊后毛利", 100, "2026-Q1"),
    (54, "org", 1, "商机储备金额", 800, "2026-Q1"),
    (55, "org", 2, "商机储备金额", 500, "2026-Q1"),
    (56, "org", 3, "商机储备金额", 300, "2026-Q1"),
    (57, "org", 4, "商机储备金额", 0, "2026-Q1"),
    (58, "org", 1, "管理口径收入", 6000, "2026-Q2"),
    (59, "org", 2, "管理口径收入", 3500, "2026-Q2"),
    (60, "org", 3, "管理口径收入", 1750, "2026-Q2"),
    (61, "org", 4, "管理口径收入", 750, "2026-Q2"),
    (62, "org", 1, "分摊后毛利", 1050, "2026-Q2"),
    (63, "org", 2, "分摊后毛利", 450, "2026-Q2"),
    (64, "org", 3, "分摊后毛利", 475, "2026-Q2"),
    (65, "org", 4, "分摊后毛利", 125, "2026-Q2"),
    (66, "org", 1, "商机储备金额", 1600, "2026-Q2"),
    (67, "org", 2, "商机储备金额", 800, "2026-Q2"),
    (68, "org", 3, "商机储备金额", 600, "2026-Q2"),
    (69, "org", 4, "商机储备金额", 200, "2026-Q2"),
    (70, "org", 1, "管理口径收入", 6000, "2026-Q4"),
    (71, "org", 2, "管理口径收入", 3500, "2026-Q4"),
    (72, "org", 3, "管理口径收入", 1750, "2026-Q4"),
    (73, "org", 4, "管理口径收入", 750, "2026-Q4"),
    (74, "org", 1, "分摊后毛利", 1050, "2026-Q4"),
    (75, "org", 2, "分摊后毛利", 450, "2026-Q4"),
    (76, "org", 3, "分摊后毛利", 475, "2026-Q4"),
    (77, "org", 4, "分摊后毛利", 125, "2026-Q4"),
    (78, "org", 1, "商机储备金额", 0, "2026-Q4"),
    (79, "org", 2, "商机储备金额", 0, "2026-Q4"),
    (80, "org", 3, "商机储备金额", 0, "2026-Q4"),
    (81, "org", 4, "商机储备金额", 0, "2026-Q4"),
]

PERFORMANCE_KPI_ITEM_SEED = [
    (101, "2026", 1, None, "价值创造类", "主营业务收入", "管理口径主营业务收入（含事业部间项目协同收入但不双计，不含核心攻关、招拍挂等科创项目收入）", "20,400万元", 20400, "万元", "20", "完成目标得基本分，未完成按阶梯式计分：95%以上每低1%扣0.5分，85%-95%每低1%扣1分，低于85%不得分。", "财务报表", "市场经营部", "定量", "严格汇总", "按季度", "revenue", "已定义"),
    (102, "2026", 1, None, "价值创造类", "毛利总额", "分摊后毛利", "7,850万元", 7850, "万元", "15", "完成基准目标得基本分；超额贡献按规则加分；未完成按阶梯式线性扣分。", "财务报表", "财务部", "定量", "严格汇总", "按季度", "gross_profit", "已定义"),
    (103, "2026", 1, None, "价值创造类", "营业收现率", "营业收现率=经营现金流入÷营业收入", "不低于2025年完成值（106.27%）", None, "%", "5", "完成目标得基本分，未完成按照阶梯式线性扣分。", "财务报表、关联交易报表、报账明细表", "财务部、市场经营部", "定量", "不分解", "不拆分", "cash_ratio", "已定义"),
    (104, "2026", 1, None, "价值创造类", "全员劳动生产率", "人均创利=（人工成本+利润总额）/从业人数", "同比提升5%", None, "%", "5", "完成目标得基本分；未完成按实际值/目标值比例计分。", "财务报表、人力报表", "党委组织部、财务部", "定量", "不分解", "不拆分", "productivity", "已定义"),
    (105, "2026", 1, None, "价值创造类", "重点业务可持续业务收入-ERP业务外部客户收入", "ERP业务（含人力、财务、供应链）外部客户项目贡献的主营收入（披露口径）", "13,500万元", 13500, "万元", "7", "完成目标得基本分，未完成按阶梯式计分。", "数智系统", "市场经营部", "定量", "共担双计", "按季度", "external_revenue", "已定义"),
    (106, "2026", 1, None, "价值创造类", "重点产品规模化推广", "主推及培育产品打造", "潜力亿元级产品1个（同舟-ERP）；主营收入5000万元；自研产品主营收入16,400万元", 5000, "万元", "7", "定量部分完成得基本分，未完成按线性计分；定性部分综合评价。", "财务报表", "产品与研发管理部", "混合", "共担双计", "按节点", "product_scale", "已定义"),
    (107, "2026", 1, None, "价值创造类", "重点领域能力提升", "ERP能力提升、供应链能力提升", "ERP标准化产品版本、招投标智能体、签约金额、标杆客户等任务", None, "项", "12", "根据能力提升任务和研发效能任务完成情况综合评分。", "系统截图、中标通知书、合同系统", "产品与研发管理部", "定性", "任务分派", "按节点", "capability", "已定义"),
    (108, "2026", 1, None, "风险防控类", "人工成本利润率", "利润总额/人工成本", "不低于2025年实际完成值", None, "%", "扣分项", "完成目标不扣分，未完成每低1%扣1分。", "财务报表、人力报表", "党委组织部、财务部", "扣分项", "不分解", "不拆分", "labor_profit", "已定义"),
    (201, "2026", 2, 101, "经营指标", "主营业务收入", "管理口径主营业务收入", "9000万", 9000, "万元", "25", "完成目标得基本分，未完成按阶梯式计分。", "财务报表", "市场经营部", "定量", "严格汇总", "按季度", "revenue", "已定义"),
    (202, "2026", 2, 102, "经营指标", "毛利", "分摊后毛利", "2100万", 2100, "万元", "15", "完成基准目标得基本分；超额贡献加分；未完成阶梯式扣分。", "财务报表", "财务部", "定量", "严格汇总", "按季度", "gross_profit", "已定义"),
    (203, "2026", 2, 105, "关键工作", "重点业务可持续业务收入-ERP业务外部客户收入", "ERP业务（供应链）外部客户项目贡献的主营收入（披露口径）", "8000万元", 8000, "万元", "5", "完成目标得基本分，未完成按阶梯式计分。", "数智系统", "市场经营部", "定量", "共担双计", "按季度", "external_revenue", "已定义"),
    (204, "2026", 2, 107, "能力建设", "重点领域能力提升", "供应链能力提升", "推出招标智能体与投标智能体产品；企业数智化累计签约金额达0.3亿元", None, "项", "4", "根据能力提升任务实际完成情况综合评分。", "系统截图、方案材料", "产品与研发管理部", "定性", "任务分派", "按节点", "capability", "已定义"),
    (301, "2026", 3, 101, "经营指标", "主营业务收入", "管理口径主营业务收入", "3500万", 3500, "万元", "20", "完成目标得基本分，未完成按阶梯式计分。", "财务报表", "市场经营部", "定量", "严格汇总", "按季度", "revenue", "已定义"),
    (302, "2026", 3, 102, "经营指标", "毛利", "分摊后毛利", "1200万", 1200, "万元", "15", "完成基准目标得基本分；超额贡献加分；未完成阶梯式扣分。", "财务报表", "财务部", "定量", "严格汇总", "按季度", "gross_profit", "已定义"),
    (303, "2026", 3, 105, "关键工作", "重点业务可持续业务收入-ERP业务外部客户收入", "ERP业务外部客户项目贡献的主营收入（披露口径）", "4000万（其它业务组承担交付的在交付组进行双计）", 4000, "万元", "4", "完成目标得基本分，未完成按阶梯式计分。", "数智系统", "市场经营部", "定量", "共担双计", "按季度", "external_revenue", "已定义"),
    (304, "2026", 3, 107, "能力建设", "ERP财务核心交付能力体系构建", "面向中煤等外部客户构建交付生态", "形成ERP可靠交付团队不少于200人，能够支撑外部大型项目交付", None, "项", "6", "完成得分，未完成根据完成情况扣分。", "交付材料", "产品与研发管理部", "定性", "任务分派", "按节点", "capability", "已定义"),
    (401, "2026", 4, 101, "经营指标", "主营业务收入", "管理口径主营业务收入", "6500万", 6500, "万元", "20", "完成目标得基本分，未完成按阶梯式计分。", "财务报表", "市场经营部", "定量", "严格汇总", "按季度", "revenue", "已定义"),
    (402, "2026", 4, 102, "经营指标", "毛利", "分摊后毛利", "3200万", 3200, "万元", "15", "完成基准目标得基本分；超额贡献加分；未完成阶梯式扣分。", "财务报表", "财务部", "定量", "严格汇总", "按季度", "gross_profit", "已定义"),
    (403, "2026", 4, 105, "关键工作", "重点业务可持续业务收入-ERP业务外部客户收入", "ERP业务（财务）外部客户项目贡献的主营收入（披露口径）", "3500", 3500, "万元", "3", "完成目标得基本分，未完成按阶梯式计分。", "数智系统", "市场经营部", "定量", "共担双计", "按季度", "external_revenue", "已定义"),
    (404, "2026", 4, 106, "关键工作", "重点产品规模化推广", "主推及培育产品打造", "潜力亿元级产品1个（同舟-ERP）；主营收入2500万元；自研产品主营收入6500万元", 2500, "万元", "3", "定量部分完成得基本分，未完成按线性计分；定性部分综合评价。", "财务报表", "产品与研发管理部", "混合", "共担双计", "按节点", "product_scale", "已定义"),
    (501, "2026", 5, 105, "关键工作", "重点业务可持续业务收入-ERP业务外部客户收入", "ERP业务（人力）外部客户项目贡献的主营收入（披露口径）", "2000万元", 2000, "万元", "4", "完成目标得基本分，未完成按阶梯式计分。", "数智系统", "市场经营部", "定量", "共担双计", "按季度", "external_revenue", "已定义"),
    (502, "2026", 5, 106, "关键工作", "重点产品规模化推广", "主推及培育产品打造", "人力主营收入3000万元；自研产品主营收入3000万元", 3000, "万元", "4", "定量部分完成得基本分，未完成按线性计分；定性部分综合评价。", "财务报表", "产品与研发管理部", "混合", "共担双计", "按节点", "product_scale", "已定义"),
    (503, "2026", 5, 107, "能力建设", "重点领域能力提升", "ERP人力能力提升", "推出ERP人力标准化产品版本；同舟ERP在外部市场取得突破", None, "项", "4", "根据能力提升任务实际完成情况综合评分。", "系统截图、方案材料", "产品与研发管理部", "定性", "任务分派", "按节点", "capability", "已定义"),
]

PERFORMANCE_PERIOD_TARGET_SEED = [
    (1, 101, "2026-Q2", "上半年目标", 10200, 5783, "执行中"),
    (2, 102, "2026-Q2", "上半年目标", 3925, 1267, "执行中"),
    (3, 105, "2026-Q2", "上半年目标", 6750, 3000, "执行中"),
    (4, 201, "2026-Q2", "4500", 4500, 1790, "执行中"),
    (5, 202, "2026-Q2", "1050", 1050, 235, "执行中"),
    (6, 203, "2026-Q2", "4000", 4000, 1500, "执行中"),
    (7, 301, "2026-Q2", "=3500/2", 1750, 680, "执行中"),
    (8, 302, "2026-Q2", "=1200/2", 600, 400, "执行中"),
    (9, 303, "2026-Q2", "时序目标", 2000, 1200, "执行中"),
    (10, 401, "2026-Q2", "3250", 3250, 0, "未开始"),
    (11, 402, "2026-Q2", "1600", 1600, 0, "未开始"),
    (12, 403, "2026-Q2", "1750", 1750, 300, "执行中"),
    (13, 501, "2026-Q2", "1000", 1000, 0, "未开始"),
]


SCHEMA = """
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parent_id INTEGER,
  owner_id INTEGER,
  short_name TEXT DEFAULT '',
  leader_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT '启用',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  remark TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS roles (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  data_scope TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_code TEXT NOT NULL,
  permission_code TEXT NOT NULL,
  PRIMARY KEY (role_code, permission_code),
  FOREIGN KEY (role_code) REFERENCES roles(code),
  FOREIGN KEY (permission_code) REFERENCES permissions(code)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS persons (
  id INTEGER PRIMARY KEY,
  employee_no TEXT DEFAULT '',
  real_name TEXT NOT NULL,
  photo_url TEXT DEFAULT '',
  id_card TEXT DEFAULT '',
  person_type TEXT NOT NULL DEFAULT '合同制',
  branch_company TEXT DEFAULT '',
  supplier_id INTEGER,
  outsourcing_contract_id INTEGER,
  outsourcing_lot_id INTEGER,
  outsourcing_award_id INTEGER,
  outsourcing_price_id INTEGER,
  org_id INTEGER,
  position TEXT DEFAULT '',
  email TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '在职',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (outsourcing_contract_id) REFERENCES contracts(id),
  FOREIGN KEY (outsourcing_lot_id) REFERENCES contract_lots(id),
  FOREIGN KEY (outsourcing_award_id) REFERENCES lot_supplier_awards(id),
  FOREIGN KEY (outsourcing_price_id) REFERENCES lot_supplier_prices(id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  credit_code TEXT DEFAULT '',
  type TEXT DEFAULT '第三方人力',
  contact_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '合作中',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  remark TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS supplier_agreements (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  agreement_type TEXT NOT NULL DEFAULT '框架协议',
  signed_date TEXT DEFAULT '',
  duration_months INTEGER DEFAULT 12,
  bid_section TEXT DEFAULT '',
  total_amount REAL DEFAULT 0,
  personnel_rate_type TEXT DEFAULT '',
  price_unit TEXT DEFAULT '人天',
  unit_price REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '履行中',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  contract_attribute TEXT NOT NULL DEFAULT '框架',
  contract_type TEXT NOT NULL DEFAULT '人员外包',
  signing_subject TEXT DEFAULT '',
  counterparty_name TEXT DEFAULT '',
  signed_date TEXT DEFAULT '',
  duration_months INTEGER DEFAULT 12,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'CNY',
  tax_included TEXT DEFAULT '含税',
  payment_terms TEXT DEFAULT '',
  owner_department TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '履行中',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  remark TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS contract_lots (
  id INTEGER PRIMARY KEY,
  contract_id INTEGER NOT NULL,
  code TEXT DEFAULT '',
  name TEXT NOT NULL,
  lot_type TEXT DEFAULT '服务标段',
  service_scope TEXT DEFAULT '',
  effective_from TEXT DEFAULT '',
  effective_to TEXT DEFAULT '',
  budget_amount REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '启用',
  remark TEXT DEFAULT '',
  FOREIGN KEY (contract_id) REFERENCES contracts(id)
);

CREATE TABLE IF NOT EXISTS lot_supplier_awards (
  id INTEGER PRIMARY KEY,
  contract_id INTEGER NOT NULL,
  lot_id INTEGER,
  supplier_id INTEGER NOT NULL,
  shortlist_status TEXT NOT NULL DEFAULT '已入围',
  agreement_code TEXT DEFAULT '',
  agreement_name TEXT DEFAULT '',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '有效',
  remark TEXT DEFAULT '',
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS lot_supplier_prices (
  id INTEGER PRIMARY KEY,
  contract_id INTEGER,
  lot_id INTEGER,
  supplier_id INTEGER NOT NULL,
  shortlist_status TEXT NOT NULL DEFAULT '已入围',
  agreement_code TEXT DEFAULT '',
  agreement_name TEXT DEFAULT '',
  personnel_type TEXT DEFAULT '人员服务',
  personnel_level TEXT DEFAULT '',
  price_item TEXT NOT NULL DEFAULT '',
  price_unit TEXT DEFAULT '人天',
  unit_price REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '有效',
  remark TEXT DEFAULT '',
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '123456',
  person_id INTEGER,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  org_id INTEGER,
  status TEXT NOT NULL DEFAULT '启用',
  email TEXT DEFAULT '',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS data_scopes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  scope_type TEXT NOT NULL,
  scope_id INTEGER,
  permission_level TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  region TEXT NOT NULL,
  level TEXT NOT NULL,
  owner_org_id INTEGER NOT NULL,
  FOREIGN KEY (owner_org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  stage TEXT NOT NULL,
  probability REAL NOT NULL,
  expected_contract_amount REAL NOT NULL,
  expected_revenue REAL NOT NULL,
  expected_gross_profit REAL NOT NULL,
  expected_sign_month TEXT NOT NULL,
  next_action TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  opportunity_id INTEGER,
  project_manager_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  phase TEXT NOT NULL,
  progress INTEGER NOT NULL,
  health TEXT NOT NULL,
  planned_end TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
  FOREIGN KEY (project_manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_actuals (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  revenue REAL NOT NULL,
  cost REAL NOT NULL,
  gross_profit REAL NOT NULL,
  cash_in REAL NOT NULL,
  receivable REAL NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_forecasts (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  forecast_revenue REAL NOT NULL,
  forecast_cost REAL NOT NULL,
  forecast_gross_profit REAL NOT NULL,
  forecast_cash_in REAL NOT NULL,
  resource_gap TEXT NOT NULL,
  risk_note TEXT NOT NULL,
  review_status TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_timesheets (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  person_id INTEGER NOT NULL,
  period_type TEXT NOT NULL DEFAULT '周',
  period_start TEXT NOT NULL,
  period_label TEXT DEFAULT '',
  entry_mode TEXT NOT NULL DEFAULT '比例',
  allocation_ratio REAL DEFAULT 0,
  work_hours REAL DEFAULT 0,
  work_content TEXT DEFAULT '',
  contract_id INTEGER,
  lot_id INTEGER,
  award_id INTEGER,
  price_id INTEGER,
  standard_price_unit TEXT DEFAULT '',
  standard_unit_price REAL DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '草稿',
  submitted_by INTEGER,
  submitted_at TEXT DEFAULT '',
  created_by INTEGER,
  updated_at TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (person_id) REFERENCES persons(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
  FOREIGN KEY (award_id) REFERENCES lot_supplier_awards(id),
  FOREIGN KEY (price_id) REFERENCES lot_supplier_prices(id)
);

CREATE TABLE IF NOT EXISTS project_fund_plans (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  period_half TEXT NOT NULL DEFAULT '上半月',
  plan_type TEXT NOT NULL DEFAULT '支出计划',
  planned_receipt REAL NOT NULL DEFAULT 0,
  planned_payment REAL NOT NULL DEFAULT 0,
  funding_gap REAL NOT NULL DEFAULT 0,
  plan_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '草稿',
  submitted_by INTEGER,
  submitted_at TEXT DEFAULT '',
  director_reviewed_by INTEGER,
  director_reviewed_at TEXT DEFAULT '',
  operations_confirmed_by INTEGER,
  operations_confirmed_at TEXT DEFAULT '',
  department_approved_by INTEGER,
  department_approved_at TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_fund_actuals (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  plan_id INTEGER,
  receivable_id INTEGER,
  occurred_date TEXT NOT NULL,
  direction TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  counterparty TEXT DEFAULT '',
  category TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  registered_by INTEGER,
  registered_at TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (plan_id) REFERENCES project_fund_plans(id)
);

CREATE TABLE IF NOT EXISTS project_receivables (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL,
  receivable_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  receivable_amount REAL NOT NULL DEFAULT 0,
  received_amount REAL NOT NULL DEFAULT 0,
  counterparty TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '未收',
  remark TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS project_fund_approvals (
  id INTEGER PRIMARY KEY,
  plan_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT DEFAULT '',
  to_status TEXT NOT NULL,
  operator_id INTEGER,
  operated_at TEXT NOT NULL,
  comment TEXT DEFAULT '',
  FOREIGN KEY (plan_id) REFERENCES project_fund_plans(id)
);

CREATE TABLE IF NOT EXISTS kpi_targets (
  id INTEGER PRIMARY KEY,
  owner_type TEXT NOT NULL,
  owner_id INTEGER,
  metric TEXT NOT NULL,
  target_value REAL NOT NULL,
  period TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_kpi_items (
  id INTEGER PRIMARY KEY,
  cycle_year TEXT NOT NULL,
  org_id INTEGER NOT NULL,
  parent_item_id INTEGER,
  kpi_code TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  definition TEXT DEFAULT '',
  target_text TEXT DEFAULT '',
  target_value REAL,
  unit TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  scoring_method TEXT DEFAULT '',
  data_source TEXT DEFAULT '',
  owner_department TEXT DEFAULT '',
  kpi_type TEXT NOT NULL DEFAULT '定量',
  decomposition_mode TEXT NOT NULL DEFAULT '严格汇总',
  quarterly_mode TEXT NOT NULL DEFAULT '按季度',
  metric_code TEXT DEFAULT '',
  version_no TEXT NOT NULL DEFAULT 'V1.0',
  version_status TEXT NOT NULL DEFAULT '已发布',
  is_locked INTEGER NOT NULL DEFAULT 1,
  version_note TEXT DEFAULT '',
  effective_from TEXT NOT NULL DEFAULT '2026-01-01',
  effective_to TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT '已定义',
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_item_id) REFERENCES performance_kpi_items(id)
);

CREATE TABLE IF NOT EXISTS performance_period_targets (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL,
  period TEXT NOT NULL,
  target_text TEXT DEFAULT '',
  target_value REAL,
  actual_value REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '未开始',
  FOREIGN KEY (item_id) REFERENCES performance_kpi_items(id)
);

CREATE TABLE IF NOT EXISTS dispatch_actions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  org_id INTEGER NOT NULL,
  project_id INTEGER,
  opportunity_id INTEGER,
  priority TEXT NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_note TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);
"""


SEED = {
    "organizations": [
        (1, "ORG-DS-001", "企业数智化事业部", "department", None, 1),
        (2, "ORG-SC-001", "供应链产品组", "business_group", 1, 3),
        (3, "ORG-ERP-001", "ERP核心产品组", "business_group", 1, 4),
        (4, "ORG-FIN-001", "财务线产品组", "business_group", 1, 2),
    ],
    "persons": [
        (1, "EMP-001", "吴总", "", "110101197801010011", "合同制", None, 1, "总经理", "wuzong@example.com", "13800000001"),
        (2, "EMP-002", "李静", "", "110101198602020022", "合同制", None, 1, "经营管理经理", "lijing@example.com", "13800000002"),
        (3, "EMP-003", "王晨", "", "110101198403030033", "合同制", None, 2, "供应链产品组总监", "wangchen@example.com", "13800000003"),
        (4, "EMP-004", "赵敏", "", "110101198704040044", "合同制", None, 3, "ERP核心产品组总监", "zhaomin@example.com", "13800000004"),
        (5, "EMP-005", "王国权", "", "110101199005050055", "合同制", None, 2, "项目经理", "wangguoquan@example.com", "13800000005"),
        (6, "EMP-006", "及宇豪", "", "110101199106060066", "第三方", 1, 2, "项目经理", "jiyuhao@example.com", "13800000006"),
        (7, "EMP-007", "张玉恰", "", "110101199207070077", "分公司", None, 3, "项目经理", "zhangyuqia@example.com", "13800000007"),
        (8, "EMP-008", "陈琳", "", "110101199308080088", "合同制", None, 2, "售前经理", "chenlin@example.com", "13800000008"),
        (9, "EMP-009", "周航", "", "110101199409090099", "第三方", 2, 3, "售前经理", "zhouhang@example.com", "13800000009"),
        (10, "EMP-010", "孙宁", "", "110101198510100010", "合同制", None, 1, "系统管理员", "sunning@example.com", "13800000010"),
    ],
    "suppliers": [
        (1, "SUP-001", "北京数智外包服务有限公司", "91110108MA001A0011", "第三方人力", "刘经理", "13810000001", "vendor-bj@example.com", "合作中", "2026-01-01", "", "外包实施与测试资源"),
        (2, "SUP-002", "上海企服科技有限公司", "91310115MA002B0022", "第三方人力", "陈经理", "13810000002", "vendor-sh@example.com", "合作中", "2026-01-01", "", "售前顾问与交付资源"),
        (3, "SUP-003", "华东分公司", "91330000MA003C0033", "分公司", "赵经理", "13810000003", "branch-hd@example.com", "合作中", "2026-01-01", "", "分公司协同交付"),
    ],
    "supplier_agreements": [
        (1, 1, "FW-2026-001", "2026年度外包实施测试人员框架", "人员框架协议", "2026-01-15", 12, "实施测试标段", 180.0, "高级实施顾问", "人天", 1500.0, "履行中", "2026-01-15", "", "外包实施与测试资源单价框架"),
        (2, 2, "FW-2026-002", "2026年度售前顾问人员框架", "人员框架协议", "2026-02-01", 12, "售前交付标段", 120.0, "售前顾问", "人天", 1800.0, "履行中", "2026-02-01", "", "售前顾问与交付资源单价框架"),
        (3, 3, "FW-2026-003", "华东分公司协同交付框架", "框架协议", "2026-01-20", 24, "分公司协同标段", 300.0, "", "人天", 0.0, "履行中", "2026-01-20", "", "分公司协同交付框架"),
    ],
    "contracts": [
        (1, "FW-2026-001", "2026年度外包资源框架协议", "框架", "人员外包", "企业数智化事业部", "多供应商入围", "2026-01-15", 12, 300.0, "CNY", "含税", "按月结算，验收后 30 天付款", "经营管理部", "履行中", "2026-01-15", "", "多个标段、多供应商入围"),
        (2, "FW-2026-003", "华东分公司协同交付框架", "框架", "区域协同", "企业数智化事业部", "华东分公司", "2026-01-20", 24, 300.0, "CNY", "含税", "按项目里程碑结算", "交付管理部", "履行中", "2026-01-20", "", "分公司协同交付框架"),
    ],
    "contract_lots": [
        (1, 1, "LOT-IMPL", "实施顾问标段", "人员服务", 180.0, "启用", "实施顾问、项目经理等交付资源"),
        (2, 1, "LOT-PRESALE", "售前顾问标段", "人员服务", 120.0, "启用", "售前方案与业务顾问资源"),
        (3, 2, "LOT-EAST", "华东协同交付标段", "区域协同", 300.0, "启用", "华东分公司协同交付"),
    ],
    "lot_supplier_prices": [
        (1, 1, 1, "已入围", "高级实施顾问", "人天", 1500.0, 0.06, "2026-01-15", "", "有效", "北京数智高级实施顾问单价"),
        (2, 1, 2, "已入围", "高级实施顾问", "人天", 1650.0, 0.06, "2026-01-15", "", "有效", "上海企服实施顾问备选单价"),
        (3, 1, 1, "已入围", "测试工程师", "人天", 900.0, 0.06, "2026-01-15", "", "有效", "北京数智测试资源单价"),
        (4, 2, 2, "已入围", "售前顾问", "人天", 1800.0, 0.06, "2026-01-15", "", "有效", "上海企服售前顾问单价"),
        (5, 2, 1, "待入围", "售前顾问", "人天", 1700.0, 0.06, "2026-01-15", "", "有效", "北京数智候选售前单价"),
        (6, 3, 3, "已入围", "区域交付支持", "人月", 32000.0, 0.06, "2026-01-20", "", "有效", "华东分公司协同交付价格"),
    ],
    "users": [
        (1, "wuzong", "123456", 1, "吴总", "general_manager", 1),
        (2, "lijing", "123456", 2, "经营管理-李静", "operations", 1),
        (3, "wangchen", "123456", 3, "供应链总监-王晨", "director", 2),
        (4, "zhaomin", "123456", 4, "ERP总监-赵敏", "director", 3),
        (5, "wangguoquan", "123456", 5, "项目经理-王国权", "project_manager", 2),
        (6, "jiyuhao", "123456", 6, "项目经理-及宇豪", "project_manager", 2),
        (7, "zhangyuqia", "123456", 7, "项目经理-张玉恰", "project_manager", 3),
        (8, "chenlin", "123456", 8, "售前-陈琳", "presales", 2),
        (9, "zhouhang", "123456", 9, "售前-周航", "presales", 3),
        (10, "sunning", "123456", 10, "系统管理员-孙宁", "admin", 1),
    ],
    "customers": [
        (1, "中国远洋海运集团有限公司", "交通物流", "上海", "战略", 2),
        (2, "北京智网数科技术有限公司", "能源", "北京", "重点", 2),
        (3, "中国联通软件研究院", "通信", "北京", "战略", 3),
        (4, "重庆建工集团", "建筑", "重庆", "重点", 2),
        (5, "某省财政厅", "政府", "华东", "重点", 4),
    ],
    "opportunities": [
        (1, "OPP-2026-001", "中远供应链二期升级", 1, 2, 8, "商务谈判", 0.72, 860, 520, 145, "2026-08", "完成二轮报价并推动合同条款确认", "中", "2026-07-02"),
        (2, "OPP-2026-002", "智网人工智能实验室扩容", 2, 2, 8, "方案交流", 0.55, 640, 430, 82, "2026-09", "组织技术方案评审", "中", "2026-07-02"),
        (3, "OPP-2026-003", "联通信创ERP推广", 3, 3, 9, "投标报价", 0.66, 1200, 760, 250, "2026-08", "准备投标澄清材料", "高", "2026-07-02"),
        (4, "OPP-2026-004", "财政预算一体化咨询", 5, 4, 2, "线索", 0.35, 300, 210, 90, "2026-10", "确认客户预算和采购路径", "低", "2026-07-02"),
    ],
    "projects": [
        (1, "Z9225018WS2536", "中远海运集团采购信息系统项目", 1, 2, 1, 5, "交付中", "测试联调", 68, "黄", "2026-09-30"),
        (2, "Z9225000WI1993", "智网数科供应链IT系统服务", 2, 2, 2, 6, "交付中", "开发配置", 54, "绿", "2026-10-31"),
        (3, "Z9225000JS2162", "中国联通信创ERP系统建设", 3, 3, 3, 7, "验收中", "上线验收", 86, "黄", "2026-08-31"),
        (4, "Z9225L01WS0987", "重庆建工安全监控系统建设", 4, 2, None, 6, "交付中", "上线试运行", 77, "红", "2026-08-15"),
    ],
    "project_actuals": [
        (1, 1, "2026-06", 383, 342, 41, 120, 260),
        (2, 2, "2026-06", 846, 783, 63, 300, 520),
        (3, 3, "2026-06", 758, 257, 501, 180, 420),
        (4, 4, "2026-06", 1326, 1299, 27, 250, 880),
        (5, 1, "2026-07", 410, 355, 55, 160, 240),
        (6, 2, "2026-07", 620, 510, 110, 240, 420),
        (7, 3, "2026-07", 680, 280, 400, 220, 390),
        (8, 4, "2026-07", 760, 690, 70, 210, 780),
    ],
    "project_forecasts": [
        (1, 1, "2026-08", 520, 420, 100, 220, "测试资源缺 1 人月", "客户验收材料需提前确认", "业务组审核"),
        (2, 2, "2026-08", 580, 470, 110, 260, "暂无", "交付节奏正常", "已提交"),
        (3, 3, "2026-08", 760, 320, 440, 300, "实施顾问缺口", "验收依赖客户窗口", "经营审核"),
        (4, 4, "2026-08", 880, 820, 60, 260, "供应商现场支持不足", "低毛利且回款慢", "退回"),
    ],
    "project_fund_plans": [
        (1, 1, "2026-08", "上半月", "支出计划", 0, 210, -210, "支付外包测试资源", "审批生效", 5, "2026-07-01", 3, "2026-07-02", 2, "2026-07-03", 1, "2026-07-04"),
        (2, 2, "2026-08", "上半月", "支出计划", 0, 320, -320, "客户回款滞后，需提前准备供应商付款安排", "经管确认", 6, "2026-07-01", 3, "2026-07-02", 2, "2026-07-03", None, ""),
        (3, 3, "2026-08", "下半月", "收款计划", 320, 0, 320, "上线验收后预计收款", "总监审核", 7, "2026-07-01", 4, "2026-07-02", None, "", None, ""),
        (4, 4, "2026-08", "下半月", "支出计划", 0, 300, -300, "现场试运行成本压力较大，需关注垫资", "已提交", 6, "2026-07-02", None, "", None, "", None, ""),
        (5, 1, "2026-08", "上半月", "收款计划", 280, 0, 280, "按测试验收节点计划收款", "审批生效", 5, "2026-07-01", 3, "2026-07-02", 2, "2026-07-03", 1, "2026-07-04"),
        (9, 1, "2026-08", "下半月", "支出计划", 0, 95, -95, "下半月现场支持和差旅支出", "草稿", 5, "2026-07-15", None, "", None, "", None, ""),
        (10, 1, "2026-08", "下半月", "收款计划", 140, 0, 140, "下半月阶段验收后预计回款", "草稿", 5, "2026-07-15", None, "", None, "", None, ""),
    ],
    "project_fund_actuals": [
        (1, 1, 5, 1, "2026-08-05", "收款", 120, "中远海运集团", "里程碑回款", "测试阶段首笔回款", 5, "2026-08-05"),
        (2, 1, 1, None, "2026-08-10", "付款", 80, "北京数智外包服务有限公司", "外包付款", "测试资源费用", 5, "2026-08-10"),
        (3, 2, None, None, "2026-08-08", "付款", 100, "上海企服科技有限公司", "外包付款", "开发配置资源付款", 6, "2026-08-08"),
    ],
    "project_receivables": [
        (1, 1, "2025-12-10", "2025-12-31", 260, 120, "中远海运集团", "部分回款", "测试阶段应收款，账龄超过 6 个月"),
        (2, 2, "2025-12-05", "2025-12-20", 180, 0, "智网数科", "未收", "客户流程滞后，账龄超过 6 个月"),
        (3, 3, "2026-06-20", "2026-08-20", 320, 0, "中国联通软件研究院", "未收", "上线验收后收款"),
        (4, 4, "2026-03-01", "2026-03-31", 240, 30, "重庆建工集团", "部分回款", "欠款周期较长，需重点跟进"),
    ],
    "project_fund_approvals": [
        (1, 1, "提交", "草稿", "已提交", 5, "2026-07-01", "项目经理提交资金计划"),
        (2, 1, "总监审核", "已提交", "总监审核", 3, "2026-07-02", "同意计划"),
        (3, 1, "经管确认", "总监审核", "经管确认", 2, "2026-07-03", "纳入月度资金计划"),
        (4, 1, "审批生效", "经管确认", "审批生效", 1, "2026-07-04", "审批生效"),
        (5, 2, "提交", "草稿", "已提交", 6, "2026-07-01", "项目经理提交资金计划"),
        (6, 2, "总监审核", "已提交", "总监审核", 3, "2026-07-02", "关注付款压力"),
        (7, 2, "经管确认", "总监审核", "经管确认", 2, "2026-07-03", "建议纳入缺口预警"),
    ],
    "kpi_targets": [
        (1, "company", None, "管理口径收入", 4200, "2026-07"),
        (2, "company", None, "分摊后毛利", 780, "2026-07"),
        (3, "org", 2, "管理口径收入", 2600, "2026-07"),
        (4, "org", 2, "分摊后毛利", 260, "2026-07"),
        (5, "org", 3, "管理口径收入", 900, "2026-07"),
        (6, "org", 3, "分摊后毛利", 420, "2026-07"),
        (7, "org", 2, "商机储备金额", 1500, "2026-07"),
        (8, "org", 3, "商机储备金额", 1200, "2026-07"),
        (9, "org", 4, "管理口径收入", 700, "2026-07"),
        (10, "org", 4, "分摊后毛利", 100, "2026-07"),
    ],
    "dispatch_actions": [
        (1, "重庆建工项目低毛利专项压降", "项目风险", 6, 2, 4, None, "高", "2026-07-12", "处理中", "已要求供应商重新确认现场支持报价"),
        (2, "联通信创ERP验收窗口协调", "项目风险", 7, 3, 3, None, "高", "2026-07-10", "待处理", "等待业务组总监协调客户验收时间"),
        (3, "中远二期商务条款推进", "商机推进", 8, 2, None, 1, "中", "2026-07-09", "处理中", "售前已预约客户采购负责人沟通"),
    ],
}

ROLES = [
    ("general_manager", "总经理", "查看全局经营数据，关注 KPI、预测、重大风险和调度。", "全部数据"),
    ("operations", "经营管理人员", "维护指标口径、KPI、预测汇总、数据导入和调度闭环。", "全部数据"),
    ("director", "业务组总监", "查看本组经营指标，管理所辖商机、项目、预测和资源调度。", "本业务组"),
    ("presales", "售前人员", "维护本人负责商机、预计签约、预计收入毛利和跟进动作。", "本人商机"),
    ("project_manager", "项目经理", "维护本人项目进度、预测、风险和调度反馈。", "本人项目"),
    ("admin", "系统管理员", "维护用户、组织、角色、权限和数据范围。", "全部数据"),
]

PERMISSIONS = [
    ("page.dashboard", "页面", "经营驾驶舱页面", "允许进入经营驾驶舱页面"),
    ("page.customers", "页面", "客户管理页面", "允许进入客户管理页面"),
    ("page.opportunities", "页面", "商机管理页面", "允许进入商机管理页面"),
    ("page.projects", "页面", "项目中心页面", "允许进入项目中心页面"),
    ("page.timesheets", "页面", "项目工时管理页面", "允许进入项目工时管理页面"),
    ("page.funds", "页面", "项目资金页面", "允许进入项目资金管理页面"),
    ("page.forecasts", "页面", "经营预测页面", "允许进入经营预测页面"),
    ("page.performance", "页面", "绩效管理页面", "允许进入绩效管理页面"),
    ("page.kpi", "页面", "KPI 跟踪页面", "允许进入 KPI 跟踪页面"),
    ("page.dispatch", "页面", "调度动作页面", "允许进入调度动作页面"),
    ("page.control", "页面", "系统控制台页面", "允许进入系统控制台页面"),
    ("page.userAdmin", "页面", "用户管理页面", "允许进入用户管理页面"),
    ("page.personAdmin", "页面", "人员管理页面", "允许进入人员管理页面"),
    ("page.supplierAdmin", "页面", "供应商管理页面", "允许进入供应商管理页面"),
    ("page.contractAdmin", "页面", "合同/协议管理页面", "允许进入合同/协议管理页面"),
    ("page.orgAdmin", "页面", "组织管理页面", "允许进入组织管理页面"),
    ("page.permissionAdmin", "页面", "权限管理页面", "允许进入权限管理页面"),
    ("dashboard.view", "驾驶舱", "查看驾驶舱", "查看授权范围内的经营指标和穿透数据"),
    ("opportunity.view", "商机", "查看商机", "查看授权范围内的商机"),
    ("opportunity.edit", "商机", "维护商机", "维护商机阶段、概率、金额、风险和跟进动作"),
    ("project.view", "项目", "查看项目", "查看授权范围内的项目"),
    ("project.edit", "项目", "维护项目", "维护项目阶段、进度、健康度和计划"),
    ("timesheet.view", "工时", "查看工时", "查看授权范围内的项目工时填报"),
    ("timesheet.edit", "工时", "维护工时", "填报和维护授权范围内的项目工时"),
    ("fund.view", "资金", "查看项目资金", "查看授权范围内的项目资金计划、实际和预警"),
    ("fund.plan.edit", "资金", "填报资金计划", "按月填报项目资金计划"),
    ("fund.plan.review", "资金", "审核资金计划", "审核、确认和审批项目资金计划"),
    ("fund.actual.edit", "资金", "登记实际收付", "登记生效计划后的项目实际收款和付款"),
    ("forecast.view", "预测", "查看预测", "查看经营预测"),
    ("forecast.edit", "预测", "维护预测", "维护项目预测"),
    ("forecast.review", "预测", "审核预测", "审核所辖项目预测"),
    ("kpi.view", "KPI", "查看 KPI", "查看 KPI 目标、完成率和差距"),
    ("kpi.manage", "KPI", "管理 KPI", "维护 KPI 目标和口径"),
    ("dispatch.view", "调度", "查看调度", "查看调度动作"),
    ("dispatch.manage", "调度", "管理调度", "发起、维护和关闭调度动作"),
    ("system.control", "系统管理", "系统控制台", "查看系统账号、人员、组织、权限和数据范围总览"),
    ("system.persons", "系统管理", "人员管理", "维护真实人员主数据"),
    ("system.suppliers", "系统管理", "供应商管理", "维护供应商主数据和第三方人员关联"),
    ("system.contracts", "系统管理", "合同/协议管理", "维护供应商合同、协议和人员框架价格"),
    ("actual.import", "经营实际", "导入实际", "导入收入、成本、回款和应收"),
    ("system.users", "系统管理", "用户管理", "维护用户、角色和状态"),
    ("system.orgs", "系统管理", "组织管理", "维护组织树"),
    ("system.permissions", "系统管理", "权限管理", "查看和维护角色权限矩阵"),
]

ROLE_PERMISSIONS = {
    "general_manager": [
        "page.dashboard",
        "page.customers",
        "page.opportunities",
        "page.projects",
        "page.timesheets",
        "page.funds",
        "page.forecasts",
        "page.performance",
        "page.kpi",
        "page.dispatch",
        "dashboard.view",
        "opportunity.view",
        "project.view",
        "timesheet.view",
        "fund.view",
        "fund.plan.review",
        "forecast.view",
        "kpi.view",
        "dispatch.view",
    ],
    "operations": [
        "page.dashboard",
        "page.customers",
        "page.opportunities",
        "page.projects",
        "page.timesheets",
        "page.funds",
        "page.forecasts",
        "page.performance",
        "page.kpi",
        "page.dispatch",
        "page.control",
        "page.userAdmin",
        "page.personAdmin",
        "page.supplierAdmin",
        "page.contractAdmin",
        "page.orgAdmin",
        "page.permissionAdmin",
        "dashboard.view",
        "opportunity.view",
        "project.view",
        "timesheet.view",
        "timesheet.edit",
        "fund.view",
        "fund.plan.review",
        "fund.actual.edit",
        "forecast.view",
        "forecast.review",
        "kpi.view",
        "kpi.manage",
        "dispatch.view",
        "dispatch.manage",
        "system.control",
        "system.persons",
        "system.suppliers",
        "system.contracts",
        "actual.import",
        "system.users",
        "system.orgs",
        "system.permissions",
    ],
    "director": [
        "page.dashboard",
        "page.customers",
        "page.opportunities",
        "page.projects",
        "page.timesheets",
        "page.funds",
        "page.forecasts",
        "page.performance",
        "page.kpi",
        "page.dispatch",
        "dashboard.view",
        "opportunity.view",
        "opportunity.edit",
        "project.view",
        "timesheet.view",
        "fund.view",
        "fund.plan.review",
        "forecast.view",
        "forecast.review",
        "kpi.view",
        "dispatch.view",
        "dispatch.manage",
    ],
    "presales": ["page.dashboard", "page.customers", "page.opportunities", "page.timesheets", "page.performance", "page.dispatch", "dashboard.view", "opportunity.view", "opportunity.edit", "timesheet.view", "timesheet.edit", "dispatch.view"],
    "project_manager": ["page.dashboard", "page.customers", "page.projects", "page.timesheets", "page.funds", "page.forecasts", "page.performance", "page.dispatch", "dashboard.view", "project.view", "project.edit", "timesheet.view", "timesheet.edit", "fund.view", "fund.plan.edit", "fund.actual.edit", "forecast.view", "forecast.edit", "dispatch.view"],
    "admin": [
        "page.control",
        "page.dashboard",
        "page.customers",
        "page.opportunities",
        "page.projects",
        "page.timesheets",
        "page.funds",
        "page.forecasts",
        "page.performance",
        "page.kpi",
        "page.dispatch",
        "page.userAdmin",
        "page.personAdmin",
        "page.supplierAdmin",
        "page.contractAdmin",
        "page.orgAdmin",
        "page.permissionAdmin",
        "dashboard.view",
        "opportunity.view",
        "opportunity.edit",
        "project.view",
        "project.edit",
        "timesheet.view",
        "timesheet.edit",
        "fund.view",
        "fund.plan.edit",
        "fund.plan.review",
        "fund.actual.edit",
        "forecast.view",
        "forecast.edit",
        "forecast.review",
        "kpi.view",
        "kpi.manage",
        "dispatch.view",
        "dispatch.manage",
        "actual.import",
        "system.control",
        "system.users",
        "system.persons",
        "system.suppliers",
        "system.contracts",
        "system.orgs",
        "system.permissions",
    ],
}


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        existing = conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if not existing:
            seed_business_data(conn)
        migrate_db(conn)
        seed_governance(conn)
        conn.commit()


def seed_business_data(conn: sqlite3.Connection) -> None:
    seed_columns = {
        "organizations": "id, code, name, type, parent_id, owner_id",
        "persons": "id, employee_no, real_name, photo_url, id_card, person_type, branch_company, supplier_id, org_id, position, email, mobile",
        "suppliers": "id, code, name, credit_code, type, contact_name, phone, email, status, effective_from, effective_to, remark",
        "supplier_agreements": "id, supplier_id, code, name, agreement_type, signed_date, duration_months, bid_section, total_amount, personnel_rate_type, price_unit, unit_price, status, effective_from, effective_to, remark",
        "contracts": "id, code, name, contract_attribute, contract_type, signing_subject, counterparty_name, signed_date, duration_months, total_amount, currency, tax_included, payment_terms, owner_department, status, effective_from, effective_to, remark",
        "contract_lots": "id, contract_id, code, name, lot_type, budget_amount, status, remark",
        "lot_supplier_prices": "id, lot_id, supplier_id, shortlist_status, price_item, price_unit, unit_price, tax_rate, effective_from, effective_to, status, remark",
        "users": "id, username, password, person_id, name, role, org_id",
        "customers": "id, name, industry, region, level, owner_org_id",
        "opportunities": "id, code, name, customer_id, org_id, owner_id, stage, probability, expected_contract_amount, expected_revenue, expected_gross_profit, expected_sign_month, next_action, risk_level, updated_at",
        "projects": "id, code, name, customer_id, org_id, opportunity_id, project_manager_id, status, phase, progress, health, planned_end",
        "project_actuals": "id, project_id, month, revenue, cost, gross_profit, cash_in, receivable",
        "project_forecasts": "id, project_id, month, forecast_revenue, forecast_cost, forecast_gross_profit, forecast_cash_in, resource_gap, risk_note, review_status",
        "project_fund_plans": "id, project_id, month, period_half, plan_type, planned_receipt, planned_payment, funding_gap, plan_note, status, submitted_by, submitted_at, director_reviewed_by, director_reviewed_at, operations_confirmed_by, operations_confirmed_at, department_approved_by, department_approved_at",
        "project_fund_actuals": "id, project_id, plan_id, receivable_id, occurred_date, direction, amount, counterparty, category, remark, registered_by, registered_at",
        "project_receivables": "id, project_id, receivable_date, due_date, receivable_amount, received_amount, counterparty, status, remark",
        "project_fund_approvals": "id, plan_id, action, from_status, to_status, operator_id, operated_at, comment",
        "kpi_targets": "id, owner_type, owner_id, metric, target_value, period",
        "dispatch_actions": "id, title, source_type, owner_id, org_id, project_id, opportunity_id, priority, due_date, status, progress_note",
    }
    for table, rows in SEED.items():
        placeholders = ", ".join(["?"] * len(rows[0]))
        conn.executemany(f"INSERT INTO {table} ({seed_columns[table]}) VALUES ({placeholders})", rows)


def migrate_db(conn: sqlite3.Connection) -> None:
    org_columns = {row["name"] for row in conn.execute("PRAGMA table_info(organizations)").fetchall()}
    if "code" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN code TEXT DEFAULT ''")
    if "owner_id" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN owner_id INTEGER")
    if "status" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT '启用'")
    if "effective_from" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN effective_from TEXT NOT NULL DEFAULT '2026-01-01'")
    if "effective_to" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN effective_to TEXT DEFAULT ''")
    if "short_name" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN short_name TEXT DEFAULT ''")
    if "leader_id" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN leader_id INTEGER")
    if "sort_order" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN sort_order INTEGER DEFAULT 0")
    if "remark" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN remark TEXT DEFAULT ''")
    conn.execute("UPDATE organizations SET name = 'ERP交付组', code = 'ORG-ERP-DELIVERY' WHERE id = 3 AND name = 'ERP核心产品组'")
    conn.execute(
        """
        INSERT OR IGNORE INTO organizations (id, code, name, type, parent_id, owner_id, status, effective_from, effective_to)
        VALUES (5, 'ORG-HR-001', '人力线产品组', 'business_group', 1, NULL, '启用', '2026-01-01', '')
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS performance_kpi_items (
          id INTEGER PRIMARY KEY,
          cycle_year TEXT NOT NULL,
          org_id INTEGER NOT NULL,
          parent_item_id INTEGER,
          kpi_code TEXT DEFAULT '',
          category TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          definition TEXT DEFAULT '',
          target_text TEXT DEFAULT '',
          target_value REAL,
          unit TEXT DEFAULT '',
          weight TEXT DEFAULT '',
          scoring_method TEXT DEFAULT '',
          data_source TEXT DEFAULT '',
          owner_department TEXT DEFAULT '',
          kpi_type TEXT NOT NULL DEFAULT '定量',
          decomposition_mode TEXT NOT NULL DEFAULT '严格汇总',
          quarterly_mode TEXT NOT NULL DEFAULT '按季度',
          metric_code TEXT DEFAULT '',
          version_no TEXT NOT NULL DEFAULT 'V1.0',
          version_status TEXT NOT NULL DEFAULT '已发布',
          is_locked INTEGER NOT NULL DEFAULT 1,
          version_note TEXT DEFAULT '',
          effective_from TEXT NOT NULL DEFAULT '2026-01-01',
          effective_to TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '已定义'
        )
        """
    )
    performance_kpi_columns = {row["name"] for row in conn.execute("PRAGMA table_info(performance_kpi_items)").fetchall()}
    performance_kpi_add_columns = {
        "kpi_code": "TEXT DEFAULT ''",
        "version_no": "TEXT NOT NULL DEFAULT 'V1.0'",
        "version_status": "TEXT NOT NULL DEFAULT '已发布'",
        "is_locked": "INTEGER NOT NULL DEFAULT 1",
        "version_note": "TEXT DEFAULT ''",
        "effective_from": "TEXT NOT NULL DEFAULT '2026-01-01'",
        "effective_to": "TEXT DEFAULT ''",
    }
    for column, definition in performance_kpi_add_columns.items():
        if column not in performance_kpi_columns:
            conn.execute(f"ALTER TABLE performance_kpi_items ADD COLUMN {column} {definition}")
    conn.execute("UPDATE performance_kpi_items SET version_no = 'V1.0' WHERE COALESCE(version_no, '') = ''")
    conn.execute("UPDATE performance_kpi_items SET version_status = '已发布' WHERE COALESCE(version_status, '') = ''")
    conn.execute("UPDATE performance_kpi_items SET is_locked = 1 WHERE is_locked IS NULL")
    conn.execute("UPDATE performance_kpi_items SET effective_from = '2026-01-01' WHERE COALESCE(effective_from, '') = ''")
    conn.execute("UPDATE performance_kpi_items SET kpi_code = COALESCE(NULLIF(metric_code, ''), 'KPI-' || id) WHERE COALESCE(kpi_code, '') = ''")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS performance_period_targets (
          id INTEGER PRIMARY KEY,
          item_id INTEGER NOT NULL,
          period TEXT NOT NULL,
          target_text TEXT DEFAULT '',
          target_value REAL,
          actual_value REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT '未开始'
        )
        """
    )
    conn.executemany(
        """
        INSERT OR IGNORE INTO performance_kpi_items (
          id, cycle_year, org_id, parent_item_id, category, name, definition, target_text,
          target_value, unit, weight, scoring_method, data_source, owner_department,
          kpi_type, decomposition_mode, quarterly_mode, metric_code, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        PERFORMANCE_KPI_ITEM_SEED,
    )
    conn.executemany(
        """
        INSERT OR IGNORE INTO performance_period_targets (
          id, item_id, period, target_text, target_value, actual_value, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        PERFORMANCE_PERIOD_TARGET_SEED,
    )
    person_columns = {row["name"] for row in conn.execute("PRAGMA table_info(persons)").fetchall()}
    if "photo_url" not in person_columns:
        conn.execute("ALTER TABLE persons ADD COLUMN photo_url TEXT DEFAULT ''")
    if "id_card" not in person_columns:
        conn.execute("ALTER TABLE persons ADD COLUMN id_card TEXT DEFAULT ''")
    if "person_type" not in person_columns:
        conn.execute("ALTER TABLE persons ADD COLUMN person_type TEXT NOT NULL DEFAULT '合同制'")
    if "branch_company" not in person_columns:
        conn.execute("ALTER TABLE persons ADD COLUMN branch_company TEXT DEFAULT ''")
    if "supplier_id" not in person_columns:
        conn.execute("ALTER TABLE persons ADD COLUMN supplier_id INTEGER")
    person_outsourcing_defaults = {
        "outsourcing_contract_id": "INTEGER",
        "outsourcing_lot_id": "INTEGER",
        "outsourcing_award_id": "INTEGER",
        "outsourcing_price_id": "INTEGER",
    }
    for column, definition in person_outsourcing_defaults.items():
        if column not in person_columns:
            conn.execute(f"ALTER TABLE persons ADD COLUMN {column} {definition}")
    supplier_columns = {row["name"] for row in conn.execute("PRAGMA table_info(suppliers)").fetchall()}
    supplier_defaults = {
        "credit_code": "TEXT DEFAULT ''",
        "contact_name": "TEXT DEFAULT ''",
        "phone": "TEXT DEFAULT ''",
        "email": "TEXT DEFAULT ''",
        "effective_from": "TEXT NOT NULL DEFAULT '2026-01-01'",
        "effective_to": "TEXT DEFAULT ''",
        "remark": "TEXT DEFAULT ''",
    }
    for column, definition in supplier_defaults.items():
        if column not in supplier_columns:
            conn.execute(f"ALTER TABLE suppliers ADD COLUMN {column} {definition}")
    conn.executemany(
        "INSERT OR IGNORE INTO suppliers (id, code, name, credit_code, type, contact_name, phone, email, status, effective_from, effective_to, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["suppliers"],
    )
    for supplier in SEED["suppliers"]:
        conn.execute(
            """
            UPDATE suppliers
            SET credit_code = ?, type = ?, contact_name = ?, phone = ?, email = ?, status = ?, effective_from = ?, effective_to = ?, remark = ?
            WHERE id = ? AND COALESCE(credit_code, '') = ''
            """,
            [supplier[3], supplier[4], supplier[5], supplier[6], supplier[7], supplier[8], supplier[9], supplier[10], supplier[11], supplier[0]],
        )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS supplier_agreements (
          id INTEGER PRIMARY KEY,
          supplier_id INTEGER NOT NULL,
          code TEXT DEFAULT '',
          name TEXT NOT NULL,
          agreement_type TEXT NOT NULL DEFAULT '框架协议',
          signed_date TEXT DEFAULT '',
          duration_months INTEGER DEFAULT 12,
          bid_section TEXT DEFAULT '',
          total_amount REAL DEFAULT 0,
          personnel_rate_type TEXT DEFAULT '',
          price_unit TEXT DEFAULT '人天',
          unit_price REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT '履行中',
          effective_from TEXT NOT NULL DEFAULT '2026-01-01',
          effective_to TEXT DEFAULT '',
          remark TEXT DEFAULT '',
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
        """
    )
    conn.executemany(
        "INSERT OR IGNORE INTO supplier_agreements (id, supplier_id, code, name, agreement_type, signed_date, duration_months, bid_section, total_amount, personnel_rate_type, price_unit, unit_price, status, effective_from, effective_to, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["supplier_agreements"],
    )
    if {"agreement_no", "agreement_type", "signed_date", "duration_months", "bid_section", "contract_total_amount"}.issubset(supplier_columns):
        conn.execute(
            """
            INSERT OR IGNORE INTO supplier_agreements (
                id, supplier_id, code, name, agreement_type, signed_date, duration_months, bid_section,
                total_amount, personnel_rate_type, price_unit, unit_price, status, effective_from, effective_to, remark
            )
            SELECT
                id,
                id,
                COALESCE(agreement_no, ''),
                name || '协议/合同',
                COALESCE(NULLIF(agreement_type, ''), '框架协议'),
                COALESCE(signed_date, ''),
                COALESCE(duration_months, 12),
                COALESCE(bid_section, ''),
                COALESCE(contract_total_amount, 0),
                COALESCE(personnel_rate_type, ''),
                COALESCE(price_unit, '人天'),
                COALESCE(unit_price, 0),
                '履行中',
                COALESCE(NULLIF(signed_date, ''), effective_from, '2026-01-01'),
                COALESCE(effective_to, ''),
                COALESCE(remark, '')
            FROM suppliers
            WHERE COALESCE(agreement_no, '') <> ''
            """
        )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contracts (
          id INTEGER PRIMARY KEY,
          code TEXT DEFAULT '',
          name TEXT NOT NULL,
          contract_attribute TEXT NOT NULL DEFAULT '框架',
          contract_type TEXT NOT NULL DEFAULT '人员外包',
          signing_subject TEXT DEFAULT '',
          counterparty_name TEXT DEFAULT '',
          signed_date TEXT DEFAULT '',
          duration_months INTEGER DEFAULT 12,
          total_amount REAL DEFAULT 0,
          currency TEXT DEFAULT 'CNY',
          tax_included TEXT DEFAULT '含税',
          payment_terms TEXT DEFAULT '',
          owner_department TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '履行中',
          effective_from TEXT NOT NULL DEFAULT '2026-01-01',
          effective_to TEXT DEFAULT '',
          remark TEXT DEFAULT ''
        )
        """
    )
    contract_columns = {row["name"] for row in conn.execute("PRAGMA table_info(contracts)").fetchall()}
    contract_defaults = {
        "contract_attribute": "TEXT NOT NULL DEFAULT '框架'",
        "signing_subject": "TEXT DEFAULT ''",
        "counterparty_name": "TEXT DEFAULT ''",
        "currency": "TEXT DEFAULT 'CNY'",
        "tax_included": "TEXT DEFAULT '含税'",
        "payment_terms": "TEXT DEFAULT ''",
        "owner_department": "TEXT DEFAULT ''",
    }
    for column, definition in contract_defaults.items():
        if column not in contract_columns:
            conn.execute(f"ALTER TABLE contracts ADD COLUMN {column} {definition}")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS contract_lots (
          id INTEGER PRIMARY KEY,
          contract_id INTEGER NOT NULL,
          code TEXT DEFAULT '',
          name TEXT NOT NULL,
          lot_type TEXT DEFAULT '服务标段',
          service_scope TEXT DEFAULT '',
          effective_from TEXT DEFAULT '',
          effective_to TEXT DEFAULT '',
          budget_amount REAL DEFAULT 0,
          status TEXT NOT NULL DEFAULT '启用',
          remark TEXT DEFAULT '',
          FOREIGN KEY (contract_id) REFERENCES contracts(id)
        )
        """
    )
    lot_columns = {row["name"] for row in conn.execute("PRAGMA table_info(contract_lots)").fetchall()}
    lot_defaults = {
        "service_scope": "TEXT DEFAULT ''",
        "effective_from": "TEXT DEFAULT ''",
        "effective_to": "TEXT DEFAULT ''",
    }
    for column, definition in lot_defaults.items():
        if column not in lot_columns:
            conn.execute(f"ALTER TABLE contract_lots ADD COLUMN {column} {definition}")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS lot_supplier_awards (
          id INTEGER PRIMARY KEY,
          contract_id INTEGER NOT NULL,
          lot_id INTEGER,
          supplier_id INTEGER NOT NULL,
          shortlist_status TEXT NOT NULL DEFAULT '已入围',
          agreement_code TEXT DEFAULT '',
          agreement_name TEXT DEFAULT '',
          effective_from TEXT NOT NULL DEFAULT '2026-01-01',
          effective_to TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '有效',
          remark TEXT DEFAULT '',
          FOREIGN KEY (contract_id) REFERENCES contracts(id),
          FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS lot_supplier_prices (
          id INTEGER PRIMARY KEY,
          contract_id INTEGER,
          lot_id INTEGER,
          supplier_id INTEGER NOT NULL,
          shortlist_status TEXT NOT NULL DEFAULT '已入围',
          agreement_code TEXT DEFAULT '',
          agreement_name TEXT DEFAULT '',
          personnel_type TEXT DEFAULT '人员服务',
          personnel_level TEXT DEFAULT '',
          price_item TEXT NOT NULL DEFAULT '',
          price_unit TEXT DEFAULT '人天',
          unit_price REAL DEFAULT 0,
          tax_rate REAL DEFAULT 0,
          effective_from TEXT NOT NULL DEFAULT '2026-01-01',
          effective_to TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '有效',
          remark TEXT DEFAULT '',
          FOREIGN KEY (contract_id) REFERENCES contracts(id),
          FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
        """
    )
    price_columns = {row["name"] for row in conn.execute("PRAGMA table_info(lot_supplier_prices)").fetchall()}
    price_info = {row["name"]: row for row in conn.execute("PRAGMA table_info(lot_supplier_prices)").fetchall()}
    if "contract_id" not in price_columns or (price_info.get("lot_id") and price_info["lot_id"]["notnull"] == 1):
        conn.execute("ALTER TABLE lot_supplier_prices RENAME TO lot_supplier_prices_old")
        conn.execute(
            """
            CREATE TABLE lot_supplier_prices (
              id INTEGER PRIMARY KEY,
              contract_id INTEGER,
              lot_id INTEGER,
              supplier_id INTEGER NOT NULL,
              shortlist_status TEXT NOT NULL DEFAULT '已入围',
              agreement_code TEXT DEFAULT '',
              agreement_name TEXT DEFAULT '',
              personnel_type TEXT DEFAULT '人员服务',
              personnel_level TEXT DEFAULT '',
              price_item TEXT NOT NULL DEFAULT '',
              price_unit TEXT DEFAULT '人天',
              unit_price REAL DEFAULT 0,
              tax_rate REAL DEFAULT 0,
              effective_from TEXT NOT NULL DEFAULT '2026-01-01',
              effective_to TEXT DEFAULT '',
              status TEXT NOT NULL DEFAULT '有效',
              remark TEXT DEFAULT '',
              FOREIGN KEY (contract_id) REFERENCES contracts(id),
              FOREIGN KEY (lot_id) REFERENCES contract_lots(id),
              FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )
            """
        )
        old_columns = {row["name"] for row in conn.execute("PRAGMA table_info(lot_supplier_prices_old)").fetchall()}
        old_contract_expr = "old.contract_id" if "contract_id" in old_columns else "contract_lots.contract_id"
        old_agreement_code_expr = "old.agreement_code" if "agreement_code" in old_columns else "''"
        old_agreement_name_expr = "old.agreement_name" if "agreement_name" in old_columns else "''"
        old_personnel_type_expr = "old.personnel_type" if "personnel_type" in old_columns else "'人员服务'"
        old_personnel_level_expr = "old.personnel_level" if "personnel_level" in old_columns else "old.price_item"
        conn.execute(
            f"""
            INSERT INTO lot_supplier_prices (
              id, contract_id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name,
              personnel_type, personnel_level, price_item, price_unit, unit_price, tax_rate, effective_from, effective_to, status, remark
            )
            SELECT old.id,
                   COALESCE({old_contract_expr}, contract_lots.contract_id),
                   old.lot_id,
                   old.supplier_id,
                   old.shortlist_status,
                   {old_agreement_code_expr},
                   {old_agreement_name_expr},
                   {old_personnel_type_expr},
                   {old_personnel_level_expr},
                   old.price_item,
                   old.price_unit,
                   old.unit_price,
                   old.tax_rate,
                   old.effective_from,
                   old.effective_to,
                   old.status,
                   old.remark
            FROM lot_supplier_prices_old old
            LEFT JOIN contract_lots ON contract_lots.id = old.lot_id
            """
        )
        conn.execute("DROP TABLE lot_supplier_prices_old")
        price_columns = {row["name"] for row in conn.execute("PRAGMA table_info(lot_supplier_prices)").fetchall()}
    if "effective_from" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN effective_from TEXT NOT NULL DEFAULT '2026-01-01'")
    if "effective_to" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN effective_to TEXT DEFAULT ''")
    if "agreement_code" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN agreement_code TEXT DEFAULT ''")
    if "agreement_name" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN agreement_name TEXT DEFAULT ''")
    if "personnel_type" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN personnel_type TEXT DEFAULT '人员服务'")
    if "personnel_level" not in price_columns:
        conn.execute("ALTER TABLE lot_supplier_prices ADD COLUMN personnel_level TEXT DEFAULT ''")
    conn.execute("UPDATE lot_supplier_prices SET personnel_type = '人员服务' WHERE COALESCE(personnel_type, '') = ''")
    conn.execute("UPDATE lot_supplier_prices SET personnel_level = price_item WHERE COALESCE(personnel_level, '') = ''")
    conn.execute(
        """
        UPDATE contract_lots
        SET effective_from = (
                SELECT contracts.effective_from FROM contracts WHERE contracts.id = contract_lots.contract_id
            ),
            effective_to = (
                SELECT contracts.effective_to FROM contracts WHERE contracts.id = contract_lots.contract_id
            )
        WHERE COALESCE(effective_from, '') = '' OR COALESCE(effective_to, '') = ''
        """
    )
    conn.execute(
        """
        UPDATE lot_supplier_prices
        SET contract_id = (
            SELECT contract_lots.contract_id
            FROM contract_lots
            WHERE contract_lots.id = lot_supplier_prices.lot_id
        )
        WHERE contract_id IS NULL AND lot_id IS NOT NULL
        """
    )
    conn.execute(
        """
        UPDATE lot_supplier_prices
        SET effective_to = '2025-09-25'
        WHERE contract_id = 20240926 AND COALESCE(effective_to, '') = ''
        """
    )
    conn.execute("UPDATE lot_supplier_prices SET shortlist_status = '已入围' WHERE shortlist_status = '入围'")
    conn.execute("UPDATE lot_supplier_prices SET shortlist_status = '待入围' WHERE shortlist_status IN ('候选', '淘汰')")
    conn.executemany(
        "INSERT OR IGNORE INTO contracts (id, code, name, contract_attribute, contract_type, signing_subject, counterparty_name, signed_date, duration_months, total_amount, currency, tax_included, payment_terms, owner_department, status, effective_from, effective_to, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["contracts"],
    )
    conn.execute(
        """
        UPDATE contracts
        SET contract_attribute = CASE
              WHEN contract_attribute IS NOT NULL AND contract_attribute <> '' THEN contract_attribute
              WHEN contract_type LIKE '%补充%' THEN '补充协议'
              WHEN contract_type LIKE '%订单%' THEN '订单'
              WHEN contract_type LIKE '%框架%' THEN '框架'
              ELSE '合同'
            END,
            contract_type = CASE
              WHEN contract_type LIKE '%人员%' THEN '人员外包'
              WHEN contract_type LIKE '%框架%' THEN '服务采购'
              WHEN contract_type LIKE '%项目%' THEN '项目采购'
              WHEN contract_type LIKE '%采购%' THEN '服务采购'
              WHEN contract_type LIKE '%补充%' THEN '服务采购'
              ELSE COALESCE(NULLIF(contract_type, ''), '服务采购')
            END,
            currency = COALESCE(NULLIF(currency, ''), 'CNY'),
            tax_included = COALESCE(NULLIF(tax_included, ''), '含税')
        """
    )
    for contract in SEED["contracts"]:
        conn.execute(
            """
            UPDATE contracts
            SET contract_attribute = ?, contract_type = ?, signing_subject = ?, counterparty_name = ?,
                currency = ?, tax_included = ?, payment_terms = ?, owner_department = ?
            WHERE id = ? AND COALESCE(signing_subject, '') = ''
            """,
            [contract[3], contract[4], contract[5], contract[6], contract[10], contract[11], contract[12], contract[13], contract[0]],
        )
    conn.executemany(
        "INSERT OR IGNORE INTO contract_lots (id, contract_id, code, name, lot_type, budget_amount, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["contract_lots"],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO lot_supplier_prices (id, lot_id, supplier_id, shortlist_status, price_item, price_unit, unit_price, tax_rate, effective_from, effective_to, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["lot_supplier_prices"],
    )
    seed_erp_2024_contract(conn)
    conn.execute(
        """
        UPDATE contracts
        SET contract_type = '人员外包框架',
            effective_from = '2024-09-26',
            effective_to = '2025-09-25'
        WHERE id = 20240926
        """
    )
    conn.execute(
        """
        UPDATE contract_lots
        SET effective_from = '2024-09-26',
            effective_to = '2025-09-25',
            service_scope = CASE
                WHEN code = 'ERP-EXT' THEN 'ERP外延系统运营维护人员外包服务'
                WHEN code = 'ERP-CORE' THEN 'ERP核心系统运营维护人员外包服务'
                ELSE service_scope
            END
        WHERE contract_id = 20240926
        """
    )
    conn.execute(
        """
        UPDATE lot_supplier_prices
        SET contract_id = (
            SELECT contract_lots.contract_id
            FROM contract_lots
            WHERE contract_lots.id = lot_supplier_prices.lot_id
        )
        WHERE contract_id IS NULL AND lot_id IS NOT NULL
        """
    )
    conn.execute("UPDATE lot_supplier_prices SET personnel_type = '人员服务' WHERE COALESCE(personnel_type, '') = ''")
    conn.execute("UPDATE lot_supplier_prices SET personnel_level = price_item WHERE COALESCE(personnel_level, '') = ''")
    conn.execute(
        """
        INSERT INTO lot_supplier_awards
          (contract_id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name, effective_from, effective_to, status, remark)
        SELECT p.contract_id,
               p.lot_id,
               p.supplier_id,
               COALESCE(NULLIF(MIN(p.shortlist_status), ''), '已入围'),
               COALESCE(NULLIF(MIN(p.agreement_code), ''), ''),
               COALESCE(NULLIF(MIN(p.agreement_name), ''), ''),
               COALESCE(NULLIF(MIN(p.effective_from), ''), '2026-01-01'),
               COALESCE(NULLIF(MAX(p.effective_to), ''), ''),
               COALESCE(NULLIF(MIN(p.status), ''), '有效'),
               ''
        FROM lot_supplier_prices p
        WHERE p.contract_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM lot_supplier_awards a
              WHERE a.contract_id = p.contract_id
                AND COALESCE(a.lot_id, 0) = COALESCE(p.lot_id, 0)
                AND a.supplier_id = p.supplier_id
          )
        GROUP BY p.contract_id, COALESCE(p.lot_id, 0), p.supplier_id
        """
    )
    conn.execute("UPDATE persons SET id_card = '110101199106060066', person_type = '第三方', supplier_id = 1 WHERE id = 6 AND (supplier_id IS NULL OR supplier_id = '')")
    conn.execute("UPDATE persons SET id_card = '110101199409090099', person_type = '第三方', supplier_id = 2 WHERE id = 9 AND (supplier_id IS NULL OR supplier_id = '')")
    conn.execute("UPDATE persons SET id_card = '110101199207070077', person_type = '分公司' WHERE id = 7 AND (id_card IS NULL OR id_card = '')")

    user_columns = {row["name"] for row in conn.execute("PRAGMA table_info(users)").fetchall()}
    if "username" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT ''")
    if "password" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT '123456'")
    if "person_id" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN person_id INTEGER")
    if "status" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT '启用'")
    if "email" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''")
    if "effective_from" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN effective_from TEXT NOT NULL DEFAULT '2026-01-01'")
    if "effective_to" not in user_columns:
        conn.execute("ALTER TABLE users ADD COLUMN effective_to TEXT DEFAULT ''")
    conn.execute(
        """
        INSERT OR IGNORE INTO persons
          (id, employee_no, real_name, photo_url, id_card, person_type, supplier_id, org_id, position, email, mobile, status, effective_from, effective_to)
        SELECT id,
               'EMP-' || printf('%03d', id),
               CASE
                 WHEN instr(name, '-') > 0 THEN substr(name, instr(name, '-') + 1)
                 ELSE name
               END,
               '',
               '',
               '合同制',
               NULL,
               org_id,
               '',
               COALESCE(email, ''),
               '',
               '在职',
               COALESCE(effective_from, '2026-01-01'),
               COALESCE(effective_to, '')
        FROM users
        WHERE id NOT IN (SELECT id FROM persons)
        """
    )
    username_defaults = {
        1: "wuzong",
        2: "lijing",
        3: "wangchen",
        4: "zhaomin",
        5: "wangguoquan",
        6: "jiyuhao",
        7: "zhangyuqia",
        8: "chenlin",
        9: "zhouhang",
        10: "sunning",
    }
    for user_id, username in username_defaults.items():
        conn.execute("UPDATE users SET username = ? WHERE id = ? AND (username IS NULL OR username = '')", [username, user_id])
    conn.execute("UPDATE users SET username = 'user' || id WHERE username IS NULL OR username = ''")
    conn.execute("UPDATE users SET password = '123456' WHERE password IS NULL OR password = ''")
    conn.execute("UPDATE users SET person_id = id WHERE person_id IS NULL AND id IN (SELECT id FROM persons)")

    org_columns = {row["name"] for row in conn.execute("PRAGMA table_info(organizations)").fetchall()}
    if "code" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN code TEXT DEFAULT ''")
    if "owner_id" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN owner_id INTEGER")
    if "status" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN status TEXT NOT NULL DEFAULT '启用'")
    if "effective_from" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN effective_from TEXT NOT NULL DEFAULT '2026-01-01'")
    if "effective_to" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN effective_to TEXT DEFAULT ''")
    if "short_name" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN short_name TEXT DEFAULT ''")
    if "leader_id" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN leader_id INTEGER")
    if "sort_order" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN sort_order INTEGER DEFAULT 0")
    if "remark" not in org_columns:
        conn.execute("ALTER TABLE organizations ADD COLUMN remark TEXT DEFAULT ''")
    conn.execute("UPDATE organizations SET code = 'ORG-' || printf('%03d', id) WHERE code IS NULL OR code = ''")
    conn.execute(
        """
        UPDATE organizations
        SET owner_id = CASE id WHEN 1 THEN 1 WHEN 2 THEN 3 WHEN 3 THEN 4 WHEN 4 THEN 2 ELSE owner_id END
        WHERE owner_id IS NULL
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_fund_plans (
          id INTEGER PRIMARY KEY,
          project_id INTEGER NOT NULL,
          month TEXT NOT NULL,
          period_half TEXT NOT NULL DEFAULT '上半月',
          plan_type TEXT NOT NULL DEFAULT '支出计划',
          planned_receipt REAL NOT NULL DEFAULT 0,
          planned_payment REAL NOT NULL DEFAULT 0,
          funding_gap REAL NOT NULL DEFAULT 0,
          plan_note TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '草稿',
          submitted_by INTEGER,
          submitted_at TEXT DEFAULT '',
          director_reviewed_by INTEGER,
          director_reviewed_at TEXT DEFAULT '',
          operations_confirmed_by INTEGER,
          operations_confirmed_at TEXT DEFAULT '',
          department_approved_by INTEGER,
          department_approved_at TEXT DEFAULT '',
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
        """
    )
    fund_plan_columns = {row["name"] for row in conn.execute("PRAGMA table_info(project_fund_plans)").fetchall()}
    if "period_half" not in fund_plan_columns:
        conn.execute("ALTER TABLE project_fund_plans ADD COLUMN period_half TEXT NOT NULL DEFAULT '上半月'")
    if "plan_type" not in fund_plan_columns:
        conn.execute("ALTER TABLE project_fund_plans ADD COLUMN plan_type TEXT NOT NULL DEFAULT '支出计划'")
        conn.execute("UPDATE project_fund_plans SET plan_type = CASE WHEN planned_payment > 0 AND planned_payment >= planned_receipt THEN '支出计划' ELSE '收款计划' END")
    mixed_fund_plans = conn.execute(
        """
        SELECT *
        FROM project_fund_plans
        WHERE planned_receipt > 0 AND planned_payment > 0
        """
    ).fetchall()
    for plan in mixed_fund_plans:
        duplicate = conn.execute(
            """
            SELECT id
            FROM project_fund_plans
            WHERE project_id = ?
              AND month = ?
              AND period_half = ?
              AND plan_type = '收款计划'
              AND planned_receipt = ?
              AND planned_payment = 0
            """,
            [plan["project_id"], plan["month"], plan["period_half"], plan["planned_receipt"]],
        ).fetchone()
        if duplicate:
            receipt_plan_id = duplicate["id"]
        else:
            next_id = conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM project_fund_plans").fetchone()["next_id"]
            conn.execute(
                """
                INSERT INTO project_fund_plans (
                    id, project_id, month, period_half, plan_type, planned_receipt, planned_payment,
                    funding_gap, plan_note, status, submitted_by, submitted_at, director_reviewed_by,
                    director_reviewed_at, operations_confirmed_by, operations_confirmed_at,
                    department_approved_by, department_approved_at
                )
                VALUES (?, ?, ?, ?, '收款计划', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    next_id,
                    plan["project_id"],
                    plan["month"],
                    plan["period_half"],
                    plan["planned_receipt"],
                    plan["planned_receipt"],
                    plan["plan_note"],
                    plan["status"],
                    plan["submitted_by"],
                    plan["submitted_at"],
                    plan["director_reviewed_by"],
                    plan["director_reviewed_at"],
                    plan["operations_confirmed_by"],
                    plan["operations_confirmed_at"],
                    plan["department_approved_by"],
                    plan["department_approved_at"],
                ],
            )
            receipt_plan_id = next_id
        conn.execute(
            """
            UPDATE project_fund_actuals
            SET plan_id = ?
            WHERE plan_id = ? AND direction = '收款'
            """,
            [receipt_plan_id, plan["id"]],
        )
        conn.execute(
            """
            UPDATE project_fund_plans
            SET plan_type = '支出计划',
                planned_receipt = 0,
                funding_gap = -planned_payment
            WHERE id = ?
            """,
            [plan["id"]],
        )
    conn.execute(
        """
        UPDATE project_fund_plans
        SET plan_type = CASE
              WHEN planned_payment > 0 AND planned_receipt = 0 THEN '支出计划'
              WHEN planned_receipt > 0 AND planned_payment = 0 THEN '收款计划'
              ELSE plan_type
            END,
            funding_gap = planned_receipt - planned_payment
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_fund_actuals (
          id INTEGER PRIMARY KEY,
          project_id INTEGER NOT NULL,
          plan_id INTEGER,
          receivable_id INTEGER,
          occurred_date TEXT NOT NULL,
          direction TEXT NOT NULL,
          amount REAL NOT NULL DEFAULT 0,
          counterparty TEXT DEFAULT '',
          category TEXT DEFAULT '',
          remark TEXT DEFAULT '',
          registered_by INTEGER,
          registered_at TEXT DEFAULT '',
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (plan_id) REFERENCES project_fund_plans(id)
        )
        """
    )
    fund_actual_columns = {row["name"] for row in conn.execute("PRAGMA table_info(project_fund_actuals)").fetchall()}
    if "receivable_id" not in fund_actual_columns:
        conn.execute("ALTER TABLE project_fund_actuals ADD COLUMN receivable_id INTEGER")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_receivables (
          id INTEGER PRIMARY KEY,
          project_id INTEGER NOT NULL,
          receivable_date TEXT NOT NULL,
          due_date TEXT NOT NULL,
          receivable_amount REAL NOT NULL DEFAULT 0,
          received_amount REAL NOT NULL DEFAULT 0,
          counterparty TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT '未收',
          remark TEXT DEFAULT '',
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS project_fund_approvals (
          id INTEGER PRIMARY KEY,
          plan_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          from_status TEXT DEFAULT '',
          to_status TEXT NOT NULL,
          operator_id INTEGER,
          operated_at TEXT NOT NULL,
          comment TEXT DEFAULT '',
          FOREIGN KEY (plan_id) REFERENCES project_fund_plans(id)
        )
        """
    )
    conn.executemany(
        "INSERT OR IGNORE INTO project_fund_plans (id, project_id, month, period_half, plan_type, planned_receipt, planned_payment, funding_gap, plan_note, status, submitted_by, submitted_at, director_reviewed_by, director_reviewed_at, operations_confirmed_by, operations_confirmed_at, department_approved_by, department_approved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["project_fund_plans"],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO project_fund_actuals (id, project_id, plan_id, receivable_id, occurred_date, direction, amount, counterparty, category, remark, registered_by, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["project_fund_actuals"],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO project_receivables (id, project_id, receivable_date, due_date, receivable_amount, received_amount, counterparty, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["project_receivables"],
    )
    conn.execute(
        """
        UPDATE project_receivables
        SET receivable_date = '2025-12-10', due_date = '2025-12-31'
        WHERE id = 1 AND due_date = '2026-01-31'
        """
    )
    conn.execute(
        """
        UPDATE project_receivables
        SET receivable_date = '2025-12-05', due_date = '2025-12-20'
        WHERE id = 2 AND due_date = '2026-02-28'
        """
    )
    stage_aliases = {
        "方案": "方案交流",
        "投标": "投标报价",
        "商务": "商务谈判",
        "已中标": "赢单转项目",
        "已签约": "赢单转项目",
        "已丢失": "输单关闭",
        "暂停": "输单关闭",
    }
    for old_stage, new_stage in stage_aliases.items():
        conn.execute("UPDATE opportunities SET stage = ? WHERE stage = ?", [new_stage, old_stage])
    conn.executemany(
        "INSERT OR IGNORE INTO kpi_targets (id, owner_type, owner_id, metric, target_value, period) VALUES (?, ?, ?, ?, ?, ?)",
        [row for row in SEED["kpi_targets"] if row[0] in {9, 10}],
    )
    conn.executemany(
        "INSERT OR IGNORE INTO kpi_targets (id, owner_type, owner_id, metric, target_value, period) VALUES (?, ?, ?, ?, ?, ?)",
        PERFORMANCE_TARGET_SEED,
    )
    conn.execute(
        """
        UPDATE project_fund_actuals
        SET receivable_id = 1
        WHERE id = 1 AND direction = '收款' AND receivable_id IS NULL
        """
    )
    receipt_plan = conn.execute(
        """
        SELECT id
        FROM project_fund_plans
        WHERE project_id = 1 AND plan_type = '收款计划'
        ORDER BY id
        LIMIT 1
        """
    ).fetchone()
    if receipt_plan:
        conn.execute(
            "UPDATE project_fund_actuals SET plan_id = ? WHERE id = 1 AND direction = '收款'",
            [receipt_plan["id"]],
        )
    conn.executemany(
        "INSERT OR IGNORE INTO project_fund_approvals (id, plan_id, action, from_status, to_status, operator_id, operated_at, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        SEED["project_fund_approvals"],
    )


def seed_erp_2024_contract(conn: sqlite3.Connection) -> None:
    suppliers = [
        (2401, "SUP-ERP-WS", "网思科技股份有限公司"),
        (2402, "SUP-ERP-HHYK", "北京和鸿盈科技术有限公司"),
        (2403, "SUP-ERP-KMW", "北京科迈网通讯技术有限公司"),
        (2404, "SUP-ERP-PDS", "普德施（北京）科技有限公司"),
        (2405, "SUP-ERP-SBX", "北京斯普信信息技术有限公司"),
        (2406, "SUP-ERP-KJ", "合肥凯捷技术有限公司"),
        (2407, "SUP-ERP-LXHF", "联信弘方（北京）科技股份有限公司"),
        (2408, "SUP-ERP-ZXWX", "深圳中兴网信科技有限公司"),
        (2409, "SUP-ERP-TW", "拓维信息系统股份有限公司"),
    ]
    conn.executemany(
        """
        INSERT OR IGNORE INTO suppliers
          (id, code, name, credit_code, type, contact_name, phone, email, status, effective_from, effective_to, remark)
        VALUES (?, ?, ?, '', '运营维护服务', '', '', '', '合作中', '2024-09-26', '', '2024年大ERP系统运营维护公开比选入围供应商')
        """,
        suppliers,
    )

    contract_id = 20240926
    conn.execute(
        """
        INSERT OR IGNORE INTO contracts
          (id, code, name, contract_attribute, contract_type, signing_subject, counterparty_name,
           signed_date, duration_months, total_amount, currency, tax_included, payment_terms,
           owner_department, status, effective_from, effective_to, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            contract_id,
            "ERP-OPS-2024",
            "2024年联通数字科技有限公司大ERP系统运营维护",
            "框架",
            "运营维护服务",
            "联通数字科技有限公司",
            "多家入围供应商",
            "2024-09-26",
            12,
            0,
            "CNY",
            "含税",
            "按框架协议和实际采购订单结算",
            "企业数智化事业部",
            "履行中",
            "2024-09-26",
            "",
            "公开比选，包含 ERP外延系统支撑、ERP核心系统支撑两个标段；价格来自 2024年大ERP维护招标入围厂商及价格（含税价）-2024.9.26.xls。",
        ],
    )

    lot_external = 2024092601
    lot_core = 2024092602
    conn.executemany(
        """
        INSERT OR IGNORE INTO contract_lots
          (id, contract_id, code, name, lot_type, budget_amount, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (lot_external, contract_id, "ERP-EXT", "ERP外延系统支撑", "运营维护标段", 0, "启用", "对应 Excel sheet：ERP外延"),
            (lot_core, contract_id, "ERP-CORE", "ERP核心系统支撑", "运营维护标段", 0, "启用", "对应 Excel sheet：ERP核心"),
        ],
    )

    external_agreements = {
        2401: ("SZ21-1001-2024-105135", "2024年联通数科大ERP系统运营维护服务框架协议-网思"),
        2402: ("SZ21-1001-2024-105137", "2024年联通数科大ERP系统运营维护服务框架协议-和鸿盈科"),
        2403: ("SZ21-1001-2024-105128", "2024年联通数科大ERP系统运营维护服务框架协议-北京科迈"),
        2404: ("SZ21-1001-2024-105126", "2024年联通数科大ERP系统运营维护服务框架协议-普德施"),
        2405: ("SZ21-1001-2024-105132", "2024年联通数科大ERP系统运营维护服务框架协议-斯普信"),
        2406: ("SZ21-1001-2024-105133", "2024年联通数科大ERP系统运营维护服务框架协议-合肥凯捷"),
        2407: ("SZ21-1001-2024-105136", "2024年联通数科大ERP系统运营维护服务框架协议-联信弘方"),
        2408: ("SZ21-1001-2024-105134", "2024年联通数科大ERP系统运营维护服务框架协议-深圳中兴"),
        2409: ("SZ21-1001-2024-105139", "2024年联通数科大ERP系统运营维护服务框架协议-拓维"),
    }
    external_prices = {
        2401: [10494, 12068.1, 13642.2, 15741, 17839.8, 19938.6, 23086.8, 29383.2],
        2402: [11766, 13530.9, 15295.8, 17649, 20002.2, 22355.4, 25885.2, 32944.8],
        2403: [11554, 13287.1, 15020.2, 17331, 19641.8, 21952.6, 25418.8, 32351.2],
        2404: [12500, 14375, 16250, 18750, 21250, 23750, 27500, 35000],
        2405: [11448, 13165.2, 14882.4, 17172, 19461.6, 21751.2, 25185.6, 32054.4],
        2406: [11448, 13165.2, 14882.4, 17172, 19461.6, 21751.2, 25185.6, 32054.4],
        2407: [11713, 13469.95, 15226.9, 17569.5, 19912.1, 22254.7, 25768.6, 32796.4],
        2408: [10918, 12555.7, 14193.4, 16377, 18560.6, 20744.2, 24019.6, 30570.4],
        2409: [11850.8, 13628.42, 15406.04, 17776.2, 20146.36, 22516.52, 26071.76, 33182.24],
    }
    core_prices = {
        2401: [11368.5, 13073.78, 14779.05, 16484.33, 18189.6, 20463.3, 22737, 25010.7, 28421.25, 34105.5],
        2402: [12614, 14506.1, 16398.2, 18290.3, 20182.4, 22705.2, 25228, 27750.8, 31535, 37842],
        2403: [12190, 14018.5, 15847, 17675.5, 19504, 21942, 24380, 26818, 30475, 36570],
        2404: [13500, 15525, 17550, 19575, 21600, 24300, 27000, 29700, 33750, 40500],
        2405: [12190, 14018.5, 15847, 17675.5, 19504, 21942, 24380, 26818, 30475, 36570],
        2406: [12402, 14262.3, 16122.6, 17982.9, 19843.2, 22323.6, 24804, 27284.4, 31005, 37206],
        2407: [12296, 14140.4, 15984.8, 17829.2, 19673.6, 22132.8, 24592, 27051.2, 30740, 36888],
        2408: [12508, 14384.2, 16260.4, 18136.6, 20012.8, 22514.4, 25016, 27517.6, 31270, 37524],
        2409: [12836.6, 14762.09, 16687.58, 18613.07, 20538.56, 23105.88, 25673.2, 28240.52, 32091.5, 38509.8],
    }

    price_rows = []
    external_grades = ["初级", "初中级", "中级", "中高一级", "中高二级", "中高三级", "高级", "专家"]
    core_grades = ["初级", "初中一级", "初中二级", "初中三级", "中级", "中高一级", "中高二级", "中高三级", "高级", "专家"]
    next_id = 202409260001
    for supplier_id, values in external_prices.items():
        agreement_code, agreement_name = external_agreements[supplier_id]
        for grade, price in zip(external_grades, values):
            price_rows.append((next_id, lot_external, supplier_id, "已入围", agreement_code, agreement_name, grade, "人月", price, 0.06, "2024-09-26", "2025-09-25", "有效", "ERP外延系统支撑含税投标报价"))
            next_id += 1
    for supplier_id, values in core_prices.items():
        for grade, price in zip(core_grades, values):
            price_rows.append((next_id, lot_core, supplier_id, "已入围", "", "", grade, "人月", price, 0.06, "2024-09-26", "2025-09-25", "有效", "ERP核心系统支撑含税投标报价"))
            next_id += 1
    conn.executemany(
        """
        INSERT OR IGNORE INTO lot_supplier_prices
          (id, lot_id, supplier_id, shortlist_status, agreement_code, agreement_name,
           price_item, price_unit, unit_price, tax_rate, effective_from, effective_to, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        price_rows,
    )


def seed_governance(conn: sqlite3.Connection) -> None:
    conn.executemany("INSERT OR IGNORE INTO roles VALUES (?, ?, ?, ?)", ROLES)
    conn.executemany("INSERT OR IGNORE INTO permissions VALUES (?, ?, ?, ?)", PERMISSIONS)
    if conn.execute("SELECT COUNT(*) AS count FROM role_permissions").fetchone()["count"] == 0:
        insert_default_role_permissions(conn)
    setting = conn.execute("SELECT value FROM app_settings WHERE key = 'role_permissions_page_customers_seeded'").fetchone()
    if not setting:
        for role_code, permission_codes in ROLE_PERMISSIONS.items():
            if "page.customers" in permission_codes:
                conn.execute("INSERT OR IGNORE INTO role_permissions VALUES (?, ?)", [role_code, "page.customers"])
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES (?, ?)", ["role_permissions_page_customers_seeded", today_iso()])
    performance_setting = conn.execute("SELECT value FROM app_settings WHERE key = 'role_permissions_page_performance_seeded'").fetchone()
    if not performance_setting:
        for role_code, permission_codes in ROLE_PERMISSIONS.items():
            if "page.performance" in permission_codes:
                conn.execute("INSERT OR IGNORE INTO role_permissions VALUES (?, ?)", [role_code, "page.performance"])
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES (?, ?)", ["role_permissions_page_performance_seeded", today_iso()])
    performance_all_roles_setting = conn.execute("SELECT value FROM app_settings WHERE key = 'role_permissions_page_performance_all_roles_seeded'").fetchone()
    if not performance_all_roles_setting:
        for role_code in {"general_manager", "operations", "director", "presales", "project_manager", "admin"}:
            conn.execute("INSERT OR IGNORE INTO role_permissions VALUES (?, ?)", [role_code, "page.performance"])
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES (?, ?)", ["role_permissions_page_performance_all_roles_seeded", today_iso()])
    timesheet_setting = conn.execute("SELECT value FROM app_settings WHERE key = 'role_permissions_timesheets_seeded'").fetchone()
    if not timesheet_setting:
        role_permissions = {
            "general_manager": ["page.timesheets", "timesheet.view"],
            "operations": ["page.timesheets", "timesheet.view", "timesheet.edit"],
            "director": ["page.timesheets", "timesheet.view"],
            "presales": ["page.timesheets", "timesheet.view", "timesheet.edit"],
            "project_manager": ["page.timesheets", "timesheet.view", "timesheet.edit"],
            "admin": ["page.timesheets", "timesheet.view", "timesheet.edit"],
        }
        for role_code, permission_codes in role_permissions.items():
            conn.executemany(
                "INSERT OR IGNORE INTO role_permissions VALUES (?, ?)",
                [(role_code, permission_code) for permission_code in permission_codes],
            )
        conn.execute("INSERT OR REPLACE INTO app_settings VALUES (?, ?)", ["role_permissions_timesheets_seeded", today_iso()])
    if conn.execute("SELECT COUNT(*) AS count FROM project_timesheets").fetchone()["count"] == 0:
        seed_timesheets(conn)


def seed_timesheets(conn: sqlite3.Connection) -> None:
    rows = [
        {"project_id": 1, "person_id": 5, "period_type": "周", "period_start": "2026-07-06", "entry_mode": "比例", "allocation_ratio": 0.6, "work_hours": 0, "work_content": "项目计划、客户沟通和交付协调", "status": "已提交", "created_by": 5},
        {"project_id": 1, "person_id": 6, "period_type": "周", "period_start": "2026-07-06", "entry_mode": "比例", "allocation_ratio": 0.5, "work_hours": 0, "work_content": "供应链配置和联调支持", "status": "草稿", "created_by": 6},
        {"project_id": 2, "person_id": 7, "period_type": "周", "period_start": "2026-07-06", "entry_mode": "小时", "allocation_ratio": 0, "work_hours": 6, "work_content": "核心功能问题分析和修复", "status": "已提交", "created_by": 7},
        {"project_id": 2, "person_id": 9, "period_type": "周", "period_start": "2026-07-06", "entry_mode": "小时", "allocation_ratio": 0, "work_hours": 3, "work_content": "方案材料和评审支持", "status": "草稿", "created_by": 9},
    ]
    for row in rows:
        snapshot = timesheet_cost_snapshot(conn, row["person_id"], row["entry_mode"], row["allocation_ratio"], row["work_hours"])
        row["period_label"] = period_label(row["period_type"], row["period_start"])
        row["submitted_by"] = row["created_by"] if row["status"] in {"已提交", "已确认"} else None
        row["submitted_at"] = today_iso() if row["status"] in {"已提交", "已确认"} else ""
        row["updated_at"] = today_iso()
        row.update(snapshot)
        columns = ", ".join(row.keys())
        placeholders = ", ".join(["?"] * len(row))
        conn.execute(f"INSERT INTO project_timesheets ({columns}) VALUES ({placeholders})", list(row.values()))


def insert_default_role_permissions(conn: sqlite3.Connection) -> None:
    for role_code, permission_codes in ROLE_PERMISSIONS.items():
        conn.executemany(
            "INSERT OR IGNORE INTO role_permissions VALUES (?, ?)",
            [(role_code, permission_code) for permission_code in permission_codes],
        )
    conn.execute(
        """
        INSERT OR IGNORE INTO persons (id, employee_no, real_name, photo_url, id_card, person_type, supplier_id, org_id, position, email, mobile, status, effective_from, effective_to)
        VALUES (10, 'EMP-010', '孙宁', '', '110101198510100010', '合同制', NULL, 1, '系统管理员', 'sunning@example.com', '13800000010', '在职', '2026-01-01', '')
        """
    )
    conn.execute(
        """
        INSERT OR IGNORE INTO users (id, username, password, person_id, name, role, org_id, status, email, effective_from, effective_to)
        VALUES (10, 'sunning', '123456', 10, '系统管理员-孙宁', 'admin', 1, '启用', 'sunning@example.com', '2026-01-01', '')
        """
    )
    users = conn.execute(
        """
        SELECT users.id, users.role, users.org_id, roles.data_scope AS role_data_scope
        FROM users
        LEFT JOIN roles ON roles.code = users.role
        """
    ).fetchall()
    conn.execute("DELETE FROM data_scopes")
    for user in users:
        scope_type, scope_id, level = default_scope_for_user(user)
        conn.execute(
            """
            INSERT OR IGNORE INTO data_scopes (user_id, scope_type, scope_id, permission_level)
            VALUES (?, ?, ?, ?)
            """,
            [user["id"], scope_type, scope_id, level],
        )


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed = urllib.parse.urlparse(path)
        if parsed.path.startswith("/api/"):
            return str(STATIC_DIR / "index.html")
        rel = parsed.path.lstrip("/") or "index.html"
        return str(STATIC_DIR / rel)

    def end_headers(self) -> None:
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            if parsed.path == "/":
                self.path = "/index.html"
            return super().do_GET()

        try:
            with connect() as conn:
                user = self.get_user(conn, parsed)
                if parsed.path == "/api/bootstrap":
                    self.json({"users": get_users(conn), "currentUser": user})
                elif parsed.path == "/api/control":
                    if not has_permission(user, "system.control"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无系统控制台权限")
                        return
                    self.json(get_control_panel(conn))
                elif parsed.path == "/api/dashboard":
                    if not has_permission(user, "dashboard.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无驾驶舱查看权限")
                        return
                    self.json(get_dashboard(conn, user))
                elif parsed.path == "/api/customers":
                    if not has_permission(user, "page.customers"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无客户管理页面权限")
                        return
                    self.json({"rows": get_customers(conn, user)})
                elif parsed.path == "/api/opportunities":
                    if not has_permission(user, "opportunity.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无商机查看权限")
                        return
                    self.json({"rows": get_opportunities(conn, user)})
                elif parsed.path == "/api/projects":
                    if not has_permission(user, "project.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无项目查看权限")
                        return
                    self.json({"rows": get_projects(conn, user)})
                elif parsed.path == "/api/timesheets":
                    if not has_permission(user, "timesheet.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无工时查看权限")
                        return
                    self.json(get_timesheets(conn, user))
                elif parsed.path == "/api/funds":
                    if not has_permission(user, "fund.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无项目资金查看权限")
                        return
                    self.json(get_project_funds(conn, user))
                elif parsed.path == "/api/forecasts":
                    if not has_permission(user, "forecast.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无经营预测查看权限")
                        return
                    self.json({"rows": get_forecasts(conn, user)})
                elif parsed.path == "/api/kpi":
                    if not has_permission(user, "kpi.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无 KPI 查看权限")
                        return
                    self.json({"rows": get_kpi(conn, user)})
                elif parsed.path == "/api/performance":
                    if not has_permission(user, "page.performance"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无绩效管理查看权限")
                        return
                    self.json(get_performance(conn, user))
                elif parsed.path == "/api/dispatch":
                    if not has_permission(user, "dispatch.view"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无调度查看权限")
                        return
                    self.json({"rows": get_dispatch_actions(conn, user)})
                elif parsed.path == "/api/governance":
                    if not has_system_access(user):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无系统管理权限")
                        return
                    self.json(get_governance(conn, user))
                elif parsed.path == "/api/ontology":
                    if not has_system_access(user):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无系统语义查看权限")
                        return
                    self.json(ontology_snapshot())
                elif parsed.path == "/api/llm-status":
                    if not has_system_access(user):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无模型网关查看权限")
                        return
                    self.json(llm_status())
                elif parsed.path == "/api/component-registry":
                    if not has_system_access(user):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无组件能力查看权限")
                        return
                    self.json(component_registry_snapshot())
                else:
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
        except Exception as exc:
            self.error(HTTPStatus.BAD_REQUEST, str(exc))

    def do_PATCH(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        try:
            payload = self.read_json()
            with connect() as conn:
                current_user = self.get_user(conn, parsed)
                parts = parsed.path.strip("/").split("/")
                if len(parts) != 3 or parts[0] != "api":
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
                    return
                if parts[1] == "opportunities":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "opportunity.edit") or not opportunity_visible_to_user(conn, current_user, row_id):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该商机维护权限")
                        return
                    validate_opportunity_payload(payload)
                    row = update_row(
                        conn,
                        "opportunities",
                        row_id,
                        {"stage", "probability", "expected_sign_month", "next_action", "risk_level", "updated_at"},
                        payload,
                    )
                elif parts[1] == "projects":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "project.edit") or not project_visible_to_user(conn, current_user, row_id):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该项目维护权限")
                        return
                    validate_project_payload(payload)
                    row = update_row(
                        conn,
                        "projects",
                        row_id,
                        {"status", "phase", "progress", "health", "planned_end"},
                        payload,
                    )
                elif parts[1] == "timesheets":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "timesheet.edit"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无工时维护权限")
                        return
                    row = update_timesheet(conn, current_user, row_id, payload)
                elif parts[1] == "forecasts":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "forecast.edit") or not forecast_visible_to_user(conn, current_user, row_id):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该预测维护权限")
                        return
                    row = update_row(
                        conn,
                        "project_forecasts",
                        row_id,
                        {"forecast_revenue", "forecast_cost", "forecast_gross_profit", "forecast_cash_in", "resource_gap", "risk_note", "review_status"},
                        payload,
                    )
                elif parts[1] == "fund-plans":
                    row_id = int(parts[2])
                    row = update_fund_plan(conn, current_user, row_id, payload)
                elif parts[1] == "dispatch":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "dispatch.manage") or not dispatch_visible_to_user(conn, current_user, row_id):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该调度事项维护权限")
                        return
                    row = update_row(
                        conn,
                        "dispatch_actions",
                        row_id,
                        {"status", "progress_note", "priority", "due_date"},
                        payload,
                    )
                elif parts[1] == "kpi-targets":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "kpi.manage"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无绩效指标维护权限")
                        return
                    row = update_kpi_target(conn, current_user, row_id, payload)
                elif parts[1] == "performance-kpis":
                    row_id = int(parts[2])
                    row = update_performance_kpi(conn, current_user, row_id, payload)
                elif parts[1] == "users":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.users"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无用户管理权限")
                        return
                    row = update_row(
                        conn,
                        "users",
                        row_id,
                        {"username", "password", "person_id", "name", "role", "org_id", "status", "email", "effective_from", "effective_to"},
                        payload,
                    )
                    refresh_user_scope(conn, row_id)
                    conn.commit()
                elif parts[1] == "persons":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.persons"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无人员管理权限")
                        return
                    if "supplier_id" in payload and payload["supplier_id"] == "":
                        payload["supplier_id"] = None
                    for key in ("outsourcing_contract_id", "outsourcing_lot_id", "outsourcing_award_id", "outsourcing_price_id"):
                        if key in payload and payload[key] == "":
                            payload[key] = None
                    if payload.get("person_type") != "第三方":
                        payload["supplier_id"] = None
                        payload["outsourcing_contract_id"] = None
                        payload["outsourcing_lot_id"] = None
                        payload["outsourcing_award_id"] = None
                        payload["outsourcing_price_id"] = None
                    if payload.get("person_type") != "分公司":
                        payload["branch_company"] = ""
                    validate_person_payload(payload)
                    row = update_row(
                        conn,
                        "persons",
                        row_id,
                        {
                            "employee_no", "real_name", "photo_url", "id_card", "person_type", "branch_company", "supplier_id",
                            "outsourcing_contract_id", "outsourcing_lot_id", "outsourcing_award_id", "outsourcing_price_id",
                            "org_id", "position", "email", "mobile", "status", "effective_from", "effective_to",
                        },
                        payload,
                    )
                elif parts[1] == "suppliers":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.suppliers"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无供应商管理权限")
                        return
                    validate_supplier_payload(payload)
                    row = update_row(
                        conn,
                        "suppliers",
                        row_id,
                        {
                            "code",
                            "name",
                            "credit_code",
                            "type",
                            "contact_name",
                            "phone",
                            "email",
                            "status",
                            "effective_from",
                            "effective_to",
                            "remark",
                        },
                        payload,
                    )
                elif parts[1] == "supplier-agreements":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无协议/合同管理权限")
                        return
                    validate_supplier_agreement_payload(payload)
                    row = update_row(
                        conn,
                        "supplier_agreements",
                        row_id,
                        {
                            "supplier_id",
                            "code",
                            "name",
                            "agreement_type",
                            "signed_date",
                            "duration_months",
                            "bid_section",
                            "total_amount",
                            "personnel_rate_type",
                            "price_unit",
                            "unit_price",
                            "status",
                            "effective_from",
                            "effective_to",
                            "remark",
                        },
                        payload,
                    )
                elif parts[1] == "contracts":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无合同/协议管理权限")
                        return
                    validate_contract_payload(payload)
                    row = update_row(
                        conn,
                        "contracts",
                        row_id,
                        {
                            "code",
                            "name",
                            "contract_attribute",
                            "contract_type",
                            "signing_subject",
                            "counterparty_name",
                            "signed_date",
                            "duration_months",
                            "total_amount",
                            "currency",
                            "tax_included",
                            "payment_terms",
                            "owner_department",
                            "status",
                            "effective_from",
                            "effective_to",
                            "remark",
                        },
                        payload,
                    )
                elif parts[1] == "contract-lots":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无标段管理权限")
                        return
                    validate_contract_lot_payload(payload)
                    contract = conn.execute("SELECT effective_from, effective_to FROM contracts WHERE id = ?", [payload.get("contract_id")]).fetchone()
                    if contract and (payload.get("effective_from") < contract["effective_from"] or payload.get("effective_to") > contract["effective_to"]):
                        raise ValueError("标段有效期不能超过合同/协议有效期")
                    row = update_row(
                        conn,
                        "contract_lots",
                        row_id,
                        {"contract_id", "code", "name", "lot_type", "service_scope", "effective_from", "effective_to", "budget_amount", "status", "remark"},
                        payload,
                    )
                elif parts[1] == "lot-supplier-prices":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无供应商价格管理权限")
                        return
                    payload = normalize_lot_supplier_price_payload(conn, payload)
                    validate_lot_supplier_price_payload(payload)
                    assert_no_overlapping_price(conn, payload, row_id)
                    row = update_row(
                        conn,
                        "lot_supplier_prices",
                        row_id,
                        {"contract_id", "lot_id", "supplier_id", "shortlist_status", "agreement_code", "agreement_name", "personnel_type", "personnel_level", "price_item", "price_unit", "unit_price", "tax_rate", "effective_from", "effective_to", "status", "remark"},
                        payload,
                    )
                elif parts[1] == "lot-supplier-awards":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无入围供应商管理权限")
                        return
                    payload = normalize_lot_supplier_award_payload(conn, payload)
                    validate_lot_supplier_award_payload(payload)
                    assert_unique_lot_supplier_award(conn, payload, row_id)
                    row = update_row(
                        conn,
                        "lot_supplier_awards",
                        row_id,
                        {"contract_id", "lot_id", "supplier_id", "shortlist_status", "agreement_code", "agreement_name", "effective_from", "effective_to", "status", "remark"},
                        payload,
                    )
                elif parts[1] == "organizations":
                    row_id = int(parts[2])
                    if not has_permission(current_user, "system.orgs"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无组织管理权限")
                        return
                    if "parent_id" in payload and payload["parent_id"] == "":
                        payload["parent_id"] = None
                    if "parent_id" in payload:
                        assert_valid_parent(conn, row_id, payload["parent_id"])
                    row = update_row(
                        conn,
                        "organizations",
                        row_id,
                        {"code", "name", "type", "parent_id", "owner_id", "short_name", "leader_id", "sort_order", "status", "effective_from", "effective_to", "remark"},
                        payload,
                    )
                elif parts[1] == "roles":
                    if not has_permission(current_user, "system.permissions"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无权限管理权限")
                        return
                    role_code = parts[2]
                    permission_codes = payload.get("permission_codes", [])
                    conn.execute("DELETE FROM role_permissions WHERE role_code = ?", [role_code])
                    conn.executemany(
                        "INSERT OR IGNORE INTO role_permissions VALUES (?, ?)",
                        [(role_code, code) for code in permission_codes],
                    )
                    conn.commit()
                    row = {"code": role_code, "permission_codes": permission_codes}
                else:
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
                    return
                self.json({"row": row})
        except Exception as exc:
            self.error(HTTPStatus.BAD_REQUEST, str(exc))

    def do_DELETE(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        try:
            with connect() as conn:
                current_user = self.get_user(conn, parsed)
                parts = parsed.path.strip("/").split("/")
                if len(parts) != 3 or parts[0] != "api":
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
                    return
                if not has_permission(current_user, "system.contracts"):
                    self.error(HTTPStatus.FORBIDDEN, "当前角色无合同/协议管理权限")
                    return

                row_id = int(parts[2])
                if parts[1] == "contracts":
                    contract = conn.execute("SELECT id FROM contracts WHERE id = ?", [row_id]).fetchone()
                    if not contract:
                        raise ValueError("合同/协议不存在")
                    lots = conn.execute("SELECT id FROM contract_lots WHERE contract_id = ?", [row_id]).fetchall()
                    lot_ids = [lot["id"] for lot in lots]
                    if lot_ids:
                        placeholders = ", ".join(["?"] * len(lot_ids))
                        conn.execute(f"DELETE FROM lot_supplier_prices WHERE lot_id IN ({placeholders})", lot_ids)
                        conn.execute(f"DELETE FROM lot_supplier_awards WHERE lot_id IN ({placeholders})", lot_ids)
                    conn.execute("DELETE FROM lot_supplier_prices WHERE contract_id = ?", [row_id])
                    conn.execute("DELETE FROM lot_supplier_awards WHERE contract_id = ?", [row_id])
                    conn.execute("DELETE FROM contract_lots WHERE contract_id = ?", [row_id])
                    conn.execute("DELETE FROM contracts WHERE id = ?", [row_id])
                    conn.commit()
                    self.json({"ok": True, "deleted": {"contract": row_id, "lots": len(lot_ids)}})
                elif parts[1] == "contract-lots":
                    lot = conn.execute("SELECT id FROM contract_lots WHERE id = ?", [row_id]).fetchone()
                    if not lot:
                        raise ValueError("标段不存在")
                    conn.execute("DELETE FROM lot_supplier_prices WHERE lot_id = ?", [row_id])
                    conn.execute("DELETE FROM lot_supplier_awards WHERE lot_id = ?", [row_id])
                    conn.execute("DELETE FROM contract_lots WHERE id = ?", [row_id])
                    conn.commit()
                    self.json({"ok": True, "deleted": {"lot": row_id}})
                elif parts[1] == "lot-supplier-prices":
                    price = conn.execute("SELECT id FROM lot_supplier_prices WHERE id = ?", [row_id]).fetchone()
                    if not price:
                        raise ValueError("价格项不存在")
                    conn.execute("DELETE FROM lot_supplier_prices WHERE id = ?", [row_id])
                    conn.commit()
                    self.json({"ok": True, "deleted": {"price": row_id}})
                elif parts[1] == "lot-supplier-awards":
                    award = conn.execute("SELECT * FROM lot_supplier_awards WHERE id = ?", [row_id]).fetchone()
                    if not award:
                        raise ValueError("入围供应商不存在")
                    conn.execute(
                        "DELETE FROM lot_supplier_prices WHERE contract_id = ? AND COALESCE(lot_id, 0) = COALESCE(?, 0) AND supplier_id = ?",
                        [award["contract_id"], award["lot_id"], award["supplier_id"]],
                    )
                    conn.execute("DELETE FROM lot_supplier_awards WHERE id = ?", [row_id])
                    conn.commit()
                    self.json({"ok": True, "deleted": {"award": row_id}})
                else:
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
        except Exception as exc:
            self.error(HTTPStatus.BAD_REQUEST, str(exc))

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        try:
            payload = self.read_json()
            with connect() as conn:
                if parsed.path == "/api/login":
                    self.json({"user": login_user(conn, payload)})
                    return
                user = self.get_user(conn, parsed)
                parts = parsed.path.strip("/").split("/")
                if len(parts) == 4 and parts[0] == "api" and parts[1] == "opportunities" and parts[3] == "convert-project":
                    self.json({"row": convert_opportunity_to_project(conn, user, int(parts[2]), payload)})
                elif len(parts) == 4 and parts[0] == "api" and parts[1] == "performance-kpis" and parts[3] == "copy-version":
                    self.json({"row": copy_performance_kpi_version(conn, user, int(parts[2]), payload)})
                elif parsed.path == "/api/dispatch":
                    if not has_permission(user, "dispatch.manage"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无调度发起权限")
                        return
                    owner_id = int(payload.get("owner_id") or user["id"])
                    org_id = int(payload.get("org_id") or user["org_id"])
                    project_id = payload.get("project_id") or None
                    opportunity_id = payload.get("opportunity_id") or None
                    if scope_kind(user) == "org" and org_id != int(user["org_id"]):
                        self.error(HTTPStatus.FORBIDDEN, "不能为其他业务组发起调度")
                        return
                    if project_id and not project_visible_to_user(conn, user, int(project_id)):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该项目调度权限")
                        return
                    if opportunity_id and not opportunity_visible_to_user(conn, user, int(opportunity_id)):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无该商机调度权限")
                        return
                    conn.execute(
                        """
                        INSERT INTO dispatch_actions
                          (title, source_type, owner_id, org_id, project_id, opportunity_id, priority, due_date, status, progress_note)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        [
                            payload.get("title", "新的调度事项"),
                            payload.get("source_type", "经营调度"),
                            owner_id,
                            org_id,
                            project_id,
                            opportunity_id,
                            payload.get("priority", "中"),
                            payload.get("due_date", "2026-07-15"),
                            payload.get("status", "待处理"),
                            payload.get("progress_note", ""),
                        ],
                    )
                    conn.commit()
                    self.json({"ok": True})
                elif parsed.path == "/api/fund-plans":
                    self.json({"row": create_fund_plan(conn, user, payload)})
                elif parsed.path == "/api/fund-actuals":
                    self.json({"row": create_fund_actual(conn, user, payload)})
                elif parsed.path == "/api/timesheets":
                    if not has_permission(user, "timesheet.edit"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无工时填报权限")
                        return
                    self.json({"row": create_timesheet(conn, user, payload)})
                elif parsed.path == "/api/performance-kpis":
                    self.json({"row": create_performance_kpi(conn, user, payload)})
                elif parsed.path == "/api/users":
                    if not has_permission(user, "system.users"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无用户管理权限")
                        return
                    self.json({"row": create_user(conn, payload)})
                elif parsed.path == "/api/persons":
                    if not has_permission(user, "system.persons"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无人员管理权限")
                        return
                    self.json({"row": create_person(conn, payload)})
                elif parsed.path == "/api/suppliers":
                    if not has_permission(user, "system.suppliers"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无供应商管理权限")
                        return
                    self.json({"row": create_supplier(conn, payload)})
                elif parsed.path == "/api/supplier-agreements":
                    if not has_permission(user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无协议/合同管理权限")
                        return
                    self.json({"row": create_supplier_agreement(conn, payload)})
                elif parsed.path == "/api/contracts":
                    if not has_permission(user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无合同/协议管理权限")
                        return
                    self.json({"row": create_contract(conn, payload)})
                elif parsed.path == "/api/contract-lots":
                    if not has_permission(user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无标段管理权限")
                        return
                    self.json({"row": create_contract_lot(conn, payload)})
                elif parsed.path == "/api/lot-supplier-prices":
                    if not has_permission(user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无供应商价格管理权限")
                        return
                    self.json({"row": create_lot_supplier_price(conn, payload)})
                elif parsed.path == "/api/lot-supplier-awards":
                    if not has_permission(user, "system.contracts"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无入围供应商管理权限")
                        return
                    self.json({"row": create_lot_supplier_award(conn, payload)})
                elif parsed.path == "/api/organizations":
                    if not has_permission(user, "system.orgs"):
                        self.error(HTTPStatus.FORBIDDEN, "当前角色无组织管理权限")
                        return
                    self.json({"row": create_organization(conn, payload)})
                else:
                    self.error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
        except Exception as exc:
            self.error(HTTPStatus.BAD_REQUEST, str(exc))

    def get_user(self, conn: sqlite3.Connection, parsed: urllib.parse.ParseResult) -> dict:
        query = urllib.parse.parse_qs(parsed.query)
        user_id = int(query.get("user_id", ["1"])[0])
        return user_context(conn, user_id)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        return json.loads(body or "{}")

    def json(self, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def error(self, status: HTTPStatus, message: str) -> None:
        body = json.dumps({"error": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Project BI MVP running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
