const state = {
  userId: 0,
  users: [],
  currentUser: null,
  view: "dashboard",
  data: {},
  selectedCustomerId: Number(localStorage.getItem("projectBiSelectedCustomerId") || 0),
  selectedOrgId: Number(localStorage.getItem("projectBiSelectedOrgId") || 0),
  performancePeriodType: localStorage.getItem("projectBiPerformancePeriodType") || "年度",
  selectedPerformanceYear: localStorage.getItem("projectBiSelectedPerformanceYear") || "2026",
  selectedPerformanceOrgId: Number(localStorage.getItem("projectBiSelectedPerformanceOrgId") || 0),
  selectedKpiCategory: localStorage.getItem("projectBiSelectedKpiCategory") || "全部",
  orgSearch: "",
  orgChartShowPeople: localStorage.getItem("projectBiOrgChartShowPeople") === "true",
  timesheetPeriodType: localStorage.getItem("projectBiTimesheetPeriodType") || "全部",
  timesheetEntryMode: localStorage.getItem("projectBiTimesheetEntryMode") || "全部",
};

const views = [
  ["control", "系统控制台", "page.control"],
  ["dashboard", "经营驾驶舱", "page.dashboard"],
  ["customers", "客户管理", "page.customers"],
  ["opportunities", "商机管理", "page.opportunities"],
  ["projects", "项目中心", "page.projects"],
  ["timesheets", "项目工时管理", "page.timesheets"],
  ["fundOverview", "资金总览", "page.funds"],
  ["fundReceipts", "收款管理", "page.funds"],
  ["fundPayments", "支出管理", "page.funds"],
  ["fundWarnings", "资金预警", "page.funds"],
  ["fundApprovals", "审批记录", "page.funds"],
  ["forecasts", "经营预测", "page.forecasts"],
  ["performanceBoard", "绩效看板", "page.performance"],
  ["performanceCatalog", "KPI 指标库", "page.performance"],
  ["performancePlan", "绩效方案管理", "page.performance"],
  ["performance", "组织绩效目标", "page.performance"],
  ["performanceCompletion", "完成值填报", "page.performance"],
  ["performanceScoring", "绩效评价计分", "page.performance"],
  ["kpi", "KPI 跟踪", "page.kpi"],
  ["dispatch", "调度动作", "page.dispatch"],
  ["userAdmin", "用户管理", "page.userAdmin"],
  ["personAdmin", "人员管理", "page.personAdmin"],
  ["orgInfoAdmin", "组织信息维护", "page.orgAdmin"],
  ["orgChart", "组织架构图", "page.orgAdmin"],
  ["supplierAdmin", "供应商管理", "page.supplierAdmin"],
  ["contractAdmin", "合同/协议管理", "page.contractAdmin"],
  ["orgAdmin", "组织管理", "page.orgAdmin"],
  ["permissionAdmin", "权限管理", "page.permissionAdmin"],
  ["menuSettings", "菜单设置", "system.control"],
];

const viewMeta = Object.fromEntries(views.map(([id, label, permission]) => [id, { label, permission }]));

const defaultMenuGroups = [
  {
    id: "cockpit",
    label: "驾驶舱",
    visible: true,
    items: [
      { id: "dashboard", visible: true },
      { id: "forecasts", visible: true },
      { id: "dispatch", visible: true },
    ],
  },
  {
    id: "orgPerformance",
    label: "组织绩效管理",
    visible: true,
    items: [
      { id: "performanceBoard", visible: true },
      { id: "performanceCatalog", visible: true },
      { id: "performancePlan", visible: true },
      { id: "performance", visible: true },
      { id: "performanceCompletion", visible: true },
      { id: "performanceScoring", visible: true },
    ],
  },
  {
    id: "project",
    label: "项目管理",
    visible: true,
    items: [
      { id: "customers", visible: true },
      { id: "opportunities", visible: true },
      { id: "projects", visible: true },
      { id: "timesheets", visible: true },
    ],
  },
  {
    id: "fund",
    label: "项目资金管理",
    visible: true,
    items: [
      { id: "fundOverview", visible: true },
      { id: "fundReceipts", visible: true },
      { id: "fundPayments", visible: true },
      { id: "fundWarnings", visible: true },
      { id: "fundApprovals", visible: true },
    ],
  },
  {
    id: "supplier",
    label: "供应商管理",
    visible: true,
    items: [
      { id: "supplierAdmin", visible: true },
    ],
  },
  {
    id: "contract",
    label: "合同管理",
    visible: true,
    items: [
      { id: "contractAdmin", visible: true },
    ],
  },
  {
    id: "organization",
    label: "组织管理",
    visible: true,
    items: [
      { id: "orgInfoAdmin", visible: true },
      { id: "orgChart", visible: true },
    ],
  },
  {
    id: "humanResources",
    label: "人力资源管理",
    visible: true,
    items: [
      { id: "personAdmin", visible: true },
    ],
  },
  {
    id: "system",
    label: "系统管理",
    visible: true,
    items: [
      { id: "control", visible: true },
      { id: "userAdmin", visible: true },
      { id: "permissionAdmin", visible: true },
      { id: "menuSettings", visible: true },
    ],
  },
];

const MENU_CONFIG_VERSION = "2026-07-04-timesheet-v1";

const roleNames = {
  general_manager: "总经理",
  operations: "经营管理人员",
  director: "业务组总监",
  project_manager: "项目经理",
  presales: "售前人员",
  admin: "系统管理员",
};

const opportunityStages = ["线索", "初步接触", "需求确认", "方案交流", "立项推进", "投标报价", "商务谈判", "赢单转项目", "输单关闭"];
const kpiCategories = ["经营", "价值创造", "风险防控", "关键工作", "能力建设"];
const branchCompanies = [
  "北京分公司", "天津分公司", "河北分公司", "山西分公司", "内蒙古分公司",
  "辽宁分公司", "吉林分公司", "黑龙江分公司", "上海分公司", "江苏分公司",
  "浙江分公司", "安徽分公司", "福建分公司", "江西分公司", "山东分公司",
  "河南分公司", "湖北分公司", "湖南分公司", "广东分公司", "广西分公司",
  "海南分公司", "重庆分公司", "四川分公司", "贵州分公司", "云南分公司",
  "陕西分公司", "甘肃分公司", "青海分公司", "宁夏分公司", "新疆分公司",
];

const pageText = {
  control: ["系统控制台", "账号、角色、权限、菜单和数据范围的系统总览"],
  dashboard: ["经营驾驶舱", "按当前角色的数据范围展示经营指标、预测、KPI 和风险"],
  customers: ["客户管理", "以客户为主线查看商机全过程和项目关联"],
  opportunities: ["商机管理", "线索是商机早期阶段，按阶段推进、看板跟踪并转项目"],
  projects: ["项目中心", "项目经理维护执行过程，管理层按权限穿透查看"],
  timesheets: ["项目工时管理", "按周/月填报人员在项目上的投入比例或工作时长，形成项目人工成本基础"],
  fundOverview: ["资金总览", "按项目汇总资金计划、实际执行和净现金情况"],
  fundReceipts: ["收款管理", "管理收款计划、实际回款、应收账款和欠款账龄"],
  fundPayments: ["支出管理", "管理支出计划和实际付款，项目有钱后才能支出"],
  fundWarnings: ["资金预警", "自动识别回款滞后、付款压力和净现金缺口"],
  fundApprovals: ["审批记录", "查看资金计划从提交到生效的审批轨迹"],
  forecasts: ["经营预测", "项目预测自下而上填报，业务组审核后汇总"],
  performanceBoard: ["绩效看板", "查看组织绩效完成率、年度/季度进度、预警、排名和差距"],
  performanceCatalog: ["KPI 指标库", "独立维护 KPI 主数据，定义指标是什么，不挂具体组织目标"],
  performancePlan: ["绩效方案管理", "按年度选择 KPI 指标并形成方案版本，隔离不同年度口径"],
  performance: ["组织绩效目标", "以组织为核心维护年度 KPI，并在同一功能中完成下级分解和季度拆分"],
  performanceCompletion: ["完成值填报", "各组织按周期填报实际完成值、说明、状态和附件材料"],
  performanceScoring: ["绩效评价计分", "根据计分规则计算建议得分，并支持人工评价和结果确认"],
  kpi: ["KPI 跟踪", "目标、实际、预测和差距的管理视图"],
  dispatch: ["调度动作", "把经营分析转成有责任人和截止日期的闭环动作"],
  userAdmin: ["用户管理", "维护登录账号、关联人员、角色和启停状态"],
  personAdmin: ["人员管理", "维护真实人员信息，账号通过人员关联到组织和岗位"],
  orgInfoAdmin: ["组织信息维护", "维护组织主数据、层级关系、负责人、状态和生效周期"],
  orgChart: ["组织架构图", "图形化查看组织层级、负责人、人数和节点详情"],
  supplierAdmin: ["供应商管理", "维护第三方、分公司和采购供应商主数据"],
  contractAdmin: ["合同/协议管理", "统一维护框架协议、标段、入围供应商及价格，支撑外包资源采购和结算。"],
  orgAdmin: ["组织信息维护", "维护组织主数据、层级关系、负责人、状态和生效周期"],
  permissionAdmin: ["权限管理", "查看和维护角色权限矩阵"],
  menuSettings: ["菜单设置", "维护左侧菜单分组、显示项和本地个性化配置"],
};

async function api(path, options = {}) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`/api/${path}${separator}user_id=${state.userId}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

async function init() {
  bindLogin();
  localStorage.removeItem("projectBiUserId");
  localStorage.removeItem("projectBiSessionUserId");
  showLogin();
}

function bindLogin() {
  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await login(String(form.get("username") || ""), String(form.get("password") || ""));
  });
  document.querySelectorAll("[data-demo-login]").forEach((button) => {
    button.addEventListener("click", async () => {
      await login(button.dataset.demoLogin, "123456");
    });
  });
  document.querySelector("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem("projectBiUserId");
    localStorage.removeItem("projectBiSessionUserId");
    state.userId = 0;
    state.currentUser = null;
    state.users = [];
    state.data = {};
    showLogin();
  });
}

async function login(username, password) {
  const error = document.querySelector("#loginError");
  error.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "登录失败");
    state.userId = data.user.id;
    const bootstrap = await api("bootstrap");
    state.users = bootstrap.users;
    state.currentUser = bootstrap.currentUser;
    state.view = hasPermission("page.control") ? "control" : "dashboard";
    showApp();
    renderAccount();
    renderNav();
    await loadView();
  } catch (err) {
    error.textContent = err.message;
  }
}

function showLogin() {
  document.body.classList.add("auth-mode");
  document.querySelector("#loginScreen").hidden = false;
  document.querySelector(".sidebar").hidden = true;
  document.querySelector(".app").hidden = true;
  document.querySelector("#loginError").textContent = "";
  document.querySelector('[name="username"]').focus();
}

function showApp() {
  document.body.classList.remove("auth-mode");
  document.querySelector("#loginScreen").hidden = true;
  document.querySelector(".sidebar").hidden = false;
  document.querySelector(".app").hidden = false;
}

function renderNav() {
  const nav = document.querySelector("#nav");
  const visibleViews = views.filter(([, , permission]) => hasPermission(permission));
  const visibleIds = new Set(visibleViews.map(([id]) => id));
  const menuGroups = menuConfig()
    .filter((group) => group.visible !== false)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.id === "menuSettings" ? visibleIds.has(item.id) : item.visible !== false && visibleIds.has(item.id)),
    }))
    .filter((group) => group.items.length);
  const detailParent = state.view.startsWith("personDetail:") || state.view.startsWith("personEdit:")
    ? "personAdmin"
    : state.view.startsWith("contractDetail:")
      ? "contractAdmin"
      : null;
  const navAvailableIds = new Set(menuGroups.flatMap((group) => group.items.map((item) => item.id)));
  if (!detailParent && !navAvailableIds.has(state.view)) {
    state.view = menuGroups[0]?.items[0]?.id || visibleViews[0]?.[0] || "dashboard";
  }
  const activeView = detailParent || state.view;
  const collapsed = collapsedMenuGroups();
  nav.innerHTML = `
    <div class="nav-groups">
      ${menuGroups.map((group) => renderNavGroup(group, activeView, collapsed)).join("")}
    </div>
  `;
  nav.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.view;
      renderNav();
      await loadView();
    });
  });
  nav.querySelectorAll("[data-menu-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = collapsedMenuGroups();
      if (next.has(button.dataset.menuToggle)) next.delete(button.dataset.menuToggle);
      else next.add(button.dataset.menuToggle);
      localStorage.setItem("projectBiCollapsedMenus", JSON.stringify(Array.from(next)));
      renderNav();
    });
  });
}

function renderNavGroup(group, activeView, collapsed) {
  const isCollapsed = collapsed.has(group.id);
  const isActive = group.items.some((item) => item.id === activeView);
  return `
    <section class="nav-group ${isActive ? "open" : ""}">
      <button class="nav-group-title" data-menu-toggle="${group.id}" type="button">
        <span>${escapeHtml(group.label)}</span>
        <strong>${isCollapsed ? "+" : "−"}</strong>
      </button>
      <div class="nav-children" ${isCollapsed ? "hidden" : ""}>
        ${group.items
          .map((item) => renderNavItem(item, activeView))
          .join("")}
      </div>
    </section>
  `;
}

function renderNavItem(item, activeView) {
  const meta = viewMeta[item.id] || { label: item.id };
  return `<button class="nav-item ${item.id === activeView ? "active" : ""}" data-view="${item.id}" type="button">${escapeHtml(meta.label)}</button>`;
}

function menuConfig() {
  try {
    const savedVersion = localStorage.getItem("projectBiMenuConfigVersion");
    if (savedVersion !== MENU_CONFIG_VERSION) {
      localStorage.removeItem("projectBiMenuConfig");
      localStorage.setItem("projectBiMenuConfigVersion", MENU_CONFIG_VERSION);
    }
    const saved = JSON.parse(localStorage.getItem("projectBiMenuConfig") || "null");
    if (Array.isArray(saved)) return normalizeMenuConfig(saved);
  } catch {
    // ignore invalid local customization
  }
  return normalizeMenuConfig(defaultMenuGroups);
}

function normalizeMenuConfig(groups) {
  const used = new Set();
  const normalized = groups
    .map((group) => {
      const defaultGroup = defaultMenuGroups.find((item) => item.id === group.id);
      const sourceItems = Array.isArray(group.items) ? group.items : defaultGroup?.items || [];
      const items = sourceItems
        .filter((item) => viewMeta[item.id] && !used.has(item.id))
        .map((item) => {
          used.add(item.id);
          return { id: item.id, visible: item.visible !== false };
        });
      return {
        id: group.id || defaultGroup?.id,
        label: String(group.label || defaultGroup?.label || "菜单分组").slice(0, 12),
        visible: group.id === "system" ? true : group.visible !== false,
        items,
      };
    })
    .filter((group) => group.id && group.items.length);
  defaultMenuGroups.forEach((group) => {
    const missing = group.items.filter((item) => !used.has(item.id));
    if (missing.length) {
      const targetGroup = normalized.find((item) => item.id === group.id);
      if (targetGroup) targetGroup.items.push(...missing.map((item) => ({ ...item })));
      else normalized.push({ ...group, items: missing.map((item) => ({ ...item })) });
    }
  });
  return normalized;
}

function collapsedMenuGroups() {
  try {
    return new Set(JSON.parse(localStorage.getItem("projectBiCollapsedMenus") || "[]"));
  } catch {
    return new Set();
  }
}

function renderMenuSettingsPage() {
  const content = document.querySelector("#content");
  const current = menuConfig();
  content.innerHTML = `
    <section class="panel">
      <form id="menuForm">
        <div class="panel-header">
          <h2>左侧菜单配置</h2>
          <div class="actions">
            <button type="button" class="secondary" id="resetMenu">恢复预设</button>
            <button type="submit" value="save" class="primary">保存配置</button>
          </div>
        </div>
        <div class="panel-body menu-config" id="menuFields">
          ${current.map(renderMenuSettingsGroup).join("")}
        </div>
      </form>
    </section>
  `;
  document.querySelector("#resetMenu").onclick = () => {
    localStorage.removeItem("projectBiMenuConfig");
    localStorage.removeItem("projectBiCollapsedMenus");
    localStorage.setItem("projectBiMenuConfigVersion", MENU_CONFIG_VERSION);
    renderNav();
    renderMenuSettingsPage();
  };
  document.querySelector("#menuForm").onsubmit = (event) => {
    event.preventDefault();
    const payload = current.map((group) => ({
      id: group.id,
      label: document.querySelector(`[name="menu_label_${group.id}"]`).value.trim() || group.label,
      visible: group.id === "system" ? true : document.querySelector(`[name="menu_visible_${group.id}"]`).checked,
      items: group.items.map((item) => ({
        id: item.id,
        visible: item.id === "menuSettings" ? true : document.querySelector(`[name="menu_item_${group.id}_${item.id}"]`).checked,
      })),
    }));
    localStorage.setItem("projectBiMenuConfig", JSON.stringify(payload));
    localStorage.setItem("projectBiMenuConfigVersion", MENU_CONFIG_VERSION);
    renderNav();
    renderMenuSettingsPage();
  };
}

function renderMenuSettingsGroup(group) {
  return `
    <section class="menu-config-group">
      <label class="checkbox-row">
        <input type="checkbox" name="menu_visible_${group.id}" ${group.visible !== false ? "checked" : ""} ${group.id === "system" ? "disabled" : ""} />
        <span>${group.id === "system" ? "系统分组固定显示" : "显示分组"}</span>
      </label>
      <label class="field">
        <span>分组名称</span>
        <input name="menu_label_${group.id}" maxlength="12" value="${escapeHtml(group.label)}" />
      </label>
      <div class="menu-item-list">
        ${group.items
          .filter((item) => item.id !== "menuSettings")
          .map((item) => `
            <label class="checkbox-row">
              <input type="checkbox" name="menu_item_${group.id}_${item.id}" ${item.visible !== false ? "checked" : ""} />
              <span>${escapeHtml(viewMeta[item.id]?.label || item.id)}</span>
            </label>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderAccount() {
  const user = currentUser();
  document.querySelector("#accountName").textContent = user ? `${user.username}｜${user.real_name || user.name}` : "未登录";
  document.querySelector("#accountRole").textContent = user ? `${user.role_name || roleNames[user.role] || user.role}｜${user.org_name || "全局"}` : "-";
}

function currentUser() {
  return state.currentUser || state.users.find((user) => Number(user.id) === Number(state.userId));
}

function hasSystemAccess() {
  return ["system.users", "system.orgs", "system.permissions", "system.contracts"].some((permission) => hasPermission(permission));
}

function hasPermission(permission) {
  const user = currentUser();
  if (!user || !permission) return false;
  return new Set(user.permission_codes || []).has(permission);
}

async function loadView() {
  if (state.view.startsWith("personEdit:")) {
    state.data.governance = await api("governance");
    renderPersonEditPage(Number(state.view.split(":")[1]));
    return;
  }
  if (state.view.startsWith("personDetail:")) {
    state.data.governance = await api("governance");
    renderPersonDetail(Number(state.view.split(":")[1]));
    return;
  }
  if (state.view.startsWith("contractDetail:")) {
    state.data.governance = await api("governance");
    const [, contractId, nodeKey = "contract"] = state.view.split(":");
    renderContractDetail(Number(contractId), nodeKey);
    return;
  }
  const [title, subtitle] = pageText[state.view];
  document.querySelector("#pageTitle").textContent = title;
  document.querySelector("#pageSubtitle").textContent = subtitle;

  if (state.view === "menuSettings") {
    renderMenuSettingsPage();
  } else if (state.view === "control") {
    state.data.control = await api("control");
    renderControlPanel();
  } else if (state.view === "dashboard") {
    state.data.dashboard = await api("dashboard");
    renderDashboard();
  } else if (state.view === "customers") {
    state.data.customers = await api("customers");
    state.data.opportunities = await api("opportunities");
    state.data.projects = await api("projects");
    renderCustomersView();
  } else if (state.view === "opportunities") {
    state.data.opportunities = await api("opportunities");
    state.data.projects = await api("projects");
    renderOpportunityManagement();
  } else if (state.view === "timesheets") {
    state.data.timesheets = await api("timesheets");
    renderTimesheetManagement();
  } else if (isFundView(state.view)) {
    state.data.funds = await api("funds");
    renderFundsView(state.view);
  } else if (state.view === "performance") {
    state.data.performance = await api("performance");
    renderPerformanceView();
  } else if (["performanceBoard", "performanceCatalog", "performancePlan", "performanceCompletion", "performanceScoring"].includes(state.view)) {
    state.data.performance = await api("performance");
    renderPerformanceModuleView(state.view);
  } else if (["userAdmin", "personAdmin", "supplierAdmin", "contractAdmin", "orgAdmin", "orgInfoAdmin", "orgChart", "permissionAdmin"].includes(state.view)) {
    state.data.governance = await api("governance");
    renderGovernanceView(state.view);
  } else {
    const endpoint = state.view === "kpi" ? "kpi" : state.view;
    state.data[state.view] = await api(endpoint);
    renderListView(state.view);
  }
}

function isFundView(view) {
  return ["fundOverview", "fundReceipts", "fundPayments", "fundWarnings", "fundApprovals"].includes(view);
}

function renderDashboard() {
  const data = state.data.dashboard;
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="dashboard-widget-grid">
      ${data.cards.map((card, index) => `
        <div class="dashboard-widget" data-widget-index="${index}" gs-x="${(index % 4) * 3}" gs-y="${Math.floor(index / 4) * 2}" gs-w="3" gs-h="2">
          <div class="grid-stack-item-content">${renderCard(card)}</div>
        </div>
      `).join("")}
    </section>
    <section class="dashboard-chart-grid">
      <div class="panel">
        <div class="panel-header"><h2>KPI 完成</h2><span class="status">${data.user.role_name || roleNames[data.user.role] || data.user.role}</span></div>
        <div class="panel-body chart-panel-body">
          <div id="dashboardKpiChart" class="dashboard-chart"></div>
          <div class="chart-fallback">${renderKpiBars(data.kpi)}</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>商机阶段</h2><span class="status">储备结构</span></div>
        <div class="panel-body chart-panel-body">
          <div id="dashboardOpportunityChart" class="dashboard-chart"></div>
          <div class="chart-fallback">${renderBars(data.opportunityStages)}</div>
        </div>
      </div>
    </section>
    <section class="grid two-col" style="margin-top:16px">
      <div class="panel">
        <div class="panel-header"><h2>重点项目</h2><button class="table-action" data-go="projects">查看全部</button></div>
        ${table(data.projects, projectColumns(false))}
      </div>
      <div class="panel">
        <div class="panel-header"><h2>调度动作</h2><button class="table-action" data-go="dispatch">查看全部</button></div>
        ${table(data.actions, dispatchColumns(false))}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>重点商机</h2><button class="table-action" data-go="opportunities">查看全部</button></div>
      ${table(data.opportunities, opportunityColumns(false))}
    </section>
  `;
  content.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.go;
      renderNav();
      await loadView();
    });
  });
  enhanceDashboardIntegrations(data);
}

async function enhanceDashboardIntegrations(data) {
  try {
    const { createChart, createDashboardLayout } = await import("/js/integrations/report-builder.js");
    const layoutEl = document.querySelector(".dashboard-widget-grid");
    if (layoutEl && window.innerWidth >= 1180) {
      layoutEl.classList.add("grid-stack");
      layoutEl.querySelectorAll(".dashboard-widget").forEach((item) => item.classList.add("grid-stack-item"));
      await createDashboardLayout(layoutEl, { cellHeight: 76, margin: 10 });
      layoutEl.classList.add("integrated");
    }
    const kpiEl = document.querySelector("#dashboardKpiChart");
    if (kpiEl && data.kpi?.length) {
      const chart = await createChart(kpiEl, dashboardKpiChartOption(data.kpi));
      kpiEl.closest(".chart-panel-body")?.classList.add("chart-ready");
      setTimeout(() => chart.resize(), 60);
    }
    const opportunityEl = document.querySelector("#dashboardOpportunityChart");
    if (opportunityEl && data.opportunityStages?.length) {
      const chart = await createChart(opportunityEl, dashboardOpportunityChartOption(data.opportunityStages));
      opportunityEl.closest(".chart-panel-body")?.classList.add("chart-ready");
      setTimeout(() => chart.resize(), 60);
    }
  } catch (error) {
    console.warn("驾驶舱开源组件加载失败，使用基础图表。", error);
  }
}

function dashboardKpiChartOption(rows) {
  const items = rows.slice(0, 8).reverse();
  return {
    grid: { left: 120, right: 28, top: 18, bottom: 28 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "value",
      max: 120,
      axisLabel: { formatter: "{value}%" },
    },
    yAxis: {
      type: "category",
      data: items.map((row) => `${row.owner_name || ""}｜${row.metric || row.name || ""}`),
      axisLabel: { width: 110, overflow: "truncate" },
    },
    series: [{
      name: "完成率",
      type: "bar",
      data: items.map((row) => Number(row.completion_rate || 0)),
      itemStyle: { color: "#2563eb", borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", formatter: "{c}%" },
    }],
  };
}

function dashboardOpportunityChartOption(rows) {
  return {
    grid: { left: 52, right: 18, top: 18, bottom: 54 },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: rows.map((row) => row.name),
      axisLabel: { rotate: 28, interval: 0 },
    },
    yAxis: { type: "value", name: "万元" },
    series: [{
      name: "商机金额",
      type: "bar",
      data: rows.map((row) => Number(row.value || 0)),
      itemStyle: { color: "#0f766e", borderRadius: [4, 4, 0, 0] },
    }],
  };
}

function renderControlPanel() {
  const data = state.data.control;
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="grid cards">
      ${data.cards.map(renderCard).join("")}
    </section>
    <section class="grid two-col" style="margin-top:16px">
      <div class="panel">
        <div class="panel-header"><h2>系统风险</h2><span class="status">账号/人员一致性</span></div>
        <div class="panel-body control-warnings">
          ${data.warnings.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>快捷入口</h2><span class="status">管理配置</span></div>
        <div class="panel-body quick-actions">
          ${[
            ["userAdmin", "账号管理"],
            ["personAdmin", "人员管理"],
            ["supplierAdmin", "供应商管理"],
            ["contractAdmin", "合同/协议"],
            ["orgInfoAdmin", "组织维护"],
            ["permissionAdmin", "权限矩阵"],
          ].map(([view, label]) => `<button class="secondary" data-go="${view}">${label}</button>`).join("")}
        </div>
      </div>
    </section>
    <section class="grid two-col" style="margin-top:16px">
      <div class="panel">
        <div class="panel-header"><h2>最近账号</h2><button class="table-action" data-go="userAdmin">维护账号</button></div>
        ${table(data.recentUsers, userColumns(), null)}
      </div>
      <div class="panel">
        <div class="panel-header"><h2>组织概览</h2><button class="table-action" data-go="orgInfoAdmin">进入组织维护</button></div>
        ${table(data.organizations, organizationColumns(), null)}
      </div>
    </section>
  `;
  content.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.go;
      renderNav();
      await loadView();
    });
  });
}

function renderCustomersView() {
  const customers = state.data.customers?.rows || [];
  const opportunities = state.data.opportunities?.rows || [];
  const projects = state.data.projects?.rows || [];
  if (!state.selectedCustomerId && customers.length) state.selectedCustomerId = Number(customers[0].id);
  const selected = customers.find((item) => Number(item.id) === Number(state.selectedCustomerId)) || customers[0];
  const selectedId = selected ? Number(selected.id) : 0;
  const customerOpportunities = opportunities.filter((item) => Number(item.customer_id) === selectedId);
  const customerProjects = projects.filter((item) => Number(item.customer_id) === selectedId);
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>客户台账</h2>
        <span class="status">${customers.length} 个客户</span>
      </div>
      ${table(customers, customerColumns(), null)}
    </section>
    ${selected ? `
      <section class="panel" style="margin-top:16px">
        <div class="panel-header">
          <h2>${escapeHtml(selected.name)}</h2>
          <span class="status">${escapeHtml(selected.industry)}｜${escapeHtml(selected.region)}｜${escapeHtml(selected.level)}</span>
        </div>
        <div class="grid cards">
          ${renderCard({ label: "商机数", value: customerOpportunities.length, unit: "个" })}
          ${renderCard({ label: "进行中商机", value: customerOpportunities.filter((item) => !["赢单转项目", "输单关闭"].includes(item.stage)).length, unit: "个" })}
          ${renderCard({ label: "商机储备", value: formatMoney(sumBy(customerOpportunities.filter((item) => item.stage !== "输单关闭"), "expected_contract_amount")), unit: "万元" })}
          ${renderCard({ label: "关联项目", value: customerProjects.length, unit: "个" })}
        </div>
        <div class="panel-body relation-list">
          ${detailRow("归属业务组", selected.owner_org_name || "-")}
          ${detailRow("客户主线", "客户详情汇总该客户下全部商机，线索只是商机的早期阶段")}
        </div>
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-header"><h2>客户商机阶段分布</h2><span class="status">${customerOpportunities.length} 条商机</span></div>
        ${renderOpportunityBoard(customerOpportunities, false)}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-header"><h2>客户商机明细</h2><span class="status">按阶段推进</span></div>
        ${table(customerOpportunities, opportunityColumns(true), null)}
      </section>
      <section class="panel" style="margin-top:16px">
        <div class="panel-header"><h2>关联项目</h2><span class="status">${customerProjects.length} 个项目</span></div>
        ${table(customerProjects, projectColumns(true), null)}
      </section>
    ` : ""}
  `;
  bindCustomerDetailButtons(content);
  bindOpportunityActions(content);
}

function renderOpportunityManagement() {
  const opportunities = state.data.opportunities?.rows || [];
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>商机看板</h2>
        <span class="status">${opportunities.length} 条商机</span>
      </div>
      ${renderOpportunityBoard(opportunities, true)}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <h2>商机列表</h2>
        <span class="status">线索不单独成菜单，统一作为商机阶段管理</span>
      </div>
      ${table(opportunities, opportunityColumns(true), "opportunities")}
    </section>
  `;
  bindEditButtons(content, "opportunities");
  bindOpportunityActions(content);
}

function renderTimesheetManagement() {
  const data = state.data.timesheets || { rows: [], cards: [], projects: [], persons: [] };
  const rows = filterTimesheetRows(data.rows || []);
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="grid cards">
      ${(data.cards || []).map(renderCard).join("")}
    </section>
    <section class="panel timesheet-toolbar-panel">
      <div class="timesheet-toolbar">
        <div class="field compact-field">
          <label>周期</label>
          <select id="timesheetPeriodType">
            ${["全部", "周", "月"].map((item) => `<option value="${item}" ${item === state.timesheetPeriodType ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </div>
        <div class="field compact-field">
          <label>填报方式</label>
          <select id="timesheetEntryMode">
            ${["全部", "比例", "小时"].map((item) => `<option value="${item}" ${item === state.timesheetEntryMode ? "selected" : ""}>${item}</option>`).join("")}
          </select>
        </div>
        <div class="timesheet-warning-strip">
          ${timesheetWarningSummary(data.rows || [])}
        </div>
        <div class="actions">
          ${hasPermission("timesheet.edit") ? `<button class="primary" id="newTimesheet">填报工时</button>` : ""}
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>工时台账</h2>
          <p>按人员、项目和周期沉淀投入记录，用于后续项目人工成本统计。</p>
        </div>
        <span class="status">${rows.length} 条｜类 Excel 填报</span>
      </div>
      <div id="timesheetGrid" class="timesheet-grid"></div>
      <div id="timesheetGridFallback">${table(rows, timesheetColumns(), null)}</div>
    </section>
  `;
  bindTimesheetEvents(content);
  enhanceTimesheetGrid(rows);
}

function filterTimesheetRows(rows) {
  return rows.filter((row) => {
    const matchPeriod = state.timesheetPeriodType === "全部" || row.period_type === state.timesheetPeriodType;
    const matchMode = state.timesheetEntryMode === "全部" || row.entry_mode === state.timesheetEntryMode;
    return matchPeriod && matchMode;
  });
}

function timesheetWarningSummary(rows) {
  const warnings = rows.filter((row) => row.warning);
  if (!warnings.length) return `<span class="status green">暂无累计预警</span>`;
  const ratioWarnings = warnings.filter((row) => row.entry_mode === "比例").length;
  const hourWarnings = warnings.filter((row) => row.entry_mode === "小时").length;
  return `
    <span class="status red">${warnings.length} 条预警</span>
    ${ratioWarnings ? `<span class="status red">比例 ${ratioWarnings}</span>` : ""}
    ${hourWarnings ? `<span class="status red">小时 ${hourWarnings}</span>` : ""}
  `;
}

function timesheetColumns() {
  return [
    { label: "周期", render: (row) => `<strong>${escapeHtml(row.period_label || row.period_start)}</strong><br><span>${escapeHtml(row.period_type)}｜${escapeHtml(row.period_start)}</span>` },
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${escapeHtml(row.project_code || "-")}｜${escapeHtml(row.org_name || "-")}</span>` },
    { label: "人员", render: (row) => `<strong>${escapeHtml(row.person_name)}</strong><br><span>${escapeHtml(row.employee_no || "-")}｜${escapeHtml(row.person_type || "-")}</span>` },
    { label: "投入", render: (row) => timesheetWorkloadCell(row) },
    { label: "累计", render: (row) => timesheetCumulativeCell(row) },
    { label: "成本依据", render: (row) => timesheetCostBasisCell(row) },
    { label: "估算成本", render: (row) => `${formatMoney(row.estimated_cost || 0)} 元` },
    { label: "状态", render: (row) => badge(row.status, row.status === "已确认" ? "green" : row.status === "已提交" ? "yellow" : "") },
    { label: "操作", render: (row) => hasPermission("timesheet.edit") ? `<button class="table-action" data-timesheet-edit="${row.id}">维护</button>` : `<span class="status">只读</span>` },
  ];
}

function timesheetWorkloadCell(row) {
  if (row.entry_mode === "比例") {
    return `<strong>${Number(row.allocation_ratio || 0).toFixed(2)}</strong><br><span>项目投入比例</span>`;
  }
  return `<strong>${Number(row.work_hours || 0).toFixed(1)} 小时</strong><br><span>工作时长</span>`;
}

function timesheetCumulativeCell(row) {
  const value = row.entry_mode === "比例"
    ? `${Number(row.period_ratio_total || 0).toFixed(2)} / 1`
    : `${Number(row.period_hours_total || 0).toFixed(1)} / 8`;
  return `${badge(value, row.warning ? "red" : "green")}${row.warning ? `<br><span>${escapeHtml(row.warning)}</span>` : ""}`;
}

function timesheetCostBasisCell(row) {
  if (!Number(row.standard_unit_price || 0)) {
    return `<span>${escapeHtml(row.person_type === "第三方" ? "未关联价格" : "自有人员")}</span>`;
  }
  const label = [row.contract_name, row.lot_name].filter(Boolean).join("｜") || "框架价格";
  const price = `${formatMoney(row.standard_unit_price)} 元/${row.standard_price_unit || "-"}`;
  return `<strong>${escapeHtml(price)}</strong><br><span>${escapeHtml(label)}</span>`;
}

function bindTimesheetEvents(container) {
  const periodType = container.querySelector("#timesheetPeriodType");
  if (periodType) {
    periodType.addEventListener("change", () => {
      state.timesheetPeriodType = periodType.value;
      localStorage.setItem("projectBiTimesheetPeriodType", state.timesheetPeriodType);
      renderTimesheetManagement();
    });
  }
  const entryMode = container.querySelector("#timesheetEntryMode");
  if (entryMode) {
    entryMode.addEventListener("change", () => {
      state.timesheetEntryMode = entryMode.value;
      localStorage.setItem("projectBiTimesheetEntryMode", state.timesheetEntryMode);
      renderTimesheetManagement();
    });
  }
  const newTimesheet = container.querySelector("#newTimesheet");
  if (newTimesheet) newTimesheet.addEventListener("click", () => openTimesheetDialog());
  container.querySelectorAll("[data-timesheet-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = state.data.timesheets.rows.find((item) => Number(item.id) === Number(button.dataset.timesheetEdit));
      openTimesheetDialog(row);
    });
  });
}

async function enhanceTimesheetGrid(rows) {
  const gridEl = document.querySelector("#timesheetGrid");
  const fallback = document.querySelector("#timesheetGridFallback");
  if (!gridEl) return;
  try {
    const { createSpreadsheetGrid } = await import("/js/integrations/spreadsheet-grid.js");
    const editable = hasPermission("timesheet.edit");
    const gridRows = rows.map((row) => ({ ...row }));
    await createSpreadsheetGrid(gridEl, {
      height: "560px",
      data: gridRows,
      columns: timesheetGridColumns(editable),
      onCellEdited: async (cell) => {
        const field = cell.getField();
        if (!["entry_mode", "allocation_ratio", "work_hours", "work_content", "status"].includes(field)) return;
        await saveTimesheetGridEdit(cell);
      },
    });
    if (fallback) fallback.hidden = true;
  } catch (error) {
    console.warn("Tabulator 工时表格加载失败，使用基础表格。", error);
    if (fallback) fallback.hidden = false;
  }
}

function timesheetGridColumns(editable) {
  const readonly = !editable;
  return [
    { title: "周期", field: "period_label", width: 110, frozen: true },
    { title: "项目", field: "project_name", minWidth: 220, frozen: true, formatter: (cell) => `<strong>${escapeHtml(cell.getValue() || "-")}</strong><br><span>${escapeHtml(cell.getRow().getData().project_code || "-")}</span>` },
    { title: "人员", field: "person_name", minWidth: 160, formatter: (cell) => `<strong>${escapeHtml(cell.getValue() || "-")}</strong><br><span>${escapeHtml(cell.getRow().getData().person_type || "-")}</span>` },
    { title: "方式", field: "entry_mode", width: 92, editor: readonly ? false : "list", editorParams: { values: ["比例", "小时"] } },
    { title: "比例", field: "allocation_ratio", width: 92, hozAlign: "right", editor: readonly ? false : "number", formatter: (cell) => Number(cell.getValue() || 0).toFixed(2) },
    { title: "小时", field: "work_hours", width: 92, hozAlign: "right", editor: readonly ? false : "number", formatter: (cell) => Number(cell.getValue() || 0).toFixed(1) },
    { title: "累计", field: "warning", minWidth: 130, formatter: (cell) => {
      const row = cell.getRow().getData();
      const value = row.entry_mode === "比例"
        ? `${Number(row.period_ratio_total || 0).toFixed(2)} / 1`
        : `${Number(row.period_hours_total || 0).toFixed(1)} / 8`;
      return `<span class="grid-pill ${row.warning ? "danger" : "ok"}">${escapeHtml(value)}</span>${row.warning ? `<small>${escapeHtml(row.warning)}</small>` : ""}`;
    } },
    { title: "工作内容", field: "work_content", minWidth: 260, editor: readonly ? false : "textarea" },
    { title: "估算成本", field: "estimated_cost", width: 120, hozAlign: "right", formatter: (cell) => `${formatMoney(cell.getValue() || 0)} 元` },
    { title: "状态", field: "status", width: 105, editor: readonly ? false : "list", editorParams: { values: ["草稿", "已提交", "已确认"] }, formatter: (cell) => `<span class="grid-pill">${escapeHtml(cell.getValue() || "-")}</span>` },
    { title: "操作", field: "id", width: 90, headerSort: false, formatter: () => `<button class="table-action compact-action">维护</button>`, cellClick: (_event, cell) => openTimesheetDialog(cell.getRow().getData()) },
  ];
}

async function saveTimesheetGridEdit(cell) {
  const row = cell.getRow().getData();
  const field = cell.getField();
  if (cell.getOldValue() === cell.getValue()) return;
  const payload = {
    project_id: Number(row.project_id),
    person_id: Number(row.person_id),
    period_type: row.period_type,
    period_start: row.period_start,
    entry_mode: row.entry_mode,
    allocation_ratio: Number(row.allocation_ratio || 0),
    work_hours: Number(row.work_hours || 0),
    work_content: row.work_content || "",
    status: row.status || "草稿",
  };
  if (field === "entry_mode" && payload.entry_mode === "比例") payload.work_hours = 0;
  if (field === "entry_mode" && payload.entry_mode === "小时") payload.allocation_ratio = 0;
  if (payload.entry_mode === "比例") payload.work_hours = 0;
  if (payload.entry_mode === "小时") payload.allocation_ratio = 0;
  const errors = validateTimesheetPayload(payload);
  if (errors.length) {
    alert(errors.join("\n"));
    state.data.timesheets = await api("timesheets");
    renderTimesheetManagement();
    return;
  }
  try {
    await api(`timesheets/${row.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    state.data.timesheets = await api("timesheets");
    renderTimesheetManagement();
  } catch (error) {
    alert(error.message || "工时保存失败");
    state.data.timesheets = await api("timesheets");
    renderTimesheetManagement();
  }
}

function renderOpportunityBoard(opportunities, showAmount) {
  return `
    <div class="kanban-board">
      ${opportunityStages.map((stage) => {
        const rows = opportunities.filter((item) => item.stage === stage);
        return `
          <div class="kanban-column">
            <div class="kanban-title">
              <strong>${escapeHtml(stage)}</strong>
              <span>${rows.length}</span>
            </div>
            ${showAmount ? `<div class="kanban-total">${formatMoney(sumBy(rows, "expected_contract_amount"))} 万元</div>` : ""}
            <div class="kanban-items">
              ${rows.length ? rows.map((row) => `
                <div class="kanban-card">
                  <strong>${escapeHtml(row.name)}</strong>
                  <span>${escapeHtml(row.customer_name || "")}</span>
                  <span>${formatMoney(row.expected_contract_amount)} 万元｜${Math.round(Number(row.probability || 0) * 100)}%</span>
                </div>
              `).join("") : `<div class="kanban-empty">暂无</div>`}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPerformanceView() {
  const data = state.data.performance || { cards: [], hierarchy: [], targets: [], periods: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const selected = getSelectedPerformanceOrg(organizations);
  const selectedYear = getSelectedPerformanceYear(data);
  const annualRows = performanceAnnualRows(data, selected?.id, selectedYear);
  const childRows = performanceChildRows(data, organizations, selected, annualRows);
  const quarterRows = performanceQuarterRows(data, selected?.id, annualRows);
  const cards = performanceOrgCards(annualRows, childRows, quarterRows, organizations, selected);
  const selectedStatus = performanceOrgStatus(data, organizations, selected);
  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">组织绩效</span>
        </div>
        <div class="panel-body org-sidebar-body">
          ${renderPerformanceOrgTree(data, organizations, selected?.id)}
        </div>
      </div>

      <div class="org-workspace">
        <section class="panel">
          <div class="org-toolbar">
            <div>
              <h2>${escapeHtml(selected?.name || "未选择组织")}</h2>
              <p>${escapeHtml(selected?.code || "-")}｜${escapeHtml(orgTypeLabel(selected?.type))}｜上级 ${escapeHtml(selected?.parent_name || "无")}</p>
            </div>
            <div class="row-actions">
              ${renderPerformanceYearSelect(data)}
              ${badge(selectedStatus, performanceStatusColor(selectedStatus))}
            </div>
          </div>
          <div class="panel-body">
            <section class="grid cards">
              ${cards.map(renderCard).join("")}
            </section>
            <div class="process-strip" style="margin-top:14px">
              ${["年度 KPI 定义", "下级组织分解", "季度拆分", "目标确认", "执行跟踪"].map((step) => `<span>${escapeHtml(step)}</span>`).join("")}
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <h2>年度 KPI</h2>
            <span class="status">先维护全年目标，再进入单个 KPI 详情</span>
          </div>
          ${table(annualRows, performanceAnnualColumns(data, organizations, selected), null)}
        </section>
      </div>
    </section>
  `;
  bindPerformanceEvents(content);
}

function renderPerformanceModuleView(view) {
  if (view === "performanceBoard") renderPerformanceBoardView();
  else if (view === "performanceCatalog") renderPerformanceCatalogView();
  else if (view === "performancePlan") renderPerformancePlanView();
  else if (view === "performanceCompletion") renderPerformanceCompletionView();
  else if (view === "performanceScoring") renderPerformanceScoringView();
  else renderPerformanceView();
}

function renderPerformanceBoardView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const annualRows = performanceAllAnnualRows(data);
  const boardRows = performanceBoardRows(data, organizations);
  const completion = annualRows.length
    ? Number((annualRows.reduce((total, row) => total + Number(row.completion_rate || 0), 0) / annualRows.length).toFixed(1))
    : 0;
  const warningCount = boardRows.filter((row) => ["待分解", "待拆季", "未定义"].includes(row.status) || Number(row.completion_rate || 0) < 70).length;
  content.innerHTML = `
    <section class="grid cards">
      ${[
        { label: "绩效组织", value: organizations.length, unit: "个" },
        { label: "年度 KPI", value: annualRows.length, unit: "项" },
        { label: "综合完成率", value: completion, unit: "%" },
        { label: "预警组织", value: warningCount, unit: "个" },
      ].map(renderCard).join("")}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <h2>组织绩效总览</h2>
        <span class="status">看结果、看预警、看排名、看差距</span>
      </div>
      ${table(boardRows, performanceBoardColumns(), null)}
    </section>
  `;
}

function renderPerformanceCatalogView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const rows = performanceCatalogRows(data);
  const categoryRows = performanceCategoryRows(rows);
  const visibleRows = state.selectedKpiCategory === "全部"
    ? rows
    : rows.filter((row) => row.category === state.selectedKpiCategory);
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>通用 KPI 指标维护</h2>
        <div class="actions">
          <span class="status">${visibleRows.length}/${rows.length} 项指标</span>
          ${hasPermission("kpi.manage") ? `<button class="primary" id="newPerformanceKpi" type="button">新增指标</button>` : ""}
        </div>
      </div>
      <div class="panel-body">
        <div class="notice-line">KPI 指标采用版本控制。已发布或已被绩效方案、组织目标使用的版本会被锁定，不能直接修改；需要调整时请复制新版本。</div>
        <div class="category-filter">
          ${renderKpiCategoryFilter(categoryRows)}
        </div>
        <div class="process-strip">
          ${["指标定义", "适用组织", "年度目标", "组织分解", "季度拆分", "执行跟踪"].map((step) => `<span>${escapeHtml(step)}</span>`).join("")}
        </div>
      </div>
      ${table(visibleRows, performanceCatalogColumns(), null)}
    </section>
  `;
  bindPerformanceCatalogEvents(content);
}

function renderPerformancePlanView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const rows = performancePlanRows(data);
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>年度绩效方案</h2>
        <div class="actions">
          <button class="secondary" type="button" data-performance-pending="历史版本会在方案版本表落地后支持，目前可通过年度切换查看历史目标。">历史版本</button>
          <button class="primary" type="button" data-performance-pending="绩效方案新增会在方案主表落地后开放，当前可先在 KPI 指标库维护指标版本。">新增方案</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="process-strip">
          ${["选择年度", "选择适用组织", "引用 KPI 指标库", "配置权重与规则", "发布启用"].map((step) => `<span>${escapeHtml(step)}</span>`).join("")}
        </div>
      </div>
      ${table(rows, performancePlanColumns(), null)}
    </section>
  `;
  bindPerformancePlaceholderEvents(content);
}

function renderPerformanceDecompositionView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const selected = getSelectedPerformanceOrg(organizations);
  const annualRows = performanceAnnualRows(data, selected?.id, getSelectedPerformanceYear(data));
  const rows = annualRows.map((annual) => performanceDecompositionSummaryRow(data, organizations, selected, annual));
  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">分解对象</span>
        </div>
        <div class="panel-body org-sidebar-body">
          ${renderPerformanceOrgTree(data, organizations, selected?.id)}
        </div>
      </div>

      <div class="org-workspace">
        <section class="panel">
          <div class="org-toolbar">
            <div>
              <h2>${escapeHtml(selected?.name || "未选择组织")}</h2>
              <p>${escapeHtml(selected?.code || "-")}｜${escapeHtml(orgTypeLabel(selected?.type))}｜先选 KPI，再维护该 KPI 的下级组织目标</p>
            </div>
            ${badge(performanceOrgStatus(data, organizations, selected), performanceStatusColor(performanceOrgStatus(data, organizations, selected)))}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>年度 KPI 下级分解</h2>
            <span class="status">只展示当前组织</span>
          </div>
          ${table(rows, performanceDecompositionColumns(), null)}
        </section>
      </div>
    </section>
  `;
  bindPerformanceEvents(content);
}

function renderPerformanceCompletionView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const selected = getSelectedPerformanceOrg(organizations);
  const annualRows = performanceAnnualRows(data, selected?.id, getSelectedPerformanceYear(data));
  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">填报主体</span>
        </div>
        <div class="panel-body org-sidebar-body">
          ${renderPerformanceOrgTree(data, organizations, selected?.id)}
        </div>
      </div>
      <div class="org-workspace">
        <section class="panel">
          <div class="org-toolbar">
            <div>
              <h2>${escapeHtml(selected?.name || "未选择组织")}</h2>
              <p>${escapeHtml(selected?.code || "-")}｜数值型填实际值，任务型填完成说明和附件</p>
            </div>
            <div class="row-actions">
              ${renderPerformanceYearSelect(data)}
              <button class="primary" type="button" data-performance-pending="完成值提交审批将在填报流程落地后开放。">提交填报</button>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>完成值填报</h2>
            <span class="status">一期预留入口</span>
          </div>
          ${table(annualRows, performanceCompletionColumns(), null)}
        </section>
      </div>
    </section>
  `;
  bindPerformanceEvents(content);
  bindPerformancePlaceholderEvents(content);
}

function renderPerformanceScoringView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const selected = getSelectedPerformanceOrg(organizations);
  const annualRows = performanceAnnualRows(data, selected?.id, getSelectedPerformanceYear(data));
  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">评价对象</span>
        </div>
        <div class="panel-body org-sidebar-body">
          ${renderPerformanceOrgTree(data, organizations, selected?.id)}
        </div>
      </div>
      <div class="org-workspace">
        <section class="panel">
          <div class="org-toolbar">
            <div>
              <h2>${escapeHtml(selected?.name || "未选择组织")}</h2>
              <p>${escapeHtml(selected?.code || "-")}｜数值型自动建议得分，定性/加扣分项人工确认</p>
            </div>
            <div class="row-actions">
              ${renderPerformanceYearSelect(data)}
              <button class="primary" type="button" data-performance-pending="绩效结果确认将在评价审批流程落地后开放。">确认结果</button>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>绩效评价计分</h2>
            <span class="status">一期预留入口</span>
          </div>
          ${table(annualRows, performanceScoringColumns(), null)}
        </section>
      </div>
    </section>
  `;
  bindPerformanceEvents(content);
  bindPerformancePlaceholderEvents(content);
}

function renderPerformanceQuarteringView() {
  const data = state.data.performance || { targets: [], organizations: [] };
  const content = document.querySelector("#content");
  const organizations = data.organizations || [];
  const selected = getSelectedPerformanceOrg(organizations);
  const annualRows = performanceAnnualRows(data, selected?.id);
  const rows = performanceQuarterRows(data, selected?.id, annualRows);
  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">时间拆分</span>
        </div>
        <div class="panel-body org-sidebar-body">
          ${renderPerformanceOrgTree(data, organizations, selected?.id)}
        </div>
      </div>

      <div class="org-workspace">
        <section class="panel">
          <div class="org-toolbar">
            <div>
              <h2>${escapeHtml(selected?.name || "未选择组织")}</h2>
              <p>${escapeHtml(selected?.code || "-")}｜年度 KPI 先确认，再拆到 Q1-Q4</p>
            </div>
            <div class="row-actions">
              <button class="table-action" data-performance-pending="平均拆分会在季度目标保存接口落地后支持，当前可在 KPI 详情里查看拆分结果。">平均拆分</button>
              <button class="table-action" data-performance-pending="手工填写会在季度目标保存接口落地后支持，当前可在 KPI 详情里查看拆分结果。">手工填写</button>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <h2>季度拆分</h2>
            <span class="status">当前组织 ${annualRows.length} 项年度 KPI</span>
          </div>
          ${table(rows, performanceQuarterColumns(), null)}
        </section>
      </div>
    </section>
  `;
  bindPerformanceEvents(content);
  bindPerformancePlaceholderEvents(content);
}

function renderListView(view) {
  const rows = state.data[view].rows || [];
  const content = document.querySelector("#content");
  const config = {
    opportunities: ["商机列表", opportunityColumns(true), "opportunities"],
    projects: ["项目列表", projectColumns(true), "projects"],
    forecasts: ["预测列表", forecastColumns(true), "forecasts"],
    kpi: ["KPI 目标与完成", kpiColumns(), null],
    dispatch: ["调度动作", dispatchColumns(true), "dispatch"],
  }[view];

  const createAction =
    view === "dispatch"
      ? `<button class="primary" id="newDispatch">新增调度</button>`
      : "";

  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>${config[0]}</h2>
        <div class="actions">${createAction}</div>
      </div>
      ${table(rows, config[1], config[2])}
    </section>
  `;

  bindEditButtons(content, config[2]);
  const newDispatch = document.querySelector("#newDispatch");
  if (newDispatch) {
    newDispatch.addEventListener("click", () => openCreateDispatch());
  }
}

function renderFundsView(view) {
  const data = state.data.funds;
  if (view === "fundReceipts") {
    renderFundReceipts(data);
    return;
  }
  if (view === "fundPayments") {
    renderFundPayments(data);
    return;
  }
  if (view === "fundWarnings") {
    renderFundWarnings(data);
    return;
  }
  if (view === "fundApprovals") {
    renderFundApprovals(data);
    return;
  }
  renderFundOverview(data);
}

function renderFundOverview(data) {
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="grid cards">
      ${data.cards.map(renderCard).join("")}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>项目资金总览</h2><span class="status">${data.projects.length} 个项目</span></div>
      ${table(data.projects, fundProjectColumns(), null)}
    </section>
  `;
}

function renderFundReceipts(data) {
  const content = document.querySelector("#content");
  const receiptPlans = data.plans.filter((plan) => plan.plan_type === "收款计划");
  const receiptActuals = data.actuals.filter((actual) => actual.direction === "收款");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>收款计划</h2>
        <div class="actions">
          ${hasPermission("fund.plan.edit") ? `<button class="primary" id="newReceiptPlan">填报收款计划</button>` : ""}
          ${hasPermission("fund.actual.edit") ? `<button class="secondary" id="newFundReceipt">登记回款</button>` : ""}
        </div>
      </div>
      <div class="panel-body relation-list">
        ${detailRow("填报频率", "每月 2 次：上半月、下半月")}
        ${detailRow("收款管理", "记录项目回款，跟踪应收余额、欠款周期和长账龄")}
      </div>
      ${table(receiptPlans, fundPlanColumns("receipt"), null)}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>回款登记</h2><span class="status">${receiptActuals.length} 条</span></div>
      ${table(receiptActuals, fundActualColumns(), null)}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>应收账款</h2><span class="status">${data.receivables.length} 条</span></div>
      ${table(data.receivables, fundReceivableColumns(), null)}
    </section>
  `;
  const newReceiptPlan = document.querySelector("#newReceiptPlan");
  if (newReceiptPlan) newReceiptPlan.addEventListener("click", () => openCreateFundPlan("收款计划"));
  const newFundReceipt = document.querySelector("#newFundReceipt");
  if (newFundReceipt) newFundReceipt.addEventListener("click", () => openCreateFundActual("收款"));
  bindFundTransitionButtons(content);
}

function renderFundPayments(data) {
  const content = document.querySelector("#content");
  const paymentPlans = data.plans.filter((plan) => plan.plan_type === "支出计划");
  const paymentActuals = data.actuals.filter((actual) => actual.direction === "付款");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>支出计划</h2>
        <div class="actions">
          ${hasPermission("fund.plan.edit") ? `<button class="primary" id="newPaymentPlan">填报支出计划</button>` : ""}
        </div>
      </div>
      <div class="panel-body relation-list">
        ${detailRow("填报频率", "每月 2 次：上半月、下半月")}
        ${detailRow("支出原则", "项目有钱才能支出；登记付款时校验项目可用资金")}
      </div>
      ${table(paymentPlans, fundPlanColumns("payment"), null)}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header">
        <h2>付款登记</h2>
        <div class="actions">
          ${hasPermission("fund.actual.edit") ? `<button class="primary" id="newFundPayment">登记付款</button>` : ""}
        </div>
      </div>
      ${table(paymentActuals, fundActualColumns(), null)}
    </section>
  `;
  const newPaymentPlan = document.querySelector("#newPaymentPlan");
  if (newPaymentPlan) newPaymentPlan.addEventListener("click", () => openCreateFundPlan("支出计划"));
  const newFundPayment = document.querySelector("#newFundPayment");
  if (newFundPayment) newFundPayment.addEventListener("click", () => openCreateFundActual("付款"));
  bindFundTransitionButtons(content);
}

function renderFundWarnings(data) {
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>资金缺口预警</h2>
        <span class="status">${data.warnings.length} 项</span>
      </div>
      <div class="panel-body warning-list">
        ${data.warnings.length ? data.warnings.map((item) => `
          <div class="warning-item">
            <div><strong>${escapeHtml(item.project_name)}</strong><span>${escapeHtml(item.org_name)}｜${escapeHtml(item.warning)}</span></div>
            ${badge(`${formatMoney(item.amount)} 万元`, "red")}
          </div>
        `).join("") : `<div class="empty">暂无资金缺口预警</div>`}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>预警项目资金情况</h2><span class="status">穿透项目</span></div>
      ${table(data.projects.filter((row) => Number(row.net_cash) < 0 || Number(row.receipt_gap) > 100 || Number(row.long_aging_receivable) > 0), fundProjectColumns(), null)}
    </section>
  `;
}

function renderFundApprovals(data) {
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h2>审批记录</h2><span class="status">${data.approvals.length} 条</span></div>
      ${table(data.approvals, fundApprovalColumns(), null)}
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>待处理计划</h2><span class="status">未生效</span></div>
      ${table(data.plans.filter((plan) => plan.status !== "审批生效"), fundPlanColumns(), null)}
    </section>
  `;
  bindFundTransitionButtons(content);
}

function bindFundTransitionButtons(content) {
  content.querySelectorAll("[data-fund-transition]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`fund-plans/${button.dataset.planId}`, {
        method: "PATCH",
        body: JSON.stringify({ transition: button.dataset.fundTransition, comment: button.dataset.comment || "" }),
      });
      state.data.funds = await api("funds");
      renderFundsView(state.view);
    });
  });
}

function renderGovernanceView(view) {
  const governance = state.data.governance;
  const content = document.querySelector("#content");
  if (view === "orgAdmin" || view === "orgInfoAdmin") {
    renderOrganizationInfoAdmin(governance);
    return;
  }
  if (view === "orgChart") {
    renderOrganizationChart(governance);
    return;
  }
  if (view === "supplierAdmin") {
    renderSupplierAdmin(governance);
    return;
  }
  if (view === "contractAdmin") {
    renderContractAdmin(governance);
    return;
  }
  const config = {
    userAdmin: ["用户列表", governance.users, userColumns(), "users", `<button class="primary" id="newUser">新增用户</button>`],
    personAdmin: ["人员列表", governance.persons, personColumns(), null, `<button class="primary" id="newPerson">新增人员</button>`],
    permissionAdmin: ["角色权限矩阵", governance.roles, roleColumns(), "roles", ""],
  }[view];

  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>${config[0]}</h2>
        <div class="actions">${config[4]}</div>
      </div>
      ${table(config[1], config[2], config[3])}
    </section>
    ${view === "permissionAdmin" ? renderPermissionCatalog(governance.permissions) : ""}
  `;

  bindEditButtons(content, config[3]);
  const newUser = document.querySelector("#newUser");
  if (newUser) newUser.addEventListener("click", () => openCreateUser());
  const newPerson = document.querySelector("#newPerson");
  if (newPerson) newPerson.addEventListener("click", () => openCreatePerson());
  const newSupplier = document.querySelector("#newSupplier");
  if (newSupplier) newSupplier.addEventListener("click", () => openCreateSupplier());
  content.querySelectorAll("[data-person-detail]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = `personDetail:${button.dataset.personDetail}`;
      renderNav();
      await loadView();
    });
  });
  content.querySelectorAll("[data-person-edit]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = `personEdit:${button.dataset.personEdit}`;
      renderNav();
      await loadView();
    });
  });
}

function renderSupplierAdmin(governance) {
  const content = document.querySelector("#content");
  content.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h2>供应商主数据</h2>
        <div class="actions"><button class="primary" id="newSupplier">新增供应商</button></div>
      </div>
      ${table(governance.suppliers, supplierColumns(), "suppliers")}
    </section>
  `;
  bindEditButtons(content, "suppliers");
  document.querySelector("#newSupplier").addEventListener("click", () => openCreateSupplier());
}

function renderContractAdmin(governance) {
  const content = document.querySelector("#content");
  const contracts = governance.contracts || [];
  const lots = governance.contractLots || [];
  content.innerHTML = `
    <section class="grid cards">
      ${renderCard({ label: "履行中合同", value: contracts.filter((item) => item.status === "履行中").length, unit: "个" })}
      ${renderCard({ label: "即将到期合同", value: contracts.filter((item) => item.status === "即将到期").length, unit: "个" })}
      ${renderCard({ label: "标段/服务包", value: lots.filter((item) => item.status === "启用").length, unit: "个" })}
    </section>
    <section class="panel">
      <div class="panel-header">
        <h2>人员外包框架协议</h2>
        <div class="actions"><button class="primary" id="newContract">新增合同/协议</button></div>
      </div>
      ${table(contracts, contractListColumns(), null)}
    </section>
  `;
  document.querySelector("#newContract").addEventListener("click", () => openCreateContract());
  bindContractListEvents(content);
}

function bindContractListEvents(container) {
  container.querySelectorAll("[data-contract-detail]").forEach((button) => {
    button.addEventListener("click", async () => {
      const tab = button.dataset.tab || "contract";
      state.view = `contractDetail:${button.dataset.contractDetail}:${tab}`;
      renderNav();
      await loadView();
    });
  });
  container.querySelectorAll("[data-contract-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const contract = state.data.governance.contracts.find((item) => Number(item.id) === Number(button.dataset.contractEdit));
      openEditDialog("contracts", contract);
    });
  });
  container.querySelectorAll("[data-contract-new-lot]").forEach((button) => {
    button.addEventListener("click", () => openCreateContractLot(button.dataset.contractNewLot));
  });
  container.querySelectorAll("[data-contract-terminate]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认终止该合同/协议？")) return;
      const contract = state.data.governance.contracts.find((item) => Number(item.id) === Number(button.dataset.contractTerminate));
      await api(`contracts/${button.dataset.contractTerminate}`, { method: "PATCH", body: JSON.stringify({ ...contract, status: "已终止" }) });
      await loadView();
    });
  });
  container.querySelectorAll("[data-contract-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除该合同/协议？删除后将同时删除该合同下的标段和价格项。")) return;
      await api(`contracts/${button.dataset.contractDelete}`, { method: "DELETE" });
      if (String(state.view).startsWith("contractDetail")) {
        state.view = "contractAdmin";
        renderNav();
      }
      await loadView();
    });
  });
}

function renderContractDetail(contractId, nodeKey = "contract") {
  const governance = state.data.governance;
  const contract = governance.contracts.find((item) => Number(item.id) === Number(contractId));
  if (!contract) {
    state.view = "contractAdmin";
    renderNav();
    loadView();
    return;
  }
  const lots = (governance.contractLots || []).filter((lot) => Number(lot.contract_id) === Number(contract.id));
  const lotIds = new Set(lots.map((lot) => Number(lot.id)));
  const prices = (governance.lotSupplierPrices || []).filter((price) => Number(price.contract_id) === Number(contract.id) || lotIds.has(Number(price.lot_id)));
  const awards = (governance.lotSupplierAwards || []).filter((award) => Number(award.contract_id) === Number(contract.id) || lotIds.has(Number(award.lot_id)));
  const parsedNode = parseContractNodeKey(nodeKey);
  if (parsedNode.type === "lot") {
    const lot = lots.find((item) => Number(item.id) === Number(parsedNode.lotId));
    renderLotDetailPage(
      contract,
      lot,
      prices.filter((price) => Number(price.lot_id) === Number(parsedNode.lotId)),
      awards.filter((award) => Number(award.lot_id || 0) === Number(parsedNode.lotId || 0)),
    );
    bindContractDetailEvents(contract);
    return;
  }
  if (parsedNode.type === "supplier") {
    const lot = lots.find((item) => Number(item.id) === Number(parsedNode.lotId));
    const supplierPrices = prices.filter((price) => Number(price.lot_id || 0) === Number(parsedNode.lotId || 0) && Number(price.supplier_id) === Number(parsedNode.supplierId));
    const award = awards.find((item) => Number(item.lot_id || 0) === Number(parsedNode.lotId || 0) && Number(item.supplier_id) === Number(parsedNode.supplierId));
    renderSupplierPricePage(contract, lot, supplierPrices, award);
    bindContractDetailEvents(contract);
    return;
  }

  document.querySelector("#pageTitle").textContent = contract.name;
  document.querySelector("#pageSubtitle").textContent = `${contract.code || "-"}｜人员外包框架｜${contract.status || "-"}`;
  document.querySelector("#content").innerHTML = `
    <section class="panel contract-detail-header">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(contract.name)}</h2>
          <p>${escapeHtml(contract.code || "-")}｜${escapeHtml(contract.signing_subject || "-")}｜${escapeHtml(contract.effective_from || "-")} 至 ${escapeHtml(contract.effective_to || "-")}</p>
        </div>
        <div class="actions">
          <button class="secondary" id="backToContracts">返回列表</button>
          <button class="table-action danger" data-contract-delete="${contract.id}">删除合同</button>
          <button class="primary" data-contract-edit="${contract.id}">修改合同信息</button>
        </div>
      </div>
    </section>
    <section class="panel contract-overview-panel">
      <div class="panel-header">
        <div>
          <h2>合同情况</h2>
          <p>人员外包框架协议基础信息</p>
        </div>
      </div>
      <div class="panel-body compact-panel-body">
        ${renderContractCompactInfo(contract)}
      </div>
    </section>
    <section class="panel contract-lot-list-panel">
      <div class="panel-header">
        <div>
          <h2>标段/服务包列表</h2>
          <p>每个标段下维护入围供应商和人员价格</p>
        </div>
        <div class="actions">
          <button class="primary" id="newContractLot">新增标段</button>
          <span class="status">${lots.length} 个标段</span>
        </div>
      </div>
      <div class="panel-body">
        ${lots.length ? table(lots, contractLotVerticalColumns(prices), null) : `<div class="empty">暂无标段/服务包，可先新增标段后维护入围供应商和人员价格。</div>`}
      </div>
    </section>
  `;
  bindContractDetailEvents(contract);
}

function renderContractCompactInfo(contract) {
  const items = [
    ["合同编号", contract.code || "-"],
    ["合同类型", "框架协议"],
    ["签约主体", contract.signing_subject || "-"],
    ["相对方", contract.counterparty_name || "-"],
    ["有效期", `${contract.effective_from || "-"} 至 ${contract.effective_to || "-"}`],
    ["状态", contract.status || "-"],
  ];
  return `
    <div class="contract-compact-info">
      <div class="contract-compact-title">
        <strong>${escapeHtml(contract.name || "-")}</strong>
        ${badge(contract.status || "履行中", contractStatusColor(contract.status))}
      </div>
      <div class="contract-compact-grid">
        ${items.map(([label, value]) => `
          <div class="compact-info-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
      ${contract.remark ? `<p class="contract-compact-remark">${escapeHtml(contract.remark)}</p>` : ""}
    </div>
  `;
}

function bindContractDetailEvents(contract) {
  const content = document.querySelector("#content");
  const backToContracts = document.querySelector("#backToContracts");
  if (backToContracts) backToContracts.addEventListener("click", async () => {
    state.view = "contractAdmin";
    renderNav();
    await loadView();
  });
  const backToContractRoot = document.querySelector("#backToContractRoot");
  if (backToContractRoot) backToContractRoot.addEventListener("click", async () => {
    state.view = `contractDetail:${contract.id}:contract`;
    renderNav();
    await loadView();
  });
  bindContractListEvents(content);
  bindEditButtons(content);
  const newLot = document.querySelector("#newContractLot");
  if (newLot) newLot.addEventListener("click", () => openCreateContractLot(contract.id));
  const newPrice = document.querySelector("#newLotSupplierPrice");
  if (newPrice) newPrice.addEventListener("click", () => openCreateLotSupplierPrice(null, contract.id));
  content.querySelectorAll("[data-new-award-supplier]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.supplierId) {
        openCreateLotSupplierPrice(button.dataset.lotId || null, contract.id, button.dataset.supplierId);
        return;
      }
      openCreateAwardSupplier(button.dataset.lotId || null, contract.id);
    });
  });
  bindProjectPricePicker(content, contract);
  content.querySelectorAll("[data-lot-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.lotPage ? `contractDetail:${contract.id}:lot-${button.dataset.lotPage}` : `contractDetail:${contract.id}:contract`;
      renderNav();
      await loadView();
    });
  });
  content.querySelectorAll("[data-supplier-page]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [lotId, supplierId] = button.dataset.supplierPage.split(":");
      state.view = `contractDetail:${contract.id}:supplier-${lotId || 0}-${supplierId}`;
      renderNav();
      await loadView();
    });
  });
  content.querySelectorAll("[data-award-supplier-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const [lotId, supplierId] = button.dataset.awardSupplierEdit.split(":");
      openEditAwardSupplier(lotId, supplierId);
    });
  });
  content.querySelectorAll("[data-award-supplier-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [lotId, supplierId] = button.dataset.awardSupplierDelete.split(":");
      await deleteAwardSupplier(lotId, supplierId);
    });
  });
  content.querySelectorAll("[data-price-matrix-lot]").forEach((button) => {
    button.addEventListener("click", () => {
      const lot = (state.data.governance.contractLots || []).find((item) => Number(item.id) === Number(button.dataset.priceMatrixLot));
      const lotPrices = (state.data.governance.lotSupplierPrices || []).filter((price) => Number(price.lot_id) === Number(button.dataset.priceMatrixLot));
      openLotPriceMatrixDialog(lot, lotPrices);
    });
  });
  content.querySelectorAll("[data-new-price-contract]").forEach((button) => {
    button.addEventListener("click", () => openCreateLotSupplierPrice(null, button.dataset.newPriceContract));
  });
  content.querySelectorAll("[data-new-price-lot]").forEach((button) => {
    button.addEventListener("click", () => openCreateLotSupplierPrice(button.dataset.newPriceLot, contract.id));
  });
  content.querySelectorAll("[data-contract-lot-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除该标段？删除后将同时删除该标段下的供应商价格项。")) return;
      await api(`contract-lots/${button.dataset.contractLotDelete}`, { method: "DELETE" });
      await loadView();
    });
  });
  content.querySelectorAll("[data-lot-price-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("确认删除该价格项？")) return;
      await api(`lot-supplier-prices/${button.dataset.lotPriceDelete}`, { method: "DELETE" });
      await loadView();
    });
  });
}

function openLotPriceMatrixDialog(lot, lotPrices) {
  if (!lot) return;
  const dialog = document.querySelector("#lotDetailDialog");
  document.querySelector("#lotDetailTitle").textContent = `${lot.name}｜全览`;
  document.querySelector("#lotDetailContent").innerHTML = `
    <section class="lot-dialog-section">
      ${lotPrices.length ? renderLotPriceMatrix(lotPrices) : `<div class="empty">暂无价格项</div>`}
    </section>
  `;
  dialog.showModal();
  dialog.querySelector("[data-close-lot-detail]").onclick = () => dialog.close();
}

function awardSupplierPrices(lotId, supplierId) {
  return (state.data.governance.lotSupplierPrices || []).filter((price) => Number(price.lot_id || 0) === Number(lotId || 0) && Number(price.supplier_id) === Number(supplierId));
}

function awardSupplierAward(lotId, supplierId) {
  return (state.data.governance.lotSupplierAwards || []).find((award) => Number(award.lot_id || 0) === Number(lotId || 0) && Number(award.supplier_id) === Number(supplierId));
}

function openEditAwardSupplier(lotId, supplierId) {
  const rows = awardSupplierPrices(lotId, supplierId);
  const award = awardSupplierAward(lotId, supplierId);
  if (!award && !rows.length) return;
  const first = award || rows[0];
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "维护入围供应商";
  const fields = [
    ["supplier_id", "供应商", "select", state.data.governance.suppliers.map((supplier) => [supplier.id, `${supplier.name}｜${supplier.code || "-"}`])],
    ["shortlist_status", "入围状态", "select", ["待入围", "已入围", "暂停", "退出"]],
    ["agreement_code", "框架协议编号", "text"],
    ["agreement_name", "框架协议名称", "text"],
    ["effective_from", "入围有效期开始", "date"],
    ["effective_to", "入围有效期结束", "date"],
    ["status", "状态", "select", ["待生效", "有效", "已失效"]],
    ["remark", "备注", "textarea"],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, first)).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    if (!payload.effective_from || !payload.effective_to) {
      alert("请维护入围有效期开始和结束日期");
      return;
    }
    if (award) {
      await api(`lot-supplier-awards/${award.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...award, ...payload }),
      });
    } else {
      await Promise.all(rows.map((row) => api(`lot-supplier-prices/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...row, ...payload }),
      })));
    }
    dialog.close();
    state.data.governance = await api("governance");
    await loadView();
  };
}

async function deleteAwardSupplier(lotId, supplierId) {
  const rows = awardSupplierPrices(lotId, supplierId);
  const award = awardSupplierAward(lotId, supplierId);
  if (!award && !rows.length) return;
  const supplier = award?.supplier_name || rows[0]?.supplier_name || "该供应商";
  if (!confirm(`确认删除 ${supplier} 在该标段下的入围记录？这会同时删除其 ${rows.length} 条人员价格。`)) return;
  if (award) {
    await api(`lot-supplier-awards/${award.id}`, { method: "DELETE" });
  } else {
    for (const row of rows) {
      await api(`lot-supplier-prices/${row.id}`, { method: "DELETE" });
    }
  }
  state.data.governance = await api("governance");
  await loadView();
}

function renderLotDetailPage(contract, lot, lotPrices, lotAwards = []) {
  if (!lot) {
    state.view = `contractDetail:${contract.id}:contract`;
    renderNav();
    loadView();
    return;
  }
  const supplierRows = procurementSupplierRows(lotPrices, lotAwards);
  document.querySelector("#pageTitle").textContent = lot.name;
  document.querySelector("#pageSubtitle").textContent = `${contract.name}｜${lot.code || "-"}｜${lot.status || "-"}`;
  document.querySelector("#content").innerHTML = `
    <section class="panel contract-detail-header">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(lot.name)}</h2>
          <p>${escapeHtml(lot.code || "-")}｜${escapeHtml(lot.lot_type || "人员外包")}｜${escapeHtml(lot.effective_from || contract.effective_from || "-")} 至 ${escapeHtml(lot.effective_to || contract.effective_to || "-")}</p>
        </div>
        <div class="actions">
          <button class="secondary" id="backToContractRoot">返回合同</button>
          <button class="secondary" data-edit="contract-lots" data-id="${lot.id}">编辑标段</button>
          <button class="secondary" data-price-matrix-lot="${lot.id}">全览</button>
        </div>
      </div>
    </section>
    <section class="panel contract-overview-panel">
      <div class="panel-header">
        <div>
          <h2>标段情况</h2>
          <p>标段基础信息和入围供应商维护入口</p>
        </div>
      </div>
      <div class="panel-body compact-panel-body">
        <div class="contract-compact-info">
          <div class="contract-compact-grid">
            ${[
              ["所属合同", contract.name || "-"],
              ["标段编号", lot.code || "-"],
              ["标段类型", lot.lot_type || "-"],
              ["有效期", `${lot.effective_from || contract.effective_from || "-"} 至 ${lot.effective_to || contract.effective_to || "-"}`],
              ["状态", lot.status || "-"],
              ["入围供应商", `${supplierRows.length} 家`],
            ].map(([label, value]) => `
              <div class="compact-info-item">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `).join("")}
          </div>
          ${lot.service_scope || lot.remark ? `<p class="contract-compact-remark">${escapeHtml(lot.service_scope || lot.remark)}</p>` : ""}
        </div>
      </div>
    </section>
    <section class="panel contract-lot-list-panel">
      <div class="panel-header">
        <div>
          <h2>中标/入围供应商</h2>
          <p>点击供应商查看各类人员价格</p>
        </div>
        <div class="actions">
          <button class="primary" data-new-award-supplier data-lot-id="${lot.id}">新增供应商</button>
          <span class="status">${supplierRows.length} 家</span>
        </div>
      </div>
      <div class="panel-body">
        ${supplierRows.length ? table(supplierRows, awardedSupplierPageColumns(lot.id), null) : `<div class="empty">该标段暂无入围供应商。新增第一条人员价格即可形成供应商入围记录。</div>`}
      </div>
    </section>
  `;
}

function renderSupplierPricePage(contract, lot, supplierPrices, award = null) {
  if (!supplierPrices.length && !award) {
    state.view = lot ? `contractDetail:${contract.id}:lot-${lot.id}` : `contractDetail:${contract.id}:contract`;
    renderNav();
    loadView();
    return;
  }
  const supplier = procurementSupplierRows(supplierPrices, award ? [award] : [])[0];
  document.querySelector("#pageTitle").textContent = supplier.supplier_name || "供应商价格";
  document.querySelector("#pageSubtitle").textContent = `${contract.name}｜${lot?.name || "合同级入围"}`;
  document.querySelector("#content").innerHTML = `
    <section class="panel contract-detail-header">
      <div class="panel-header">
        <div>
          <h2>${escapeHtml(supplier.supplier_name || "-")}</h2>
          <p>${escapeHtml(supplier.supplier_code || "-")}｜${escapeHtml(lot?.name || "合同级入围")}｜${escapeHtml(supplier.effective_from || "-")} 至 ${escapeHtml(supplier.effective_to || "-")}</p>
        </div>
        <div class="actions">
          <button class="secondary" data-lot-page="${lot?.id || ""}">返回标段</button>
        </div>
      </div>
    </section>
    <section class="panel contract-overview-panel">
      <div class="panel-header">
        <div>
          <h2>供应商入围信息</h2>
          <p>该供应商在当前标段下的入围和价格维护情况</p>
        </div>
      </div>
      <div class="panel-body compact-panel-body">
        <div class="contract-compact-info">
          <div class="contract-compact-grid">
            ${[
              ["供应商编号", supplier.supplier_code || "-"],
              ["所属标段", lot?.name || "合同级入围"],
              ["入围状态", supplier.shortlist_status || "-"],
              ["入围有效期", `${supplier.effective_from || "-"} 至 ${supplier.effective_to || "-"}`],
              ["价格项", `${supplierPrices.length} 项`],
              ["状态", supplier.status || "-"],
            ].map(([label, value]) => `
              <div class="compact-info-item">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="panel contract-lot-list-panel">
      <div class="panel-header">
        <div>
          <h2>人员价格表</h2>
          <p>按人员类型、级别维护标准价格</p>
        </div>
        <div class="actions">
          <button class="primary" data-new-award-supplier data-lot-id="${lot?.id || ""}" data-supplier-id="${supplier.supplier_id}">新增价格项</button>
          <span class="status">${supplierPrices.length} 项</span>
        </div>
      </div>
      <div class="panel-body">
        ${supplierPrices.length ? table(supplierPrices, personnelPriceColumns(true), null) : `<div class="empty">暂无人员价格。可先新增价格项，维护人员类型、级别和标准单价。</div>`}
      </div>
    </section>
  `;
}

function normalizeContractNodeKey(nodeKey, lots, prices) {
  if (nodeKey === "contract") return nodeKey;
  const parsed = parseContractNodeKey(nodeKey);
  if (parsed.type === "lot" && lots.some((lot) => Number(lot.id) === Number(parsed.lotId))) return nodeKey;
  if (parsed.type === "supplier" && prices.some((price) => Number(price.supplier_id) === Number(parsed.supplierId) && Number(price.lot_id || 0) === Number(parsed.lotId || 0))) return nodeKey;
  return "contract";
}

function parseContractNodeKey(nodeKey) {
  const parts = String(nodeKey || "contract").split("-");
  if (parts[0] === "lot") return { type: "lot", lotId: Number(parts[1]) };
  if (parts[0] === "supplier") return { type: "supplier", lotId: Number(parts[1] || 0), supplierId: Number(parts[2]) };
  return { type: "contract" };
}

function contractAwardedSupplierCount(prices) {
  return new Set(prices.map((price) => `${price.lot_id || 0}:${price.supplier_id}`)).size;
}

function renderContractStructureTree(contract, lots, prices, selectedKey) {
  const directPrices = prices.filter((price) => !price.lot_id);
  return `
    <button class="contract-tree-node root ${selectedKey === "contract" ? "active" : ""}" data-contract-node-key="contract">
      <strong>${escapeHtml(contract.name)}</strong>
      <span>${escapeHtml(contract.code || "-")}｜人员外包框架</span>
    </button>
    ${directPrices.length ? renderSupplierTreeGroup("合同级入围", 0, directPrices, selectedKey) : ""}
    ${lots.map((lot) => {
      const lotPrices = prices.filter((price) => Number(price.lot_id) === Number(lot.id));
      const lotKey = `lot-${lot.id}`;
      return `
        <button class="contract-tree-node lot ${selectedKey === lotKey ? "active" : ""}" data-contract-node-key="${lotKey}">
          <strong>${escapeHtml(lot.name)}</strong>
          <span>${escapeHtml(lot.code || "-")}｜${new Set(lotPrices.map((price) => price.supplier_id)).size} 家入围</span>
        </button>
        ${renderSupplierTreeGroup("入围供应商", lot.id, lotPrices, selectedKey)}
      `;
    }).join("")}
  `;
}

function renderSupplierTreeGroup(label, lotId, prices, selectedKey) {
  const suppliers = procurementSupplierRows(prices);
  if (!suppliers.length) return "";
  return `
    <div class="contract-tree-group">${escapeHtml(label)}</div>
    ${suppliers.map((supplier) => {
      const key = `supplier-${lotId || 0}-${supplier.supplier_id}`;
      return `
        <button class="contract-tree-node supplier ${selectedKey === key ? "active" : ""}" data-contract-node-key="${key}">
          <strong>${escapeHtml(supplier.supplier_name || "-")}</strong>
          <span>${Number(supplier.price_count || 0)} 项价格｜${escapeHtml(supplier.effective_to || "-")}</span>
        </button>
      `;
    }).join("")}
  `;
}

function renderContractNodePanel(contract, lots, prices, nodeKey) {
  const parsed = parseContractNodeKey(nodeKey);
  if (parsed.type === "lot") {
    const lot = lots.find((item) => Number(item.id) === Number(parsed.lotId));
    return renderLotNodePanel(contract, lot, prices.filter((price) => Number(price.lot_id) === Number(parsed.lotId)));
  }
  if (parsed.type === "supplier") {
    const supplierPrices = prices.filter((price) => Number(price.supplier_id) === Number(parsed.supplierId) && Number(price.lot_id || 0) === Number(parsed.lotId || 0));
    const lot = lots.find((item) => Number(item.id) === Number(parsed.lotId));
    return renderSupplierNodePanel(contract, lot, supplierPrices);
  }
  return renderContractNodePanelRoot(contract, lots, prices);
}

function renderContractNodePanelRoot(contract, lots, prices) {
  return `
    <div class="panel-header">
      <div>
        <h2>框架协议信息</h2>
        <p>维护人员外包框架协议本身，以及协议下的标段/服务包。</p>
      </div>
    </div>
    <div class="panel-body">
      <div class="detail-list">
        ${detailRow("合同名称", contract.name || "-")}
        ${detailRow("合同编号", contract.code || "-")}
        ${detailRow("合同类型", "框架协议")}
        ${detailRow("签约主体", contract.signing_subject || "-")}
        ${detailRow("相对方", contract.counterparty_name || "-")}
        ${detailRow("有效期", `${contract.effective_from || "-"} 至 ${contract.effective_to || "-"}`)}
        ${detailRow("状态", contract.status || "-")}
        ${detailRow("备注", contract.remark || "-")}
      </div>
      <div class="section-divider"></div>
      <div class="panel-header inner-header">
        <h2>标段/服务包</h2>
        <div class="actions">
          <button class="primary" id="newContractLot">新增标段</button>
          <span class="status">${lots.length} 个</span>
        </div>
      </div>
      ${lots.length ? table(lots, contractLotNodeColumns(), null) : `<div class="empty">暂无标段/服务包，可先新增标段后维护入围供应商和人员价格。</div>`}
      ${renderProjectPricePicker(contract, prices)}
    </div>
  `;
}

function renderLotNodePanel(contract, lot, lotPrices) {
  if (!lot) return `<div class="empty">标段不存在</div>`;
  const supplierRows = procurementSupplierRows(lotPrices);
  return `
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(lot.name)}</h2>
        <p>${escapeHtml(lot.code || "-")}｜${escapeHtml(lot.lot_type || "人员外包")}｜所属合同 ${escapeHtml(contract.name)}</p>
      </div>
      <div class="actions">
        <button class="secondary" data-edit="contract-lots" data-id="${lot.id}">编辑标段</button>
        <button class="secondary" data-price-matrix-lot="${lot.id}">全览</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="detail-list">
        ${detailRow("标段名称", lot.name || "-")}
        ${detailRow("标段编号", lot.code || "-")}
        ${detailRow("标段类型", lot.lot_type || "-")}
        ${detailRow("服务范围", lot.service_scope || lot.remark || "-")}
        ${detailRow("有效期", `${lot.effective_from || contract.effective_from || "-"} 至 ${lot.effective_to || contract.effective_to || "-"}`)}
        ${detailRow("状态", lot.status || "-")}
      </div>
      <div class="section-divider"></div>
      <div class="panel-header inner-header">
        <h2>入围供应商</h2>
        <span class="status">${supplierRows.length} 家</span>
      </div>
      ${supplierRows.length ? table(supplierRows, awardedSupplierColumns(lot.id), null) : `<div class="empty">该标段暂无入围供应商。新增第一条人员价格即可形成供应商入围记录。</div>`}
      <div class="section-divider"></div>
      <div class="panel-header inner-header">
        <h2>价格矩阵</h2>
        <span class="status">供应商 × 人员类型/级别</span>
      </div>
      ${lotPrices.length ? renderLotPriceMatrix(lotPrices) : `<div class="empty">暂无价格项</div>`}
    </div>
  `;
}

function renderSupplierNodePanel(contract, lot, supplierPrices) {
  if (!supplierPrices.length) return `<div class="empty">供应商入围信息不存在</div>`;
  const supplier = procurementSupplierRows(supplierPrices)[0];
  return `
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(supplier.supplier_name || "-")}</h2>
        <p>${escapeHtml(supplier.supplier_code || "-")}｜${lot ? escapeHtml(lot.name) : "合同级入围"}</p>
      </div>
      <div class="actions">
        <button class="primary" data-new-price-lot="${lot?.id || ""}">新增价格项</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="detail-list">
        ${detailRow("供应商名称", supplier.supplier_name || "-")}
        ${detailRow("供应商编号", supplier.supplier_code || "-")}
        ${detailRow("所属合同", contract.name || "-")}
        ${detailRow("所属标段", lot?.name || "合同级入围")}
        ${detailRow("入围状态", supplier.shortlist_status || "-")}
        ${detailRow("入围有效期", `${supplier.effective_from || "-"} 至 ${supplier.effective_to || "-"}`)}
        ${detailRow("价格维护状态", supplier.price_count ? "已维护" : "未维护")}
      </div>
      <div class="section-divider"></div>
      <div class="panel-header inner-header">
        <h2>人员价格表</h2>
        <span class="status">${supplierPrices.length} 项</span>
      </div>
      ${table(supplierPrices, personnelPriceColumns(true), null)}
    </div>
  `;
}

function contractLotNodeColumns() {
  return [
    { label: "标段名称", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "标段类型", render: (row) => badge(row.lot_type || "人员外包") },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "状态", render: (row) => badge(row.status || "启用", row.status === "启用" ? "green" : "red") },
    { label: "操作", render: (row) => `<div class="row-actions"><button class="table-action" data-contract-node-key="lot-${row.id}">查看</button><button class="table-action" data-edit="contract-lots" data-id="${row.id}">编辑</button></div>` },
  ];
}

function contractLotVerticalColumns(prices) {
  return [
    { label: "标段名称", render: (row) => `<button class="link-button" data-lot-page="${row.id}"><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(row.code || "-")}</span></button>` },
    { label: "标段类型", render: (row) => badge(row.lot_type || "人员外包") },
    { label: "服务范围", render: (row) => escapeHtml(row.service_scope || row.remark || "-") },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "入围/价格", render: (row) => {
      const lotPrices = prices.filter((price) => Number(price.lot_id) === Number(row.id));
      return `${new Set(lotPrices.map((price) => price.supplier_id)).size} 家供应商<br><span>${lotPrices.length} 项价格</span>`;
    } },
    { label: "状态", render: (row) => badge(row.status || "启用", row.status === "启用" ? "green" : "red") },
    { label: "操作", render: (row) => `<div class="row-actions"><button class="table-action" data-lot-page="${row.id}">查看</button><button class="table-action" data-edit="contract-lots" data-id="${row.id}">编辑</button></div>` },
  ];
}

function awardedSupplierColumns(lotId) {
  return [
    { label: "供应商名称", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "已入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "入围有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "价格维护", render: (row) => row.price_count ? badge("已维护", "green") : badge("未维护", "yellow") },
    { label: "状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : "red") },
    { label: "操作", render: (row) => `<button class="table-action" data-contract-node-key="supplier-${lotId || 0}-${row.supplier_id}">查看价格</button>` },
  ];
}

function awardedSupplierVerticalColumns(lotId) {
  return [
    { label: "供应商名称", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "已入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "入围有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "价格维护", render: (row) => row.price_count ? badge("已维护", "green") : badge("未维护", "yellow") },
    { label: "价格项", render: (row) => `${Number(row.price_count || 0)} 项` },
    { label: "状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : "red") },
    { label: "操作", render: (row) => `<a class="table-action anchor-action" href="#lot-${lotId}">查看价格</a>` },
  ];
}

function awardedSupplierPageColumns(lotId) {
  return [
    { label: "供应商名称", render: (row) => `<button class="link-button" data-supplier-page="${lotId || 0}:${row.supplier_id}"><strong>${escapeHtml(row.supplier_name || "-")}</strong><span>${escapeHtml(row.supplier_code || "-")}</span></button>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "已入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "入围有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "价格维护", render: (row) => row.price_count ? badge("已维护", "green") : badge("未维护", "yellow") },
    { label: "价格项", render: (row) => `${Number(row.price_count || 0)} 项` },
    { label: "状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : "red") },
    {
      label: "操作",
      render: (row) => `
        <div class="row-actions">
          <button class="table-action" data-supplier-page="${lotId || 0}:${row.supplier_id}">查看</button>
          <button class="table-action" data-award-supplier-edit="${lotId || 0}:${row.supplier_id}">修改</button>
          <button class="table-action danger" data-award-supplier-delete="${lotId || 0}:${row.supplier_id}">删除</button>
        </div>`,
    },
  ];
}

function renderLotPriceMatrix(prices) {
  const priceItems = orderedPriceItems(prices);
  return `<div class="price-matrix-overview">${table(priceMatrixRows(prices, priceItems), priceMatrixColumns(priceItems), null)}</div>`;
}

function personnelPriceColumns(withActions = false) {
  return [
    { label: "人员类型/级别", render: (row) => `<strong>${escapeHtml(row.personnel_type || "人员服务")}</strong><br><span>${escapeHtml(row.personnel_level || row.price_item || "-")}</span>` },
    { label: "计价单位", render: (row) => escapeHtml(row.price_unit || "人日") },
    { label: "含税单价", render: (row) => `${formatMoney(row.unit_price)} 元` },
    { label: "税率", render: (row) => `${formatMoney(Number(row.tax_rate || 0) * 100)}%` },
    { label: "不含税单价", render: (row) => `${formatMoney(taxExcludedPrice(row.unit_price, row.tax_rate))} 元` },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : "red") },
    ...(withActions ? [{ label: "操作", render: (row) => `<div class="row-actions"><button class="table-action" data-edit="lot-supplier-prices" data-id="${row.id}">编辑</button><button class="table-action danger" data-lot-price-delete="${row.id}">删除</button></div>` }] : []),
  ];
}

function taxExcludedPrice(price, taxRate) {
  const rate = Number(taxRate || 0);
  return rate > -1 ? Number(price || 0) / (1 + rate) : Number(price || 0);
}

function renderProjectPricePicker(contract, prices) {
  const activePrices = currentEffectivePrices(prices);
  if (!activePrices.length) {
    return `
      <div class="section-divider"></div>
      <div class="panel-header inner-header"><h2>项目用人选用工具</h2><span class="status">暂无当前有效价格</span></div>
      <div class="empty">维护有效的标段、入围供应商和人员价格后，项目用人时可在这里自动带出标准价格。</div>
    `;
  }
  return `
    <div class="section-divider"></div>
    <div class="panel-header inner-header">
      <h2>项目用人选用工具</h2>
      <span class="status">按合同 → 标段 → 供应商 → 人员类型/级别选用</span>
    </div>
    <div class="outsourcing-picker" data-outsourcing-picker="${contract.id}">
      <label class="field">
        <span>合同/协议</span>
        <input value="${escapeHtml(contract.name)}" disabled />
      </label>
      <label class="field">
        <span>标段/服务包</span>
        <select id="pickerLot"></select>
      </label>
      <label class="field">
        <span>入围供应商</span>
        <select id="pickerSupplier"></select>
      </label>
      <label class="field">
        <span>人员类型/级别</span>
        <select id="pickerPrice"></select>
      </label>
      <label class="field">
        <span>数量</span>
        <input id="pickerQty" type="number" value="1" min="0" step="0.5" />
      </label>
      <div class="price-result">
        <span>计价单位</span><strong id="pickerUnit">-</strong>
        <span>标准单价</span><strong id="pickerPriceValue">-</strong>
        <span>金额</span><strong id="pickerAmount">-</strong>
      </div>
    </div>
  `;
}

function bindProjectPricePicker(container, contract) {
  const picker = container.querySelector("[data-outsourcing-picker]");
  if (!picker) return;
  const prices = currentEffectivePrices((state.data.governance.lotSupplierPrices || []).filter((price) => Number(price.contract_id) === Number(contract.id)));
  const lotSelect = picker.querySelector("#pickerLot");
  const supplierSelect = picker.querySelector("#pickerSupplier");
  const priceSelect = picker.querySelector("#pickerPrice");
  const qtyInput = picker.querySelector("#pickerQty");
  const unitOutput = picker.querySelector("#pickerUnit");
  const priceOutput = picker.querySelector("#pickerPriceValue");
  const amountOutput = picker.querySelector("#pickerAmount");

  function lotOptions() {
    const rows = new Map();
    prices.forEach((price) => rows.set(String(price.lot_id || 0), price.lot_id ? `${price.lot_name || "-"}｜${price.lot_code || "-"}` : "合同级入围"));
    lotSelect.innerHTML = Array.from(rows.entries()).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("");
  }

  function supplierOptions() {
    const lotId = Number(lotSelect.value || 0);
    const rows = new Map();
    prices.filter((price) => Number(price.lot_id || 0) === lotId).forEach((price) => rows.set(String(price.supplier_id), `${price.supplier_name || "-"}｜${price.supplier_code || "-"}`));
    supplierSelect.innerHTML = Array.from(rows.entries()).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("");
  }

  function priceOptions() {
    const lotId = Number(lotSelect.value || 0);
    const supplierId = Number(supplierSelect.value || 0);
    const rows = prices.filter((price) => Number(price.lot_id || 0) === lotId && Number(price.supplier_id) === supplierId);
    priceSelect.innerHTML = rows.map((price) => `<option value="${price.id}">${escapeHtml(priceLabel(price))}</option>`).join("");
  }

  function updateResult() {
    const price = prices.find((item) => String(item.id) === String(priceSelect.value));
    if (!price) {
      unitOutput.textContent = "-";
      priceOutput.textContent = "-";
      amountOutput.textContent = "-";
      return;
    }
    const qty = Number(qtyInput.value || 0);
    unitOutput.textContent = price.price_unit || "人日";
    priceOutput.textContent = `${formatMoney(price.unit_price)} 元`;
    amountOutput.textContent = `${formatMoney(qty * Number(price.unit_price || 0))} 元`;
  }

  lotOptions();
  supplierOptions();
  priceOptions();
  updateResult();
  lotSelect.addEventListener("change", () => {
    supplierOptions();
    priceOptions();
    updateResult();
  });
  supplierSelect.addEventListener("change", () => {
    priceOptions();
    updateResult();
  });
  priceSelect.addEventListener("change", updateResult);
  qtyInput.addEventListener("input", updateResult);
}

function currentEffectivePrices(prices) {
  const current = today();
  return prices.filter((price) => {
    if ((price.status || "有效") !== "有效") return false;
    if (price.effective_from && price.effective_from > current) return false;
    if (price.effective_to && price.effective_to < current) return false;
    return true;
  });
}

function priceLabel(price) {
  return `${price.personnel_type || "人员服务"}｜${price.personnel_level || price.price_item || "-"}｜${formatMoney(price.unit_price)} 元/${price.price_unit || "人日"}`;
}

function renderContractTab(contract, lots, prices, tab) {
  if (tab === "outcome") {
    return renderTenderOutcome(contract, lots, prices);
  }
  if (tab === "lots") {
    return `
      <div class="panel-header inner-header"><h2>标段管理</h2><button class="primary" id="newContractLot">新增标段</button></div>
      ${table(lots, contractLotColumns(false, true), null)}
    `;
  }
  if (tab === "prices") {
    return `
      <div class="panel-header inner-header"><h2>价格维护</h2><button class="primary" id="newLotSupplierPrice">新增价格项</button></div>
      ${table(prices, lotSupplierPriceColumns(false, true), null)}
    `;
  }
  if (tab === "matrix") {
    return renderContractPriceMatrix(lots, prices);
  }
  if (tab === "changes") {
    return `
      <div class="empty">
        当前 MVP 暂未维护履约/变更记录。后续可在这里记录续签、调价、终止、附件和审批痕迹。
      </div>
    `;
  }
  return `
    <div class="detail-list">
      ${detailRow("合同/协议编号", contract.code || "-")}
      ${detailRow("属性/业务类型", `${contract.contract_attribute || "-"}｜${contract.contract_type || "-"}`)}
      ${detailRow("签约主体", contract.signing_subject || "-")}
      ${detailRow("相对方", contract.counterparty_name || "-")}
      ${detailRow("金额/币种", `${formatMoney(contract.total_amount)} 万元｜${contract.currency || "CNY"}｜${contract.tax_included || "含税"}`)}
      ${detailRow("签订日期/时长", `${contract.signed_date || "-"}｜${Number(contract.duration_months || 0)} 个月`)}
      ${detailRow("有效期", `${contract.effective_from || "-"} 至 ${contract.effective_to || "长期"}`)}
      ${detailRow("状态", contract.status || "-")}
      ${detailRow("付款条款", contract.payment_terms || "-")}
      ${detailRow("归口部门", contract.owner_department || "-")}
      ${detailRow("备注", contract.remark || "-")}
    </div>
  `;
}

function renderTenderOutcome(contract, lots, prices) {
  const directPrices = prices.filter((price) => !price.lot_id);
  const lotSections = lots.map((lot) => {
    const lotPrices = prices.filter((price) => Number(price.lot_id) === Number(lot.id));
    return `
      <details class="subject-section" open>
        <summary>
          <span>
            <strong>${escapeHtml(lot.name)}</strong>
            <small>${escapeHtml(lot.code || "-")}｜${escapeHtml(lot.lot_type || "标段")}｜预算 ${formatMoney(lot.budget_amount)} 万元</small>
          </span>
          <span class="status">${new Set(lotPrices.map((price) => price.supplier_id)).size} 家入围｜${lotPrices.length} 项价格</span>
        </summary>
        <div class="subject-body">
          <div class="panel-header inner-header">
            <h2>标段招标结果</h2>
            <button class="primary" data-new-price-lot="${lot.id}">新增供应商</button>
          </div>
          ${lotPrices.length ? table(procurementSupplierRows(lotPrices), procurementSupplierColumns(), null) : `<div class="empty">该标段暂无入围供应商或价格体系</div>`}
        </div>
      </details>
    `;
  }).join("");

  const directSection = directPrices.length || !lots.length
    ? `
      <details class="subject-section" open>
        <summary>
          <span>
            <strong>${escapeHtml(contract.name)}</strong>
            <small>${escapeHtml(contract.code || "-")}｜合同/协议直接入围</small>
          </span>
          <span class="status">${new Set(directPrices.map((price) => price.supplier_id)).size} 家入围｜${directPrices.length} 项价格</span>
        </summary>
        <div class="subject-body">
          <div class="panel-header inner-header">
            <h2>合同级招标结果</h2>
            <button class="primary" data-new-price-contract="${contract.id}">新增供应商</button>
          </div>
          ${directPrices.length ? table(procurementSupplierRows(directPrices), procurementSupplierColumns(), null) : `<div class="empty">该合同暂无标段，可直接维护合同级入围供应商和人员价格体系</div>`}
        </div>
      </details>
    `
    : "";

  return `
    <div class="panel-header inner-header">
      <h2>合同/标段招标结果</h2>
      <span class="status">合同 → 标段 → 入围供应商 → 人员类型/价格体系</span>
    </div>
    <div class="contract-flow">
      <span>合同/框架</span>
      <span>标段/服务包（可选）</span>
      <span>入围供应商</span>
      <span>人员类型与价格</span>
    </div>
    ${directSection}
    ${lotSections || ""}
  `;
}

function procurementSupplierRows(prices, awards = []) {
  const rows = new Map();
  awards.forEach((award) => {
    const key = `${award.contract_id || "contract"}:${award.lot_id || "direct"}:${award.supplier_id}`;
    rows.set(key, {
      id: key,
      award_id: award.id,
      contract_id: award.contract_id,
      lot_id: award.lot_id,
      supplier_id: award.supplier_id,
      supplier_name: award.supplier_name,
      supplier_code: award.supplier_code,
      shortlist_status: award.shortlist_status,
      agreement_code: award.agreement_code,
      agreement_name: award.agreement_name,
      effective_from: award.effective_from,
      effective_to: award.effective_to,
      status: award.status,
      price_items: [],
      price_count: 0,
    });
  });
  prices.forEach((price) => {
    const key = `${price.contract_id || "contract"}:${price.lot_id || "direct"}:${price.supplier_id}`;
    const existing = rows.get(key) || {
      id: key,
      award_id: null,
      contract_id: price.contract_id,
      lot_id: price.lot_id,
      supplier_id: price.supplier_id,
      supplier_name: price.supplier_name,
      supplier_code: price.supplier_code,
      shortlist_status: price.shortlist_status,
      agreement_code: price.agreement_code,
      agreement_name: price.agreement_name,
      effective_from: price.effective_from,
      effective_to: price.effective_to,
      status: price.status,
      price_items: [],
      price_count: 0,
    };
    existing.price_items.push(`${priceAxisLabel(price) || "-"} ${formatMoney(price.unit_price)}元/${price.price_unit || "人日"}`);
    existing.price_count += 1;
    if (!existing.agreement_code && price.agreement_code) existing.agreement_code = price.agreement_code;
    if (!existing.agreement_name && price.agreement_name) existing.agreement_name = price.agreement_name;
    if (price.effective_from && (!existing.effective_from || price.effective_from < existing.effective_from)) existing.effective_from = price.effective_from;
    if (price.effective_to && (!existing.effective_to || price.effective_to > existing.effective_to)) existing.effective_to = price.effective_to;
    rows.set(key, existing);
  });
  return Array.from(rows.values());
}

function procurementSupplierColumns() {
  return [
    { label: "入围供应商", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "已入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "框架/协议", render: (row) => row.agreement_code ? `<strong>${escapeHtml(row.agreement_code)}</strong><br><span>${escapeHtml(row.agreement_name || "-")}</span>` : "-" },
    { label: "人员类型/价格体系", render: (row) => `${Number(row.price_count || 0)} 项<br><span>${escapeHtml(row.price_items.slice(0, 3).join("、"))}${row.price_items.length > 3 ? "..." : ""}</span>` },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : row.status === "待生效" ? "yellow" : "red") },
  ];
}

function contractSupplierRows(lots, prices) {
  const rows = new Map();
  prices.forEach((price) => {
    const key = `${price.lot_id}:${price.supplier_id}`;
    const existing = rows.get(key) || {
      id: key,
      lot_name: price.lot_name,
      lot_code: price.lot_code,
      supplier_name: price.supplier_name,
      supplier_code: price.supplier_code,
      shortlist_status: price.shortlist_status,
      status: price.shortlist_status,
      price_items: [],
    };
    existing.price_items.push(price.price_item);
    rows.set(key, existing);
  });
  lots.forEach((lot) => {
    if (!prices.some((price) => Number(price.lot_id) === Number(lot.id))) {
      rows.set(`lot:${lot.id}`, {
        id: `lot:${lot.id}`,
        lot_name: lot.name,
        lot_code: lot.code,
        supplier_name: "暂无入围供应商",
        supplier_code: "-",
        shortlist_status: "待入围",
        status: "待入围",
        price_items: [],
      });
    }
  });
  return Array.from(rows.values());
}

function renderOrganizationInfoAdmin(governance) {
  const content = document.querySelector("#content");
  const organizations = governance.organizations;
  const selected = getSelectedOrganization(organizations);
  if (!selected) {
    content.innerHTML = `<section class="panel"><div class="empty">暂无组织</div></section>`;
    return;
  }
  const children = getOrgChildren(selected.id, organizations);
  const parent = getOrgParent(selected, organizations);

  content.innerHTML = `
    <section class="org-admin-shell">
      <div class="panel org-sidebar-panel">
        <div class="panel-header compact-header">
          <h2>组织树</h2>
          <span class="status">${organizations.length} 个</span>
        </div>
        <div class="panel-body org-sidebar-body">
          <input id="orgSearch" type="search" placeholder="搜索组织/负责人/编码" value="${escapeHtml(state.orgSearch)}" />
          ${renderOrganizationTree(organizations, selected.id, state.orgSearch)}
        </div>
      </div>

      <div class="org-workspace">
        <section class="panel org-master-panel">
          <div class="org-toolbar compact-toolbar">
            <div>
              <h2>${escapeHtml(selected.name)}</h2>
              <p>${escapeHtml(selected.code || "-")}｜${escapeHtml(orgTypeLabel(selected.type))}｜上级 ${escapeHtml(parent?.name || "无")}｜负责人 ${escapeHtml(selected.owner_name || "未指定")}</p>
            </div>
            <div class="actions">
              <button class="secondary" data-new-sibling="${selected.parent_id || ""}">新增同级</button>
              <button class="secondary" data-new-child="${selected.id}">新增下级</button>
              <button class="primary" data-org-edit="${selected.id}">编辑组织</button>
              <button class="danger" data-disable-org="${selected.id}">停用组织</button>
            </div>
          </div>
          <div class="panel-body org-master-body">
            <div class="org-master-title">
              <div>
                <strong>${escapeHtml(selected.name)}</strong>
                ${badge(selected.status, selected.status === "启用" ? "green" : "red")}
              </div>
              <span>${escapeHtml(selected.effective_from || "-")} 至 ${escapeHtml(selected.effective_to || "长期")}</span>
            </div>
            <div class="org-info-grid">
              ${orgInfoItem("组织编码", selected.code || "-")}
              ${orgInfoItem("组织简称", selected.short_name || "-")}
              ${orgInfoItem("组织类型", orgTypeLabel(selected.type))}
              ${orgInfoItem("上级组织", parent?.name || "无上级")}
              ${orgInfoItem("负责人", selected.owner_name || "未指定")}
              ${orgInfoItem("分管领导", selected.leader_name || "未指定")}
              ${orgInfoItem("排序号", selected.sort_order ?? 0)}
              ${orgInfoItem("状态", selected.status)}
              ${orgInfoItem("生效日期", selected.effective_from || "-")}
              ${orgInfoItem("失效日期", selected.effective_to || "长期")}
            </div>
            <div class="org-remark">
              <span>备注</span>
              <p>${escapeHtml(selected.remark || "暂无备注")}</p>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>直接下级</h2>
              <p>只展示当前组织下一级组织，更多层级通过左侧组织树维护。</p>
            </div>
            <div class="actions">
              <button class="secondary" data-org-history="${selected.id}">变更记录</button>
              <button class="secondary" data-panorama>查看架构图</button>
            </div>
          </div>
          <div class="panel-body org-child-list">
            ${children.length ? children.map((child) => `
              <button class="org-child-row" data-select-org="${child.id}">
                <span><strong>${escapeHtml(child.name)}</strong><small>${escapeHtml(child.code || "-")}｜${escapeHtml(orgTypeLabel(child.type))}</small></span>
                <span>${escapeHtml(child.owner_name || "未指定")}</span>
                ${badge(child.status, child.status === "启用" ? "green" : "red")}
              </button>
            `).join("") : `<div class="empty">当前组织暂无下级组织</div>`}
          </div>
        </section>
      </div>
    </section>
  `;

  bindOrganizationAdminEvents();
}

function renderOrganizationAdmin(governance) {
  renderOrganizationInfoAdmin(governance);
}

function orgInfoItem(label, value) {
  return `<div class="org-info-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? "-")}</strong></div>`;
}

function renderOrganizationChart(governance) {
  const content = document.querySelector("#content");
  const organizations = governance.organizations || [];
  const selected = getSelectedOrganization(organizations);
  if (!selected) {
    content.innerHTML = `<section class="panel"><div class="empty">暂无组织</div></section>`;
    return;
  }
  const roots = organizations.filter((org) => org.parent_id == null);
  const parent = getOrgParent(selected, organizations);
  const children = getOrgChildren(selected.id, organizations);
  const directPersons = getOrgPersons(selected.id, governance);
  const totalPersons = getOrgPersonCountRecursive(selected.id, organizations, governance);

  content.innerHTML = `
    <section class="org-chart-page">
      <div class="panel org-chart-filter">
        <div class="field compact-field">
          <label>生效日期</label>
          <input type="date" id="orgChartDate" value="${escapeHtml(today())}" />
        </div>
        <div class="field compact-field">
          <label>组织范围</label>
          <select id="orgChartRoot">
            ${roots.map((org) => `<option value="${org.id}" ${Number(org.id) === Number(selected.id) ? "selected" : ""}>${escapeHtml(org.name)}</option>`).join("")}
            ${!roots.some((org) => Number(org.id) === Number(selected.id)) ? `<option value="${selected.id}" selected>${escapeHtml(selected.name)}</option>` : ""}
          </select>
        </div>
        <label class="checkbox-row inline-checkbox">
          <input type="checkbox" id="orgChartShowPeople" ${state.orgChartShowPeople ? "checked" : ""} />
          <span>显示直属人员</span>
        </label>
        <div class="actions">
          <button class="secondary" data-go="orgInfoAdmin">进入维护</button>
          <button class="secondary" id="exportOrganizations">导出</button>
        </div>
      </div>

      <div class="org-chart-layout">
        <section class="panel org-chart-canvas">
          <div class="panel-header">
            <div>
              <h2>组织架构图</h2>
              <p>点击节点查看组织详情；维护动作请进入组织信息维护。</p>
            </div>
            <span class="status">当前：${escapeHtml(selected.name)}</span>
          </div>
          <div class="panel-body">
            <div class="org-chart-tree">
              ${renderOrgChartBranch(selected, organizations, governance, 0)}
            </div>
          </div>
        </section>

        <aside class="panel org-chart-detail">
          <div class="panel-header">
            <h2>节点详情</h2>
            ${badge(selected.status, selected.status === "启用" ? "green" : "red")}
          </div>
          <div class="panel-body relation-list">
            ${detailRow("组织名称", selected.name)}
            ${detailRow("组织编码", selected.code || "-")}
            ${detailRow("组织类型", orgTypeLabel(selected.type))}
            ${detailRow("负责人", selected.owner_name || "未指定")}
            ${detailRow("上级组织", parent?.name || "无上级")}
            ${detailRow("下级组织", `${children.length} 个`)}
            ${detailRow("直属人员", `${directPersons.length} 人`)}
            ${detailRow("含下级人员", `${totalPersons} 人`)}
            ${detailRow("有效期", `${selected.effective_from || "-"} 至 ${selected.effective_to || "长期"}`)}
          </div>
          <div class="panel-body org-chart-actions">
            <button class="secondary" data-org-people="${selected.id}">查看人员</button>
            <button class="secondary" data-select-org="${selected.id}">查看下级</button>
            <button class="secondary" data-panorama>全屏查看</button>
          </div>
        </aside>
      </div>
    </section>
  `;

  bindOrganizationAdminEvents();
  bindOrganizationChartEvents();
}

function renderOrgChartBranch(org, organizations, governance, depth) {
  const children = getOrgChildren(org.id, organizations);
  const persons = getOrgPersons(org.id, governance);
  return `
    <div class="org-chart-branch" style="--depth:${depth}">
      <button class="org-chart-card ${Number(org.id) === Number(state.selectedOrgId) ? "active" : ""}" data-select-org="${org.id}">
        <strong>${escapeHtml(org.name)}</strong>
        <span>负责人：${escapeHtml(org.owner_name || "未指定")}</span>
        <small>${Number(org.user_count || 0)} 人｜${children.length} 个下级｜${escapeHtml(org.status)}</small>
      </button>
      ${state.orgChartShowPeople && persons.length ? `
        <div class="org-chart-people">
          ${persons.slice(0, 6).map((person) => `<span>${escapeHtml(person.real_name || person.name)}</span>`).join("")}
          ${persons.length > 6 ? `<span>+${persons.length - 6}</span>` : ""}
        </div>
      ` : ""}
      ${children.length ? `<div class="org-chart-children">${children.map((child) => renderOrgChartBranch(child, organizations, governance, depth + 1)).join("")}</div>` : ""}
    </div>
  `;
}

function getOrgPersons(orgId, governance) {
  const persons = governance.persons?.length ? governance.persons : governance.users || [];
  return persons.filter((person) => Number(person.org_id) === Number(orgId));
}

function getOrgPersonCountRecursive(orgId, organizations, governance) {
  return getOrgChildren(orgId, organizations).reduce((sum, child) => sum + getOrgPersonCountRecursive(child.id, organizations, governance), getOrgPersons(orgId, governance).length);
}

function bindOrganizationChartEvents() {
  const showPeople = document.querySelector("#orgChartShowPeople");
  if (showPeople) {
    showPeople.addEventListener("change", () => {
      state.orgChartShowPeople = showPeople.checked;
      localStorage.setItem("projectBiOrgChartShowPeople", String(showPeople.checked));
      renderOrganizationChart(state.data.governance);
    });
  }
  const rootSelect = document.querySelector("#orgChartRoot");
  if (rootSelect) {
    rootSelect.addEventListener("change", () => {
      state.selectedOrgId = Number(rootSelect.value);
      localStorage.setItem("projectBiSelectedOrgId", String(state.selectedOrgId));
      renderOrganizationChart(state.data.governance);
    });
  }
  document.querySelectorAll("[data-org-people]").forEach((button) => {
    button.addEventListener("click", () => showOrganizationPeople(Number(button.dataset.orgPeople)));
  });
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.go;
      renderNav();
      await loadView();
    });
  });
}

function showOrganizationPeople(orgId) {
  const org = state.data.governance.organizations.find((item) => Number(item.id) === Number(orgId));
  const persons = getOrgPersons(orgId, state.data.governance);
  const dialog = document.querySelector("#panoramaDialog");
  document.querySelector("#panoramaContent").innerHTML = `
    <div class="panorama-toolbar">
      <strong>${escapeHtml(org?.name || "组织")}｜直属人员</strong>
      <span class="status">${persons.length} 人</span>
    </div>
    ${persons.length ? `
      <table>
        <thead><tr><th>姓名</th><th>编号</th><th>人员类型</th><th>状态</th></tr></thead>
        <tbody>${persons.map((person) => `
          <tr>
            <td><strong>${escapeHtml(person.real_name || person.name)}</strong></td>
            <td>${escapeHtml(person.employee_no || person.username || "-")}</td>
            <td>${escapeHtml(person.person_type || person.role_name || "-")}</td>
            <td>${badge(person.status || "在职", (person.status || "在职") === "在职" ? "green" : "red")}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    ` : `<div class="empty">当前组织暂无直属人员</div>`}
  `;
  dialog.showModal();
  dialog.querySelector("[data-close-panorama]").onclick = () => dialog.close();
}

function renderCard(card) {
  return `<article class="card"><span>${card.label}</span><strong>${card.value}<small>${card.unit}</small></strong></article>`;
}

function renderKpiBars(rows) {
  if (!rows.length) return `<div class="empty">当前角色暂无 KPI 目标</div>`;
  return `<div class="bar-list">${rows
    .slice(0, 8)
    .map((row) => {
      const value = Math.max(0, Math.min(120, Number(row.completion_rate || 0)));
      return `
        <div class="bar-row">
          <div class="bar-label"><span>${row.owner_name}｜${row.metric}</span><strong>${row.completion_rate}%</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${value}%"></div></div>
        </div>`;
    })
    .join("")}</div>`;
}

function renderBars(rows) {
  if (!rows.length) return `<div class="empty">当前角色暂无数据</div>`;
  const max = Math.max(...rows.map((row) => Number(row.value || 0)), 1);
  return `<div class="bar-list">${rows
    .map((row) => `
      <div class="bar-row">
        <div class="bar-label"><span>${row.name}</span><strong>${formatMoney(row.value)} 万元</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(Number(row.value || 0) / max) * 100}%"></div></div>
      </div>`)
    .join("")}</div>`;
}

function table(rows, columns, editableEndpoint) {
  if (!rows.length) return `<div class="empty">当前角色暂无可见数据</div>`;
  return `
    <table>
      <thead><tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}${editableEndpoint ? "<th>操作</th>" : ""}</tr></thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>
              ${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row[column.key])}</td>`).join("")}
              ${editableEndpoint ? `<td><button class="table-action" data-edit="${editableEndpoint}" data-id="${row.id ?? row.code}">维护</button></td>` : ""}
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function customerColumns() {
  return [
    { label: "客户", render: (row) => `<button class="link-button" data-customer-detail="${row.id}"><strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.industry)}｜${escapeHtml(row.region)}</span></button>` },
    { label: "客户等级", render: (row) => badge(row.level) },
    { label: "归属业务组", render: (row) => escapeHtml(row.owner_org_name || "-") },
    { label: "商机", render: (row) => `${Number(row.opportunity_count || 0)} 条<br><span>${Number(row.open_opportunity_count || 0)} 条推进中</span>` },
    { label: "商机储备", render: (row) => `${formatMoney(row.pipeline_amount)} 万元` },
    { label: "加权金额", render: (row) => `${formatMoney(row.weighted_amount)} 万元` },
    { label: "关联项目", render: (row) => `${Number(row.project_count || 0)} 个<br><span>${Number(row.active_project_count || 0)} 个进行中</span>` },
  ];
}

function opportunityColumns(full) {
  const columns = [
    { label: "商机", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${row.code}</span>` },
    { label: "客户", key: "customer_name" },
    { label: "业务组", key: "org_name" },
    { label: "阶段", render: (row) => badge(row.stage) },
    { label: "概率", render: (row) => `${Math.round(Number(row.probability) * 100)}%` },
    { label: "预计合同额", render: (row) => `${formatMoney(row.expected_contract_amount)} 万元` },
    { label: "加权金额", render: (row) => `${formatMoney(row.weighted_amount)} 万元` },
    { label: "预计签约", key: "expected_sign_month" },
  ];
  if (full) {
    columns.push(
      { label: "下一步", key: "next_action" },
      { label: "风险", render: (row) => badge(row.risk_level) },
      { label: "项目关联", render: (row) => row.project_id ? `<strong>${escapeHtml(row.project_name || "-")}</strong><br><span>${escapeHtml(row.project_code || "-")}</span>` : `<span class="status">未转项目</span>` },
      { label: "转化", render: (row) => opportunityConvertAction(row) },
    );
  }
  return columns;
}

function opportunityConvertAction(row) {
  if (row.project_id) return badge("已关联项目", "green");
  if (row.stage !== "赢单转项目") return `<span class="status">阶段未成熟</span>`;
  if (!hasPermission("opportunity.edit")) return `<span class="status">无权限</span>`;
  return `<button class="table-action" data-convert-opportunity="${row.id}">转项目</button>`;
}

function projectColumns(full) {
  const columns = [
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${row.code}</span>` },
    { label: "客户", key: "customer_name" },
    { label: "业务组", key: "org_name" },
    { label: "项目经理", key: "project_manager_name" },
    { label: "阶段", key: "phase" },
    { label: "进度", render: (row) => `${row.progress}%` },
    { label: "健康度", render: (row) => badge(row.health) },
    { label: "收入", render: (row) => `${formatMoney(row.actual_revenue)} 万元` },
    { label: "毛利", render: (row) => `${formatMoney(row.actual_gross_profit)} 万元` },
  ];
  if (full) columns.push({ label: "回款", render: (row) => `${formatMoney(row.actual_cash_in)} 万元` }, { label: "应收", render: (row) => `${formatMoney(row.receivable)} 万元` });
  return columns;
}

function forecastColumns() {
  return [
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${row.project_code}</span>` },
    { label: "客户", key: "customer_name" },
    { label: "月份", key: "month" },
    { label: "预测收入", render: (row) => `${formatMoney(row.forecast_revenue)} 万元` },
    { label: "预测成本", render: (row) => `${formatMoney(row.forecast_cost)} 万元` },
    { label: "预测毛利", render: (row) => `${formatMoney(row.forecast_gross_profit)} 万元` },
    { label: "预测回款", render: (row) => `${formatMoney(row.forecast_cash_in)} 万元` },
    { label: "资源缺口", key: "resource_gap" },
    { label: "审核", render: (row) => badge(row.review_status) },
  ];
}

function fundProjectColumns() {
  return [
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code)}</span>` },
    { label: "客户/业务组", render: (row) => `<strong>${escapeHtml(row.customer_name)}</strong><br><span>${escapeHtml(row.org_name)}</span>` },
    { label: "项目经理", key: "project_manager_name" },
    { label: "计划收款", render: (row) => `${formatMoney(row.planned_receipt)} 万元` },
    { label: "计划付款", render: (row) => `${formatMoney(row.planned_payment)} 万元` },
    { label: "实际收款", render: (row) => `${formatMoney(row.actual_receipt)} 万元` },
    { label: "实际付款", render: (row) => `${formatMoney(row.actual_payment)} 万元` },
    { label: "应收余额", render: (row) => `${formatMoney(row.receivable_balance)} 万元` },
    { label: "最长账龄", render: (row) => badge(`${Number(row.max_aging_days || 0)} 天`, Number(row.max_aging_days || 0) >= 180 ? "red" : "green") },
    { label: "净现金", render: (row) => badge(`${formatMoney(row.net_cash)} 万元`, Number(row.net_cash) >= 0 ? "green" : "red") },
    { label: "计划状态", render: (row) => `${Number(row.effective_plan_count || 0)} 个生效<br><span>${Number(row.pending_plan_count || 0)} 个在审</span>` },
  ];
}

function fundPlanColumns(mode = "all") {
  const amountColumn = mode === "payment"
    ? { label: "计划支出", render: (row) => `${formatMoney(row.planned_payment)} 万元` }
    : mode === "receipt"
      ? { label: "计划收款", render: (row) => `${formatMoney(row.planned_receipt)} 万元` }
      : { label: "计划金额", render: (row) => `${escapeHtml(row.plan_type || "-")}<br><span>收 ${formatMoney(row.planned_receipt)} / 支 ${formatMoney(row.planned_payment)} 万元</span>` };
  return [
    { label: "项目/周期", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${escapeHtml(row.month)}｜${escapeHtml(row.period_half || "上半月")}</span>` },
    ...(mode === "all" ? [{ label: "类型", render: (row) => badge(row.plan_type || "支出计划", row.plan_type === "支出计划" ? "yellow" : "green") }] : []),
    amountColumn,
    { label: "资金缺口", render: (row) => badge(`${formatMoney(row.funding_gap)} 万元`, Number(row.funding_gap) >= 0 ? "green" : "red") },
    { label: "实际执行", render: (row) => `收 ${formatMoney(row.actual_receipt)} / 付 ${formatMoney(row.actual_payment)} 万元` },
    { label: "状态", render: (row) => badge(row.status, fundStatusColor(row.status)) },
    { label: "说明", render: (row) => escapeHtml(row.plan_note || "-") },
    { label: "操作", render: (row) => fundPlanActions(row) },
  ];
}

function fundActualColumns() {
  return [
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${escapeHtml(row.project_code || "-")}</span>` },
    { label: "日期", key: "occurred_date" },
    { label: "方向", render: (row) => badge(row.direction, row.direction === "收款" ? "green" : "yellow") },
    { label: "金额", render: (row) => `${formatMoney(row.amount)} 万元` },
    { label: "对方", render: (row) => escapeHtml(row.counterparty || "-") },
    { label: "类别", render: (row) => escapeHtml(row.category || "-") },
  ];
}

function fundReceivableColumns() {
  return [
    { label: "项目", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${escapeHtml(row.project_code || "-")}</span>` },
    { label: "应收日期", key: "receivable_date" },
    { label: "到期日", key: "due_date" },
    { label: "应收金额", render: (row) => `${formatMoney(row.receivable_amount)} 万元` },
    { label: "已回款", render: (row) => `${formatMoney(row.received_amount)} 万元` },
    { label: "应收余额", render: (row) => badge(`${formatMoney(row.balance_amount)} 万元`, Number(row.balance_amount || 0) > 0 ? "yellow" : "green") },
    { label: "欠款周期", render: (row) => badge(`${Number(row.aging_days || 0)} 天`, Number(row.aging_days || 0) >= 180 ? "red" : Number(row.aging_days || 0) > 90 ? "yellow" : "green") },
    { label: "状态", render: (row) => badge(row.status, row.status === "已结清" ? "green" : Number(row.aging_days || 0) >= 180 ? "red" : "yellow") },
  ];
}

function fundApprovalColumns() {
  return [
    { label: "项目/月度", render: (row) => `<strong>${escapeHtml(row.project_name)}</strong><br><span>${escapeHtml(row.month)}</span>` },
    { label: "动作", render: (row) => badge(row.action) },
    { label: "状态变化", render: (row) => `${escapeHtml(row.from_status || "-")} → ${escapeHtml(row.to_status)}` },
    { label: "操作人", render: (row) => escapeHtml(row.operator_name || "-") },
    { label: "日期", key: "operated_at" },
    { label: "意见", render: (row) => escapeHtml(row.comment || "-") },
  ];
}

function fundStatusColor(status) {
  if (status === "审批生效") return "green";
  if (["已提交", "总监审核", "经管确认"].includes(status)) return "yellow";
  if (status === "退回") return "red";
  return "";
}

function fundPlanActions(row) {
  const actions = [];
  if (hasPermission("fund.plan.edit") && row.status === "草稿") actions.push(["submit", "提交"]);
  if (hasPermission("fund.plan.edit") && row.status === "退回") actions.push(["resubmit", "重新提交"]);
  if (hasPermission("fund.plan.review") && row.status === "已提交") actions.push(["director_review", "总监审核"]);
  if (hasPermission("fund.plan.review") && row.status === "总监审核") actions.push(["operations_confirm", "经管确认"]);
  if (hasPermission("fund.plan.review") && row.status === "经管确认") actions.push(["department_approve", "审批生效"]);
  if (hasPermission("fund.plan.review") && ["已提交", "总监审核", "经管确认"].includes(row.status)) actions.push(["reject", "退回"]);
  if (!actions.length) return `<span class="status">无操作</span>`;
  return `<div class="row-actions">${actions.map(([transition, label]) => `<button class="table-action" data-fund-transition="${transition}" data-plan-id="${row.id}">${label}</button>`).join("")}</div>`;
}

function kpiColumns() {
  return [
    { label: "责任主体", key: "owner_name" },
    { label: "指标", key: "metric" },
    { label: "周期", key: "period" },
    { label: "目标", render: (row) => `${formatMoney(row.target_value)} 万元` },
    { label: "实际", render: (row) => `${formatMoney(row.actual_value)} 万元` },
    { label: "完成率", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "差距", render: (row) => `${formatMoney(row.gap_value)} 万元` },
  ];
}

function getSelectedPerformanceOrg(organizations) {
  if (!organizations.length) return null;
  const selected = organizations.find((org) => Number(org.id) === Number(state.selectedPerformanceOrgId));
  if (selected) return selected;
  const visibleIds = new Set(organizations.map((org) => Number(org.id)));
  const root = organizations.find((org) => org.parent_id == null || !visibleIds.has(Number(org.parent_id))) || organizations[0];
  state.selectedPerformanceOrgId = Number(root.id);
  localStorage.setItem("projectBiSelectedPerformanceOrgId", String(root.id));
  return root;
}

function renderPerformanceOrgTree(data, organizations, selectedId) {
  if (!organizations.length) return `<div class="empty">暂无可见组织</div>`;
  const visibleIds = new Set(organizations.map((org) => Number(org.id)));
  const byParent = new Map();
  organizations.forEach((org) => {
    const key = org.parent_id == null || !visibleIds.has(Number(org.parent_id)) ? "root" : String(org.parent_id);
    byParent.set(key, [...(byParent.get(key) || []), org]);
  });
  const roots = byParent.get("root") || [];
  return `<div class="org-tree">${roots.map((org) => renderPerformanceOrgTreeNode(data, organizations, org, byParent, selectedId, 0)).join("")}</div>`;
}

function renderPerformanceOrgTreeNode(data, organizations, org, byParent, selectedId, depth) {
  const children = byParent.get(String(org.id)) || [];
  const status = performanceOrgStatus(data, organizations, org);
  return `
    <button class="org-tree-node ${Number(org.id) === Number(selectedId) ? "active" : ""}" data-select-performance-org="${org.id}" style="--depth:${depth}">
      <div class="org-node-main">
        <strong>${escapeHtml(org.name)}</strong>
        <span>${escapeHtml(org.code || "-")}｜${escapeHtml(orgTypeLabel(org.type))}</span>
      </div>
      ${badge(status, performanceStatusColor(status))}
    </button>
    ${children.map((child) => renderPerformanceOrgTreeNode(data, organizations, child, byParent, selectedId, depth + 1)).join("")}
  `;
}

function performanceYear(period) {
  return String(period || "").slice(0, 4);
}

function performanceYears(data) {
  const years = Array.from(new Set((data.targets || [])
    .filter((row) => row.period_type === "年度")
    .map((row) => performanceYear(row.period))
    .filter(Boolean))).sort();
  return years.length ? years : [state.selectedPerformanceYear || "2026"];
}

function getSelectedPerformanceYear(data) {
  const years = performanceYears(data);
  if (!years.includes(state.selectedPerformanceYear)) {
    state.selectedPerformanceYear = years.includes("2026") ? "2026" : years[0];
    localStorage.setItem("projectBiSelectedPerformanceYear", state.selectedPerformanceYear);
  }
  return state.selectedPerformanceYear;
}

function renderPerformanceYearSelect(data) {
  const selectedYear = getSelectedPerformanceYear(data);
  return `
    <label class="inline-select">
      <span>年度</span>
      <select data-performance-year>
        ${performanceYears(data).map((year) => `<option value="${escapeHtml(year)}" ${year === selectedYear ? "selected" : ""}>${escapeHtml(year)}</option>`).join("")}
      </select>
    </label>
  `;
}

function performanceAnnualRows(data, orgId, year = state.selectedPerformanceYear) {
  return (data.targets || [])
    .filter((row) => Number(row.owner_id) === Number(orgId) && row.period_type === "年度" && (!year || performanceYear(row.period) === String(year)))
    .sort((a, b) => String(a.metric).localeCompare(String(b.metric), "zh-Hans-CN"));
}

function performanceAllAnnualRows(data) {
  return (data.targets || [])
    .filter((row) => row.period_type === "年度")
    .sort((a, b) => String(a.metric).localeCompare(String(b.metric), "zh-Hans-CN"));
}

function performanceBoardRows(data, organizations) {
  return (organizations || []).map((org) => {
    const annualRows = performanceAnnualRows(data, org.id);
    const completion = annualRows.length
      ? Number((annualRows.reduce((total, row) => total + Number(row.completion_rate || 0), 0) / annualRows.length).toFixed(1))
      : 0;
    const status = performanceOrgStatus(data, organizations, org);
    const targetTotal = annualRows
      .filter((row) => row.has_numeric_target !== false)
      .reduce((total, row) => total + Number(row.target_value || 0), 0);
    const actualTotal = annualRows
      .filter((row) => row.has_numeric_target !== false)
      .reduce((total, row) => total + Number(row.actual_value || 0), 0);
    return {
      ...org,
      annual_count: annualRows.length,
      completion_rate: completion,
      target_total: targetTotal,
      actual_total: actualTotal,
      gap_value: actualTotal - targetTotal,
      status,
    };
  }).sort((a, b) => Number(b.completion_rate || 0) - Number(a.completion_rate || 0));
}

function performancePlanRows(data) {
  const annualRows = performanceAllAnnualRows(data);
  const organizations = data.organizations || [];
  const visibleIds = new Set(organizations.map((org) => Number(org.id)));
  const rootOrgs = organizations.filter((org) => org.parent_id == null || !visibleIds.has(Number(org.parent_id)));
  const years = Array.from(new Set(annualRows.map((row) => performanceYear(row.period)).filter(Boolean))).sort();
  return years.flatMap((year) => {
    const yearRows = annualRows.filter((row) => performanceYear(row.period) === year);
    const categories = new Set(yearRows.map((row) => row.category).filter(Boolean));
    return (rootOrgs.length ? rootOrgs : [{ id: 0, name: "全部可见组织" }]).map((org) => {
      const orgIds = new Set([Number(org.id)]);
      organizations
        .filter((item) => Number(item.parent_id) === Number(org.id))
        .forEach((item) => orgIds.add(Number(item.id)));
      const scopedRows = org.id ? yearRows.filter((row) => orgIds.has(Number(row.owner_id))) : yearRows;
      return {
        id: `${year}-${org.id}`,
        name: `${year}年${org.name}绩效方案`,
        year,
        root_org_name: org.name,
        kpi_count: new Set(scopedRows.map((row) => row.metric)).size,
        org_count: new Set(scopedRows.map((row) => row.owner_id)).size,
        category_count: categories.size,
        version: "V1.0",
        period_type: "年度+季度",
        status: "启用",
      };
    });
  });
}

function normalizeKpiCategory(category) {
  const text = String(category || "").trim();
  if (["经营", "经营指标", "经营类"].includes(text)) return "经营";
  if (["价值创造", "价值创造类"].includes(text)) return "价值创造";
  if (["风险防控", "风险防控类"].includes(text)) return "风险防控";
  if (text.includes("关键工作")) return "关键工作";
  if (text.includes("能力建设") || text.includes("学习与成长")) return "能力建设";
  return text || "经营";
}

function performanceCatalogRows(data) {
  const catalog = new Map();
  performanceAllAnnualRows(data).forEach((row) => {
    const normalizedCategory = normalizeKpiCategory(row.category);
    const key = [row.metric, normalizedCategory, performanceMetricDefinition(row)].join("::");
    const current = catalog.get(key) || {
      id: key,
      metric: row.metric,
      category: normalizedCategory,
      kpi_types: new Set(),
      definition: performanceMetricDefinition(row),
      has_numeric_target: row.has_numeric_target,
      unit: row.unit,
      weights: new Set(),
      scoring_methods: new Set(),
      data_sources: new Set(),
      owner_departments: new Set(),
      decomposition_modes: new Set(),
      quarterly_modes: new Set(),
      orgs: new Map(),
      source_items: [],
    };
    if (row.kpi_type) current.kpi_types.add(row.kpi_type);
    if (row.weight) current.weights.add(row.weight);
    if (row.scoring_method) current.scoring_methods.add(row.scoring_method);
    if (row.data_source) current.data_sources.add(row.data_source);
    if (row.owner_department) current.owner_departments.add(row.owner_department);
    if (row.decomposition_mode) current.decomposition_modes.add(row.decomposition_mode);
    if (row.quarterly_mode) current.quarterly_modes.add(row.quarterly_mode);
    if (row.owner_id) current.orgs.set(Number(row.owner_id), row.owner_name || row.owner_id);
    current.source_items.push(row);
    catalog.set(key, current);
  });
  return Array.from(catalog.values()).map((row) => {
    const sortedItems = [...row.source_items].sort((a, b) => Number(b.item_id || b.id || 0) - Number(a.item_id || a.id || 0));
    const representative = sortedItems.find((item) => item.version_status === "草稿" && !item.is_locked && !item.is_in_use)
      || sortedItems.find((item) => !item.parent_item_id)
      || sortedItems[0]
      || {};
    const currentUsageCount = Number(representative.usage_count || 0);
    const historicalUsageCount = row.source_items
      .filter((item) => Number(item.item_id || item.id) !== Number(representative.item_id || representative.id))
      .reduce((total, item) => total + Number(item.usage_count || 0), 0);
    const currentLocked = Boolean(representative.is_locked || representative.is_in_use || representative.version_status === "已发布" || currentUsageCount);
    return {
      ...row,
      id: representative.item_id || representative.id || row.id,
      item_id: representative.item_id || representative.id,
      name: representative.metric || row.metric,
      cycle_year: representative.period,
      kpi_code: representative.kpi_code || representative.metric_code || "-",
      version_no: representative.version_no || "-",
      version_status: representative.version_status || "-",
      version_note: representative.version_note || "",
      effective_from: representative.effective_from || "",
      effective_to: representative.effective_to || "",
      is_locked: currentLocked,
      usage_count: currentUsageCount,
      historical_usage_count: historicalUsageCount,
      can_edit: representative.version_status === "草稿" && !currentLocked,
      target_text: representative.target_text || "",
      target_value: representative.target_value,
      metric_code: representative.metric_code || "",
      kpi_type_text: Array.from(row.kpi_types).join("、") || "-",
      weight_text: Array.from(row.weights).join("、") || "-",
      scoring_method_text: Array.from(row.scoring_methods).join("、") || "-",
      data_source_text: Array.from(row.data_sources).join("、") || "-",
      owner_department_text: Array.from(row.owner_departments).join("、") || "-",
      decomposition_mode_text: Array.from(row.decomposition_modes).join("、") || "-",
      quarterly_mode_text: Array.from(row.quarterly_modes).join("、") || "-",
      org_names: Array.from(row.orgs.values()),
    };
  });
}

function performanceCategoryRows(rows) {
  const counts = new Map(kpiCategories.map((category) => [category, 0]));
  rows.forEach((row) => counts.set(row.category, Number(counts.get(row.category) || 0) + 1));
  return [
    { name: "全部", count: rows.length },
    ...kpiCategories.map((category) => ({ name: category, count: Number(counts.get(category) || 0) })),
  ];
}

function performanceDecompositionSummaryRow(data, organizations, selected, annual) {
  const childRows = performanceChildRows(data, organizations, selected, [annual]);
  const applicable = !["不分解", "仅跟踪"].includes(annual.decomposition_mode);
  const childTargetTotal = childRows.reduce((sum, row) => sum + Number(row.target_value || 0), 0);
  const annualTarget = Number(annual.target_value || 0);
  const coverageRate = annual.has_numeric_target === false || !applicable || !annualTarget
    ? null
    : Number(((childTargetTotal / annualTarget) * 100).toFixed(1));
  const status = performanceChildStatus(data, organizations, selected, annual);
  return {
    ...annual,
    child_target_total: childTargetTotal,
    child_count: childRows.filter((row) => !row.missing).length,
    total_child_count: childRows.length,
    coverage_rate: coverageRate,
    decomposition_status: status,
    child_names: childRows.filter((row) => !row.missing).map((row) => row.owner_name),
  };
}

function performanceChildRows(data, organizations, selected, annualRows) {
  if (!selected) return [];
  const children = organizations.filter((org) => Number(org.parent_id) === Number(selected.id));
  const rows = [];
  annualRows.forEach((annual) => {
    children.forEach((child) => {
      const childTarget = (data.targets || []).find((target) =>
        Number(target.owner_id) === Number(child.id) &&
        (Number(target.parent_item_id) === Number(annual.item_id || annual.id) || target.metric === annual.metric) &&
        target.period_type === "年度" &&
        performanceYear(target.period) === performanceYear(annual.period)
      );
      rows.push({
        ...(childTarget || {}),
        id: childTarget?.id,
        metric: annual.metric,
        period: annual.period,
        period_label: annual.period_label,
        owner_id: child.id,
        owner_name: child.name,
        parent_target_value: annual.target_value,
        target_value: childTarget ? childTarget.target_value : 0,
        actual_value: childTarget ? childTarget.actual_value : 0,
        completion_rate: childTarget ? childTarget.completion_rate : 0,
        decomposition_rate: Number(annual.target_value || 0) ? Number(((Number(childTarget?.target_value || 0) / Number(annual.target_value || 0)) * 100).toFixed(1)) : 0,
        missing: !childTarget,
      });
    });
  });
  return rows;
}

function performanceQuarterRows(data, orgId, annualRows) {
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  return annualRows.map((annual) => {
    const year = performanceYear(annual.period);
    const values = {};
    const actuals = {};
    quarters.forEach((quarter) => {
      const target = (data.targets || []).find((row) =>
        Number(row.owner_id) === Number(orgId) &&
        (Number(row.parent_item_id) === Number(annual.item_id || annual.id) || row.metric === annual.metric) &&
        row.period === `${year}-${quarter}`
      );
      values[quarter] = target ? Number(target.target_value || 0) : 0;
      actuals[quarter] = target ? Number(target.actual_value || 0) : 0;
    });
    const quarterTotal = quarters.reduce((total, quarter) => total + values[quarter], 0);
    const actualTotal = quarters.reduce((total, quarter) => total + actuals[quarter], 0);
    const annualTarget = Number(annual.target_value || 0);
    return {
      id: annual.id,
      metric: annual.metric,
      period_label: annual.period_label,
      annual_target: annualTarget,
      q1: values.Q1,
      q2: values.Q2,
      q3: values.Q3,
      q4: values.Q4,
      q1_actual: actuals.Q1,
      q2_actual: actuals.Q2,
      q3_actual: actuals.Q3,
      q4_actual: actuals.Q4,
      quarter_total: quarterTotal,
      actual_total: actualTotal,
      decomposition_rate: annualTarget ? Number(((quarterTotal / annualTarget) * 100).toFixed(1)) : 0,
      decomposition_status: quarterTotal >= annualTarget ? "已覆盖" : "分解不足",
    };
  });
}

function performanceOrgCards(annualRows, childRows, quarterRows, organizations, selected) {
  const childApplicable = annualRows.filter((annual) => !["不分解", "仅跟踪"].includes(annual.decomposition_mode));
  const quarterApplicable = annualRows.filter((annual) => annual.quarterly_mode !== "不拆分");
  const childCovered = childApplicable.filter((annual) =>
    childRows
      .filter((row) => row.metric === annual.metric)
      .reduce((total, row) => total + Number(row.target_value || 0), 0) >= Number(annual.target_value || 0)
  ).length;
  const quarterCovered = quarterRows.filter((row) => row.decomposition_status === "已覆盖").length;
  const completion = annualRows.length
    ? Number((annualRows.reduce((total, row) => total + Number(row.completion_rate || 0), 0) / annualRows.length).toFixed(1))
    : 0;
  return [
    { label: "年度 KPI", value: annualRows.length, unit: "项" },
    { label: "已分解 KPI", value: `${childCovered}/${childApplicable.length || 0}`, unit: "项" },
    { label: "已拆季度 KPI", value: `${quarterCovered}/${quarterApplicable.length || 0}`, unit: "项" },
    { label: "综合完成率", value: completion, unit: "%" },
  ];
}

function performanceOrgStatus(data, organizations, org) {
  if (!org) return "未定义";
  const annualRows = performanceAnnualRows(data, org.id);
  if (!annualRows.length) return "未定义";
  const childRows = performanceChildRows(data, organizations, org, annualRows);
  const quarterRows = performanceQuarterRows(data, org.id, annualRows);
  const childCount = organizations.filter((item) => Number(item.parent_id) === Number(org.id)).length;
  const childApplicable = annualRows.filter((annual) => !["不分解", "仅跟踪"].includes(annual.decomposition_mode));
  const childDone = !childCount || !childApplicable.length || childApplicable.every((annual) =>
    childRows
      .filter((row) => row.metric === annual.metric)
      .reduce((total, row) => total + Number(row.target_value || 0), 0) >= Number(annual.target_value || 0)
  );
  if (!childDone) return "待分解";
  const quarterApplicable = annualRows.filter((annual) => annual.quarterly_mode !== "不拆分");
  if (quarterApplicable.length && !quarterRows.every((row) => row.decomposition_status === "已覆盖")) return "待拆季";
  return "已确认";
}

function performanceStatusColor(status) {
  if (status === "已确认" || status === "已分解" || status === "已拆分" || status === "已定义" || status === "已完成" || status === "不分解" || status === "不拆分" || status === "无下级") return "green";
  if (["待分解", "待拆季", "部分分解", "部分拆分", "执行中", "待评价"].includes(status)) return "yellow";
  if (["未定义", "未分解", "未拆分", "异常"].includes(status)) return "red";
  return "";
}

function performanceChildStatus(data, organizations, selected, annual) {
  if (["不分解", "仅跟踪"].includes(annual.decomposition_mode)) return "不分解";
  const children = selected ? organizations.filter((org) => Number(org.parent_id) === Number(selected.id)) : [];
  if (!children.length) return "无下级";
  const childRows = performanceChildRows(data, organizations, selected, [annual]);
  if (["任务分派", "共担双计"].includes(annual.decomposition_mode) && childRows.some((row) => !row.missing)) return "已分解";
  const total = childRows.reduce((sum, row) => sum + Number(row.target_value || 0), 0);
  if (total <= 0) return "未分解";
  if (total < Number(annual.target_value || 0)) return "部分分解";
  return "已分解";
}

function performanceQuarterStatus(data, orgId, annual) {
  if (annual.quarterly_mode === "不拆分") return "不拆分";
  const [row] = performanceQuarterRows(data, orgId, [annual]);
  if (!row || Number(row.quarter_total || 0) <= 0) return "未拆分";
  if (Number(row.quarter_total || 0) < Number(row.annual_target || 0)) return "部分拆分";
  return "已拆分";
}

function performanceExecutionStatus(row) {
  if (row.has_numeric_target === false) return "待评价";
  if (Number(row.completion_rate || 0) >= 100) return "已完成";
  if (Number(row.actual_value || 0) > 0) return "执行中";
  return "未开始";
}

function performanceAnnualColumns(data, organizations, selected) {
  return [
    { label: "KPI 指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.period_label || row.period)}</span>` },
    { label: "类别/类型", render: (row) => `${badge(row.category || "-")}<br><span>${escapeHtml(row.kpi_type || "-")}｜权重 ${escapeHtml(row.weight || "-")}</span>` },
    { label: "指标口径", render: (row) => escapeHtml(performanceMetricDefinition(row)) },
    { label: "全年目标", render: (row) => performanceTargetDisplay(row) },
    { label: "实际完成", render: (row) => performanceActualDisplay(row) },
    { label: "完成率", render: (row) => row.has_numeric_target === false ? "-" : badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "下级分解", render: (row) => badge(performanceChildStatus(data, organizations, selected, row), performanceStatusColor(performanceChildStatus(data, organizations, selected, row))) },
    { label: "季度拆分", render: (row) => badge(performanceQuarterStatus(data, selected?.id, row), performanceStatusColor(performanceQuarterStatus(data, selected?.id, row))) },
    { label: "状态", render: (row) => badge(performanceExecutionStatus(row), performanceStatusColor(performanceExecutionStatus(row))) },
    { label: "操作", render: (row) => performanceKpiActions(row) },
  ];
}

function performanceBoardColumns() {
  return [
    { label: "组织", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}｜${escapeHtml(orgTypeLabel(row.type))}</span>` },
    { label: "年度 KPI", render: (row) => `${Number(row.annual_count || 0)} 项` },
    { label: "目标/实际", render: (row) => `${formatMoney(row.target_total)} / ${formatMoney(row.actual_total)} 万元` },
    { label: "差距", render: (row) => badge(`${formatMoney(row.gap_value)} 万元`, Number(row.gap_value || 0) >= 0 ? "green" : "red") },
    { label: "完成率", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "目标状态", render: (row) => badge(row.status, performanceStatusColor(row.status)) },
  ];
}

function renderKpiCategoryFilter(categoryRows) {
  return `
    <div class="category-filter-title">
      <strong>指标分类</strong>
      <span>经营、价值创造、风险防控、关键工作、能力建设</span>
    </div>
    <div class="category-filter-list">
      ${categoryRows.map((category) => `
        <button class="category-chip ${state.selectedKpiCategory === category.name ? "active" : ""}" data-kpi-category="${escapeHtml(category.name)}" type="button">
          <span>${escapeHtml(category.name)}</span>
          <strong>${Number(category.count || 0)}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

function bindPerformanceCatalogEvents(container) {
  const newButton = container.querySelector("#newPerformanceKpi");
  if (newButton) newButton.addEventListener("click", () => openCreatePerformanceKpi());
  container.querySelectorAll("[data-kpi-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKpiCategory = button.dataset.kpiCategory || "全部";
      localStorage.setItem("projectBiSelectedKpiCategory", state.selectedKpiCategory);
      renderPerformanceCatalogView();
    });
  });
  container.querySelectorAll("[data-performance-kpi-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = performanceCatalogRows(state.data.performance || {}).find((item) => Number(item.item_id) === Number(button.dataset.performanceKpiEdit));
      if (row) openEditDialog("performance-kpis", row);
    });
  });
  container.querySelectorAll("[data-performance-kpi-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`performance-kpis/${button.dataset.performanceKpiCopy}/copy-version`, { method: "POST", body: JSON.stringify({}) });
      state.data.performance = await api("performance");
      renderPerformanceCatalogView();
    });
  });
}

function bindNavigationButtons(container) {
  container.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.view = button.dataset.go;
      renderNav();
      await loadView();
    });
  });
}

function bindPerformancePlaceholderEvents(container) {
  bindNavigationButtons(container);
  container.querySelectorAll("[data-performance-pending]").forEach((button) => {
    button.addEventListener("click", () => {
      alert(button.dataset.performancePending || "该功能将在后续版本开放。");
    });
  });
}

function performanceCatalogColumns() {
  return [
    { label: "KPI 指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.kpi_code || "-")}｜${escapeHtml(row.category || "-")}</span>` },
    { label: "版本", render: (row) => `${badge(row.version_no || "-")}<br><span>${escapeHtml(row.version_status || "-")}｜${row.is_locked ? "已锁定" : "可维护"}</span>` },
    { label: "指标类型", render: (row) => `${badge(row.kpi_type_text)}<br><span>${row.has_numeric_target === false ? "文本/评价型" : `数值型｜${escapeHtml(row.unit || "-")}`}</span>` },
    { label: "指标口径", render: (row) => escapeHtml(row.definition || "-") },
    { label: "权重/计分", render: (row) => `<strong>${escapeHtml(row.weight_text)}</strong><br><span>${escapeHtml(row.scoring_method_text)}</span>` },
    { label: "数据来源", render: (row) => `${escapeHtml(row.data_source_text)}<br><span>${escapeHtml(row.owner_department_text)}</span>` },
    { label: "适用组织", render: (row) => `<strong>${row.org_names.length} 个</strong><br><span>${escapeHtml(row.org_names.slice(0, 3).join("、") || "-")}${row.org_names.length > 3 ? "…" : ""}</span>` },
    { label: "分解/拆季", render: (row) => `${badge(row.decomposition_mode_text, performanceStatusColor(row.decomposition_mode_text))}<br><span>${escapeHtml(row.quarterly_mode_text)}</span>` },
    { label: "版本控制", render: (row) => `<strong>${row.usage_count ? `当前已使用 ${row.usage_count} 处` : "当前未使用"}</strong><br><span>${row.historical_usage_count ? `历史版本已使用 ${row.historical_usage_count} 处` : row.is_locked ? "复制新版本后调整" : "草稿可直接维护"}</span>` },
    { label: "操作", render: (row) => performanceCatalogActions(row) },
  ];
}

function performanceCatalogActions(row) {
  if (!hasPermission("kpi.manage")) return `<span class="status">只读</span>`;
  return `
    <div class="row-actions compact-actions">
      ${row.can_edit ? `<button class="table-action" data-performance-kpi-edit="${row.item_id}">编辑草稿</button>` : `<span class="status">已锁定</span>`}
      <button class="table-action" data-performance-kpi-copy="${row.item_id}">复制新版本</button>
    </div>
  `;
}

function performancePlanColumns() {
  return [
    { label: "绩效方案", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.version)}｜${escapeHtml(row.status)}</span>` },
    { label: "年度", key: "year" },
    { label: "适用顶层组织", key: "root_org_name" },
    { label: "考核周期", key: "period_type" },
    { label: "KPI 指标", render: (row) => `${Number(row.kpi_count || 0)} 项<br><span>${Number(row.category_count || 0)} 类指标</span>` },
    { label: "适用组织", render: (row) => `${Number(row.org_count || 0)} 个` },
    { label: "状态", render: (row) => badge(row.status, row.status === "启用" ? "green" : "yellow") },
    { label: "操作", render: (row) => `
      <div class="row-actions compact-actions">
        <button class="table-action" data-go="performance">查看目标</button>
        <button class="table-action" data-go="performanceCatalog">配置 KPI</button>
        <button class="table-action" data-performance-pending="复制年度会在绩效方案版本表落地后支持。">复制年度</button>
      </div>
    ` },
  ];
}

function performanceDecompositionColumns() {
  return [
    { label: "KPI 指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.category || "-")}｜${escapeHtml(row.period_label || row.period)}</span>` },
    { label: "全年目标", render: (row) => performanceTargetDisplay(row) },
    { label: "分解方式", render: (row) => badge(row.decomposition_mode || "-", performanceStatusColor(row.decomposition_mode || "")) },
    { label: "下级承接", render: (row) => row.has_numeric_target === false ? "按事项/评价维护" : `${formatMoney(row.child_target_total)} ${escapeHtml(row.unit || "万元")}` },
    { label: "覆盖率", render: (row) => row.coverage_rate == null ? "-" : badge(`${row.coverage_rate}%`, Number(row.coverage_rate) >= 100 ? "green" : Number(row.coverage_rate) > 0 ? "yellow" : "red") },
    { label: "分解状态", render: (row) => badge(row.decomposition_status, performanceStatusColor(row.decomposition_status)) },
    { label: "承接组织", render: (row) => `<strong>${row.child_count}/${row.total_child_count}</strong><br><span>${escapeHtml(row.child_names.slice(0, 3).join("、") || "-")}${row.child_names.length > 3 ? "…" : ""}</span>` },
    { label: "操作", render: (row) => `<button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="children">查看分解</button>` },
  ];
}

function performanceCompletionColumns() {
  return [
    { label: "KPI 指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.period_label || row.period)}｜${escapeHtml(row.category || "-")}</span>` },
    { label: "目标值", render: (row) => performanceTargetDisplay(row) },
    { label: "本期实际", render: (row) => row.has_numeric_target === false ? `<span class="status">填写说明</span>` : performanceActualDisplay(row) },
    { label: "完成率", render: (row) => row.has_numeric_target === false ? "-" : badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "填报状态", render: (row) => badge(Number(row.actual_value || 0) > 0 || row.has_numeric_target === false ? "待确认" : "待填报", Number(row.actual_value || 0) > 0 ? "yellow" : "red") },
    { label: "操作", render: (row) => `<button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="tracking">填报</button>` },
  ];
}

function performanceScoringColumns() {
  return [
    { label: "KPI 指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.category || "-")}</span>` },
    { label: "权重/分值", render: (row) => escapeHtml(row.weight || "-") },
    { label: "完成率", render: (row) => row.has_numeric_target === false ? "人工评价" : `${row.completion_rate}%` },
    { label: "建议得分", render: (row) => performanceSuggestedScore(row) },
    { label: "评价方式", render: (row) => row.has_numeric_target === false ? badge("人工评价", "yellow") : badge("自动计算", "green") },
    { label: "状态", render: () => badge("待确认", "yellow") },
    { label: "操作", render: (row) => `<button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="info">评价</button>` },
  ];
}

function performanceMetricDefinition(rowOrMetric) {
  const metric = typeof rowOrMetric === "string" ? rowOrMetric : rowOrMetric.metric;
  if (typeof rowOrMetric === "object" && rowOrMetric.definition) return rowOrMetric.definition;
  const definitions = {
    管理口径收入: "项目实际收入，按管理口径归集",
    分摊后毛利: "收入扣减成本及分摊费用后的毛利",
    商机储备金额: "有效商机预计合同金额储备",
  };
  return definitions[metric] || "组织年度经营指标";
}

function performanceTargetDisplay(row) {
  if (row.has_numeric_target || (row.has_numeric_target == null && row.target_value != null)) return `${formatMoney(row.target_value)} ${escapeHtml(row.unit || "万元")}`;
  return escapeHtml(row.target_text || "-");
}

function performanceActualDisplay(row) {
  if (row.has_numeric_target === false) return "-";
  return `${formatMoney(row.actual_value)} ${escapeHtml(row.unit || "万元")}`;
}

function performanceWeightNumber(weight) {
  const match = String(weight || "").match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function performanceSuggestedScore(row) {
  if (row.has_numeric_target === false) return `<span class="status">待人工评价</span>`;
  const weight = performanceWeightNumber(row.weight);
  if (!weight) return "-";
  const score = Math.min(weight, Number(row.completion_rate || 0) / 100 * weight);
  return `${Number(score.toFixed(2))} / ${weight}`;
}

function performanceKpiActions(row) {
  return `
    <div class="row-actions compact-actions">
      <button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="info">查看</button>
      <button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="children">分解</button>
      <button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="quarters">拆季</button>
      <button class="table-action" data-performance-kpi="${row.id}" data-performance-tab="tracking">跟踪</button>
    </div>
  `;
}

function performanceChildColumns() {
  return [
    { label: "下级组织", render: (row) => `<strong>${escapeHtml(row.owner_name)}</strong><br><span>${row.missing ? "未设置年度目标" : escapeHtml(row.period_label || row.period)}</span>` },
    { label: "指标", key: "metric" },
    { label: "本组织目标", render: (row) => `${formatMoney(row.parent_target_value)} 万元` },
    { label: "下级目标", render: (row) => row.missing ? badge("未设置", "red") : `${formatMoney(row.target_value)} 万元` },
    { label: "承接比例", render: (row) => badge(`${row.decomposition_rate}%`, Number(row.decomposition_rate) > 0 ? "green" : "red") },
    { label: "实际完成", render: (row) => `${formatMoney(row.actual_value)} 万元` },
  ];
}

function performanceQuarterColumns() {
  return [
    { label: "年度指标", render: (row) => `<strong>${escapeHtml(row.metric)}</strong><br><span>${escapeHtml(row.period_label)}</span>` },
    { label: "全年目标", render: (row) => `${formatMoney(row.annual_target)} 万元` },
    { label: "Q1", render: (row) => `${formatMoney(row.q1)} 万元` },
    { label: "Q2", render: (row) => `${formatMoney(row.q2)} 万元` },
    { label: "Q3", render: (row) => `${formatMoney(row.q3)} 万元` },
    { label: "Q4", render: (row) => `${formatMoney(row.q4)} 万元` },
    { label: "季度合计", render: (row) => `${formatMoney(row.quarter_total)} 万元` },
    { label: "拆分状态", render: (row) => badge(`${row.decomposition_rate}%｜${row.decomposition_status}`, row.decomposition_status === "已覆盖" ? "green" : "red") },
  ];
}

function getPerformanceExpandedKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem("projectBiPerformanceExpandedKeys") || "[]"));
  } catch {
    return new Set();
  }
}

function savePerformanceExpandedKeys(keys) {
  localStorage.setItem("projectBiPerformanceExpandedKeys", JSON.stringify([...keys]));
}

function performanceExpandKey(row) {
  return `${row.period}::${row.metric}::${row.owner_id}`;
}

function performanceParentKey(row) {
  return `${row.period}::${row.metric}::${row.parent_org_id}`;
}

function visiblePerformanceHierarchy(rows) {
  const expanded = getPerformanceExpandedKeys();
  return rows.filter((row) => {
    if (Number(row.level || 0) === 0) return true;
    return expanded.has(performanceParentKey(row));
  });
}

function bindPerformanceEvents(container) {
  container.querySelectorAll("[data-select-performance-org]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPerformanceOrgId = Number(button.dataset.selectPerformanceOrg);
      localStorage.setItem("projectBiSelectedPerformanceOrgId", String(state.selectedPerformanceOrgId));
      renderActivePerformanceView();
    });
  });
  container.querySelectorAll("[data-performance-year]").forEach((select) => {
    select.addEventListener("change", () => {
      state.selectedPerformanceYear = select.value;
      localStorage.setItem("projectBiSelectedPerformanceYear", state.selectedPerformanceYear);
      renderActivePerformanceView();
    });
  });
  container.querySelectorAll("[data-performance-kpi]").forEach((button) => {
    button.addEventListener("click", () => {
      openPerformanceKpiDrawer(Number(button.dataset.performanceKpi), button.dataset.performanceTab || "info");
    });
  });
  container.querySelectorAll("[data-performance-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const keys = getPerformanceExpandedKeys();
      const key = button.dataset.performanceToggle;
      if (keys.has(key)) keys.delete(key);
      else keys.add(key);
      savePerformanceExpandedKeys(keys);
      renderActivePerformanceView();
    });
  });
}

function renderActivePerformanceView() {
  if (state.view === "performance") renderPerformanceView();
  else renderPerformanceModuleView(state.view);
}

function openPerformanceKpiDrawer(kpiId, activeTab = "info") {
  const data = state.data.performance || { targets: [], organizations: [] };
  const annual = (data.targets || []).find((row) => Number(row.id) === Number(kpiId));
  if (!annual) return;
  const organizations = data.organizations || [];
  const org = organizations.find((item) => Number(item.id) === Number(annual.owner_id));
  const childRows = performanceChildRows(data, organizations, org, [annual]);
  const quarterRows = performanceQuarterDetailRows(data, annual);
  const drawer = document.querySelector("#detailDrawer");
  const tabs = [
    ["info", "指标信息"],
    ["children", "下级组织分解"],
    ["quarters", "季度拆分"],
    ["tracking", "完成情况"],
  ];
  drawer.innerHTML = `
    <div class="drawer-card performance-drawer-card">
      <header>
        <div>
          <h2>${escapeHtml(annual.metric)}</h2>
          <p>${escapeHtml(org?.name || annual.owner_name || "-")}｜${escapeHtml(annual.period_label || annual.period)}｜全年目标 ${performanceTargetDisplay(annual)}</p>
        </div>
        <button class="icon-button" data-close-performance-drawer title="关闭">×</button>
      </header>
      <div class="tab-bar">
        ${tabs.map(([id, label]) => `<button class="${id === activeTab ? "active" : ""}" data-performance-detail-tab="${id}">${label}</button>`).join("")}
      </div>
      <div class="drawer-body">
        ${renderPerformanceKpiDrawerTab(activeTab, annual, org, childRows, quarterRows)}
      </div>
      <footer>
        <button class="primary" data-close-performance-drawer>关闭</button>
      </footer>
    </div>
  `;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.querySelectorAll("[data-close-performance-drawer]").forEach((button) => button.addEventListener("click", closePerformanceKpiDrawer));
  drawer.querySelectorAll("[data-performance-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => openPerformanceKpiDrawer(kpiId, button.dataset.performanceDetailTab));
  });
  bindPerformancePlaceholderEvents(drawer);
}

function closePerformanceKpiDrawer() {
  const drawer = document.querySelector("#detailDrawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function renderPerformanceKpiDrawerTab(tab, annual, org, childRows, quarterRows) {
  if (tab === "children") {
    return `
      <div class="inner-header">
        <h3>下级组织分解</h3>
        <p>只展示当前 KPI 分给哪些下级组织。</p>
      </div>
      ${table(performanceChildRowsWithTotal(childRows, annual), performanceChildDetailColumns(), null)}
    `;
  }
  if (tab === "quarters") {
    return `
      <div class="inner-header">
        <h3>季度拆分</h3>
        <p>年度目标确认后，按 Q1-Q4 拆分。</p>
      </div>
      <div class="row-actions">
        <button class="table-action" data-performance-pending="平均拆分会在季度目标保存接口落地后支持。">平均拆分</button>
        <button class="table-action" data-performance-pending="手工填写会在季度目标保存接口落地后支持。">手工填写</button>
      </div>
      ${table(quarterRows, performanceQuarterDetailColumns(), null)}
    `;
  }
  if (tab === "tracking") {
    return `
      <div class="inner-header">
        <h3>执行跟踪</h3>
        <p>后续实际完成值可在这里按周期查看。</p>
      </div>
      ${table(quarterRows, performanceTrackingColumns(), null)}
    `;
  }
  return `
    <div class="detail-list">
      ${detailRow("组织", org?.name || annual.owner_name || "-")}
      ${detailRow("KPI 指标", annual.metric)}
      ${detailRow("指标类别", annual.category || "-")}
      ${detailRow("指标类型", annual.kpi_type || "-")}
      ${detailRow("指标口径", performanceMetricDefinition(annual))}
      ${detailRow("全年目标", performanceTargetDisplay(annual))}
      ${detailRow("权重/分值", annual.weight || "-")}
      ${detailRow("分解方式", annual.decomposition_mode || "-")}
      ${detailRow("季度方式", annual.quarterly_mode || "-")}
      ${detailRow("计分方法", annual.scoring_method || "-")}
      ${detailRow("数据来源", annual.data_source || "-")}
      ${detailRow("责任部门", annual.owner_department || "-")}
      ${detailRow("实际完成", performanceActualDisplay(annual))}
      ${detailRow("完成率", annual.has_numeric_target === false ? "-" : `${annual.completion_rate}%`)}
      ${detailRow("执行状态", performanceExecutionStatus(annual))}
    </div>
  `;
}

function performanceChildRowsWithTotal(rows, annual) {
  const totalTarget = rows.reduce((sum, row) => sum + Number(row.target_value || 0), 0);
  const totalActual = rows.reduce((sum, row) => sum + Number(row.actual_value || 0), 0);
  const annualTarget = Number(annual.target_value || 0);
  return [
    ...rows,
    {
      owner_name: "合计",
      target_value: totalTarget,
      actual_value: totalActual,
      decomposition_rate: annualTarget ? Number(((totalTarget / annualTarget) * 100).toFixed(1)) : 0,
      completion_rate: annualTarget ? Number(((totalActual / annualTarget) * 100).toFixed(1)) : 0,
      is_total: true,
    },
  ];
}

function performanceQuarterDetailRows(data, annual) {
  const year = performanceYear(annual.period);
  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const rows = quarters.map((quarter) => {
      const target = (data.targets || []).find((row) =>
      Number(row.owner_id) === Number(annual.owner_id) &&
      (Number(row.parent_item_id) === Number(annual.item_id || annual.id) || row.metric === annual.metric) &&
      row.period === `${year}-${quarter}`
    );
    const targetValue = Number(target?.target_value || 0);
    const actualValue = Number(target?.actual_value || 0);
    return {
      quarter,
      target_value: targetValue,
      actual_value: actualValue,
      completion_rate: targetValue ? Number(((actualValue / targetValue) * 100).toFixed(1)) : 0,
      gap_value: actualValue - targetValue,
      status: actualValue >= targetValue && targetValue > 0 ? "已完成" : actualValue > 0 ? "执行中" : "未开始",
    };
  });
  const totalTarget = rows.reduce((sum, row) => sum + row.target_value, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.actual_value, 0);
  rows.push({
    quarter: "合计",
    target_value: totalTarget,
    actual_value: totalActual,
    completion_rate: totalTarget ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : 0,
    gap_value: totalActual - totalTarget,
    status: "-",
    is_total: true,
  });
  return rows;
}

function performanceChildDetailColumns() {
  return [
    { label: "下级组织", render: (row) => row.is_total ? `<strong>合计</strong>` : `<strong>${escapeHtml(row.owner_name)}</strong>` },
    { label: "分解目标", render: (row) => row.has_numeric_target === false ? escapeHtml(row.target_text || "-") : `${formatMoney(row.target_value)} 万元` },
    { label: "占比", render: (row) => badge(`${row.decomposition_rate}%`, Number(row.decomposition_rate) >= 100 && row.is_total ? "green" : "") },
    { label: "实际完成", render: (row) => row.has_numeric_target === false ? "-" : `${formatMoney(row.actual_value)} 万元` },
    { label: "完成率", render: (row) => row.has_numeric_target === false ? "-" : badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "状态", render: (row) => row.is_total ? "-" : badge(performanceExecutionStatus(row), performanceStatusColor(performanceExecutionStatus(row))) },
  ];
}

function performanceQuarterDetailColumns() {
  return [
    { label: "季度", render: (row) => `<strong>${escapeHtml(row.quarter)}</strong>` },
    { label: "目标值", render: (row) => `${formatMoney(row.target_value)} 万元` },
    { label: "实际值", render: (row) => `${formatMoney(row.actual_value)} 万元` },
    { label: "完成率", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "差距", render: (row) => badge(`${formatMoney(row.gap_value)} 万元`, Number(row.gap_value) >= 0 ? "green" : "red") },
    { label: "状态", render: (row) => row.is_total ? "-" : badge(row.status, performanceStatusColor(row.status)) },
  ];
}

function performanceTrackingColumns() {
  return [
    { label: "周期", render: (row) => `<strong>${escapeHtml(row.quarter)}</strong>` },
    { label: "目标", render: (row) => `${formatMoney(row.target_value)} 万元` },
    { label: "完成值", render: (row) => `${formatMoney(row.actual_value)} 万元` },
    { label: "进度", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "执行状态", render: (row) => row.is_total ? "-" : badge(row.status, performanceStatusColor(row.status)) },
  ];
}

function performanceHierarchyColumns() {
  return [
    { label: "周期", render: (row) => `<strong>${escapeHtml(row.period_label || row.period)}</strong><br><span>${escapeHtml(row.period_type || "")}</span>` },
    {
      label: "责任维度",
      render: (row) => `
        <div class="performance-owner level-${Number(row.level || 0)}">
          <strong>${escapeHtml(row.owner_name)}</strong>
          <span>${escapeHtml(row.dimension)}｜${escapeHtml(row.metric)}</span>
        </div>
      `,
    },
    { label: "目标", render: (row) => `${formatMoney(row.target_value)} 万元` },
    { label: "下级分解", render: (row) => row.decomposed_target == null ? "-" : `${formatMoney(row.decomposed_target)} 万元` },
    { label: "分解覆盖", render: (row) => row.decomposition_rate == null ? "-" : badge(`${row.decomposition_rate}%`, Number(row.decomposition_rate) >= 100 ? "green" : "red") },
    { label: "分解状态", render: (row) => row.decomposition_status === "-" ? "-" : badge(row.decomposition_status, row.decomposition_status === "已覆盖" ? "green" : "red") },
    { label: "实际", render: (row) => `${formatMoney(row.actual_value)} 万元` },
    { label: "完成进度", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    {
      label: "穿透",
      render: (row) => {
        if (!row.has_children) return `<span class="status">末级</span>`;
        const key = performanceExpandKey(row);
        const expanded = getPerformanceExpandedKeys().has(key);
        return `<button class="table-action" data-performance-toggle="${escapeHtml(key)}">${expanded ? "收起下级" : "展开下级"}（${Number(row.child_count || 0)}）</button>`;
      },
    },
  ];
}

function performanceTargetColumns() {
  return [
    { label: "责任主体", render: (row) => `<strong>${escapeHtml(row.owner_name)}</strong><br><span>${escapeHtml(row.dimension || "组织绩效")}</span>` },
    { label: "指标", key: "metric" },
    { label: "周期", render: (row) => `<strong>${escapeHtml(row.period_label || row.period)}</strong><br><span>${escapeHtml(row.period_type || "")}</span>` },
    { label: "目标值", render: (row) => `${formatMoney(row.target_value)} 万元` },
    { label: "实际值", render: (row) => `${formatMoney(row.actual_value)} 万元` },
    { label: "完成率", render: (row) => badge(`${row.completion_rate}%`, Number(row.completion_rate) >= 90 ? "green" : Number(row.completion_rate) >= 70 ? "yellow" : "red") },
    { label: "差距", render: (row) => badge(`${formatMoney(row.gap_value)} 万元`, Number(row.gap_value) >= 0 ? "green" : "red") },
  ];
}

function dispatchColumns(full) {
  const columns = [
    { label: "事项", key: "title" },
    { label: "来源", key: "source_type" },
    { label: "责任人", key: "owner_name" },
    { label: "业务组", key: "org_name" },
    { label: "优先级", render: (row) => badge(row.priority) },
    { label: "截止", key: "due_date" },
    { label: "状态", render: (row) => badge(row.status) },
  ];
  if (full) columns.push({ label: "进展", key: "progress_note" });
  return columns;
}

function userColumns() {
  return [
    { label: "账号", render: (row) => `<strong>${escapeHtml(row.username || "-")}</strong><br><span>${escapeHtml(row.name || "未填写显示名")}</span>` },
    { label: "关联人员", render: (row) => `<strong>${escapeHtml(row.real_name || "未关联")}</strong><br><span>${escapeHtml(row.employee_no || "-")}</span>` },
    { label: "角色", render: (row) => badge(row.role_name || roleNames[row.role] || row.role) },
    { label: "组织", key: "org_name" },
    { label: "状态", render: (row) => badge(row.status, row.status === "启用" ? "green" : "red") },
    { label: "生效日期", key: "effective_from" },
    { label: "失效日期", render: (row) => escapeHtml(row.effective_to || "长期") },
  ];
}

function personColumns() {
  return [
    { label: "照片", render: (row) => avatar(row, "sm") },
    { label: "编号", render: (row) => escapeHtml(row.employee_no || "-") },
    { label: "姓名", render: (row) => `<button class="link-button" data-person-detail="${row.id}"><strong>${escapeHtml(row.real_name)}</strong><br><span>${escapeHtml(row.position || "-")}</span></button>` },
    { label: "身份证", render: (row) => escapeHtml(row.id_card || "-") },
    { label: "人员类型", render: (row) => badge(row.person_type || "合同制") },
    { label: "外部关系", render: (row) => row.person_type === "第三方" ? escapeHtml(row.supplier_name || "未指定供应商") : row.person_type === "分公司" ? escapeHtml(row.branch_company || "未选择分公司") : "-" },
    { label: "组织", key: "org_name" },
    { label: "状态", render: (row) => badge(row.status, row.status === "在职" ? "green" : "red") },
    { label: "操作", render: (row) => `<button class="table-action" data-person-edit="${row.id}">维护</button>` },
  ];
}

function supplierColumns() {
  return [
    { label: "供应商", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "统一社会信用代码", render: (row) => escapeHtml(row.credit_code || "-") },
    { label: "类型", render: (row) => badge(row.type || "第三方人力") },
    { label: "联系人", render: (row) => `<strong>${escapeHtml(row.contact_name || "-")}</strong><br><span>${escapeHtml(row.phone || "-")}</span>` },
    { label: "合同/标段", render: (row) => `${Number(row.contract_count || 0)} 份合同<br><span>${Number(row.lot_count || 0)} 个标段｜${Number(row.price_item_count || 0)} 项价格</span>` },
    { label: "关联人员", render: (row) => `${Number(row.person_count || 0)} 人` },
    { label: "状态", render: (row) => badge(row.status || "合作中", row.status === "合作中" ? "green" : row.status === "暂停" ? "yellow" : "red") },
  ];
}

function supplierAgreementColumns() {
  return [
    { label: "协议/合同", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "供应商", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "类型", render: (row) => badge(row.agreement_type || "框架协议") },
    { label: "签订/时长", render: (row) => `${escapeHtml(row.signed_date || "-")}<br><span>${Number(row.duration_months || 0)} 个月</span>` },
    { label: "标段", render: (row) => escapeHtml(row.bid_section || "-") },
    { label: "总额", render: (row) => `${formatMoney(row.total_amount)} 万元` },
    { label: "人员单价", render: (row) => row.agreement_type === "人员框架协议" ? `<strong>${escapeHtml(row.personnel_rate_type || "-")}</strong><br><span>${formatMoney(row.unit_price)} 元/${escapeHtml(row.price_unit || "人天")}</span>` : "-" },
    { label: "状态", render: (row) => badge(row.status || "履行中", row.status === "履行中" ? "green" : row.status === "即将到期" ? "yellow" : "red") },
  ];
}

function contractColumns() {
  return [
    { label: "合同/协议", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "合同类型", render: () => "框架协议" },
    { label: "签约主体/相对方", render: (row) => `<strong>${escapeHtml(row.signing_subject || "-")}</strong><br><span>${escapeHtml(row.counterparty_name || "-")}</span>` },
    { label: "签订/时长", render: (row) => `${escapeHtml(row.signed_date || "-")}<br><span>${Number(row.duration_months || 0)} 个月</span>` },
    { label: "金额", render: (row) => `${formatMoney(row.total_amount)} 万元<br><span>${escapeHtml(row.currency || "CNY")}｜${escapeHtml(row.tax_included || "含税")}</span>` },
    { label: "标段/供应商", render: (row) => `${Number(row.lot_count || 0)} 个标段<br><span>${Number(row.supplier_count || 0)} 家供应商</span>` },
    { label: "状态", render: (row) => badge(row.status || "履行中", row.status === "履行中" ? "green" : row.status === "即将到期" ? "yellow" : "red") },
  ];
}

function contractListColumns() {
  return [
    { label: "合同/协议", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "合同类型", render: () => "框架协议" },
    { label: "签约主体", render: (row) => escapeHtml(row.signing_subject || "-") },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "-")}</span>` },
    { label: "标段数", render: (row) => `${Number(row.lot_count || 0)} 个` },
    { label: "状态", render: (row) => badge(row.status || "履行中", contractStatusColor(row.status)) },
    {
      label: "操作",
      render: (row) => `
        <div class="row-actions">
          <button class="table-action" data-contract-detail="${row.id}" data-tab="contract">查看</button>
          <button class="table-action" data-contract-edit="${row.id}">编辑</button>
          <button class="table-action" data-contract-terminate="${row.id}">终止</button>
          <button class="table-action danger" data-contract-delete="${row.id}">删除</button>
        </div>`,
    },
  ];
}

function contractStatusColor(status) {
  if (["履行中"].includes(status)) return "green";
  if (["即将到期", "审批中", "草稿"].includes(status)) return "yellow";
  if (["已到期", "已终止"].includes(status)) return "red";
  return "";
}

function contractLotColumns(showContract = true, withActions = false) {
  return [
    { label: "标段", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    ...(showContract ? [{ label: "所属合同", render: (row) => `<strong>${escapeHtml(row.contract_name || "-")}</strong><br><span>${escapeHtml(row.contract_code || "-")}</span>` }] : []),
    { label: "类型", render: (row) => badge(row.lot_type || "服务标段") },
    { label: "预算", render: (row) => `${formatMoney(row.budget_amount)} 万元` },
    { label: "入围/价格项", render: (row) => `${Number(row.supplier_count || 0)} 家<br><span>${Number(row.price_item_count || 0)} 项价格</span>` },
    { label: "状态", render: (row) => badge(row.status || "启用", row.status === "启用" ? "green" : "red") },
    ...(withActions
      ? [{
          label: "操作",
          render: (row) => `
            <div class="row-actions">
              <button class="table-action" data-edit="contract-lots" data-id="${row.id}">维护</button>
              <button class="table-action danger" data-contract-lot-delete="${row.id}">删除</button>
            </div>`,
        }]
      : []),
  ];
}

function contractSupplierColumns() {
  return [
    { label: "标段", render: (row) => `<strong>${escapeHtml(row.lot_name || "-")}</strong><br><span>${escapeHtml(row.lot_code || "-")}</span>` },
    { label: "供应商", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "待入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "服务范围", render: (row) => escapeHtml(row.price_items?.length ? Array.from(new Set(row.price_items)).join("、") : "-") },
    { label: "状态", render: (row) => badge(row.status || "待入围", supplierShortlistColor(row.status)) },
    { label: "操作", render: () => `<button class="table-action" data-price-tab>维护价格</button>` },
  ];
}

function supplierShortlistColor(status) {
  if (status === "已入围") return "green";
  if (status === "待入围") return "yellow";
  if (["暂停", "退出"].includes(status)) return "red";
  return "";
}

function renderContractPriceMatrix(lots, prices) {
  const directPrices = prices.filter((price) => !price.lot_id);
  const directItems = orderedPriceItems(directPrices);
  const directSection = directPrices.length
    ? `
      <section class="matrix-section">
        <div class="panel-header inner-header">
          <h2>合同级入围价格</h2>
          <span class="status">${new Set(directPrices.map((price) => price.supplier_id)).size} 家供应商｜${directItems.length} 类价格</span>
        </div>
        ${table(priceMatrixRows(directPrices, directItems), priceMatrixColumns(directItems), null)}
      </section>
    `
    : "";
  const lotSections = lots.map((lot) => {
    const lotPrices = prices.filter((price) => Number(price.lot_id) === Number(lot.id));
    const priceItems = orderedPriceItems(lotPrices);
    return `
      <section class="matrix-section">
        <div class="panel-header inner-header">
          <h2>${escapeHtml(lot.name)}</h2>
          <span class="status">${new Set(lotPrices.map((price) => price.supplier_id)).size} 家供应商｜${priceItems.length} 类价格</span>
        </div>
        ${table(priceMatrixRows(lotPrices, priceItems), priceMatrixColumns(priceItems), null)}
      </section>
    `;
  }).join("");
  if (!directSection && !lotSections) return `<div class="empty">暂无入围供应商价格，无法展示价格矩阵</div>`;
  return `${directSection}${lotSections}`;
}

function orderedPriceItems(prices) {
  const preferred = ["初级", "初中级", "初中一级", "初中二级", "初中三级", "中级", "中高一级", "中高二级", "中高三级", "高级", "专家"];
  const available = Array.from(new Set(prices.map((price) => priceAxisLabel(price)).filter(Boolean)));
  return available.sort((a, b) => {
    const ai = preferred.indexOf(a.split("-").pop());
    const bi = preferred.indexOf(b.split("-").pop());
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return String(a).localeCompare(String(b), "zh-Hans-CN");
  });
}

function priceMatrixRows(prices, priceItems) {
  const bySupplier = new Map();
  prices.forEach((price) => {
    const key = String(price.supplier_id);
    const row = bySupplier.get(key) || {
      supplier_name: price.supplier_name,
      supplier_code: price.supplier_code,
      shortlist_status: price.shortlist_status,
      agreement_code: price.agreement_code,
      agreement_name: price.agreement_name,
      values: {},
    };
    row.values[priceAxisLabel(price)] = price.unit_price;
    if (!row.agreement_code && price.agreement_code) row.agreement_code = price.agreement_code;
    if (!row.agreement_name && price.agreement_name) row.agreement_name = price.agreement_name;
    bySupplier.set(key, row);
  });
  return Array.from(bySupplier.values()).sort((a, b) => String(a.supplier_name).localeCompare(String(b.supplier_name), "zh-Hans-CN"));
}

function priceAxisLabel(price) {
  if (price.personnel_type && price.personnel_level) return `${price.personnel_type}-${price.personnel_level}`;
  return price.personnel_level || price.price_item || "";
}

function priceMatrixColumns(priceItems) {
  return [
    { label: "供应商", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong>` },
    ...priceItems.map((item) => ({ label: item, render: (row) => row.values[item] == null ? "-" : `${formatMoney(row.values[item])}` })),
  ];
}

function lotSupplierPriceColumns(showContract = true, withActions = false) {
  return [
    ...(showContract
      ? [{ label: "合同/采购主体", render: (row) => `<strong>${escapeHtml(row.contract_name || "-")}</strong><br><span>${escapeHtml(row.subject_type || (row.lot_id ? "标段" : "合同"))}｜${escapeHtml(row.subject_name || row.lot_name || row.contract_name || "-")}</span>` }]
      : [{ label: "采购主体", render: (row) => `<strong>${escapeHtml(row.subject_name || row.lot_name || row.contract_name || "-")}</strong><br><span>${escapeHtml(row.subject_type || (row.lot_id ? "标段" : "合同"))}｜${escapeHtml(row.subject_code || row.lot_code || row.contract_code || "-")}</span>` }]),
    { label: "供应商", render: (row) => `<strong>${escapeHtml(row.supplier_name || "-")}</strong><br><span>${escapeHtml(row.supplier_code || "-")}</span>` },
    { label: "入围状态", render: (row) => badge(row.shortlist_status || "已入围", supplierShortlistColor(row.shortlist_status)) },
    { label: "框架协议", render: (row) => row.agreement_code ? `<strong>${escapeHtml(row.agreement_code)}</strong><br><span>${escapeHtml(row.agreement_name || "-")}</span>` : "-" },
    { label: "价格项", render: (row) => escapeHtml(row.price_item || "-") },
    { label: "单价", render: (row) => `${formatMoney(row.unit_price)} 元/${escapeHtml(row.price_unit || "人天")}` },
    { label: "税率", render: (row) => `${formatMoney(Number(row.tax_rate || 0) * 100)}%` },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from || "-")}<br><span>${escapeHtml(row.effective_to || "长期")}</span>` },
    { label: "价格状态", render: (row) => badge(row.status || "有效", row.status === "有效" ? "green" : row.status === "待生效" ? "yellow" : "red") },
    ...(withActions
      ? [{
          label: "操作",
          render: (row) => `
            <div class="row-actions">
              <button class="table-action" data-edit="lot-supplier-prices" data-id="${row.id}">维护</button>
              <button class="table-action danger" data-lot-price-delete="${row.id}">删除</button>
            </div>`,
        }]
      : []),
  ];
}

function supplierFormFields() {
  return [
    ["code", "供应商编号", "text"],
    ["name", "供应商名称", "text"],
    ["credit_code", "统一社会信用代码", "text"],
    ["type", "供应商类型", "select", ["第三方人力", "分公司", "软件服务", "硬件设备", "云资源", "咨询服务", "其他"]],
    ["contact_name", "联系人", "text"],
    ["phone", "联系电话", "text"],
    ["email", "邮箱", "email"],
    ["status", "状态", "select", ["合作中", "暂停", "黑名单", "终止"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["remark", "备注", "textarea"],
  ];
}

function supplierAgreementFormFields() {
  return [
    ["supplier_id", "供应商", "select", state.data.governance.suppliers.map((supplier) => [supplier.id, `${supplier.name}｜${supplier.code || "-"}`])],
    ["code", "协议/合同编号", "text"],
    ["name", "协议/合同名称", "text"],
    ["agreement_type", "协议类型", "select", ["框架协议", "人员框架协议", "项目合同", "采购合同", "补充协议", "无协议"]],
    ["signed_date", "签订日期", "date"],
    ["duration_months", "协议时长（月）", "number"],
    ["bid_section", "标段", "text"],
    ["total_amount", "协议总额（万元）", "number"],
    ["personnel_rate_type", "人员框架类型", "text"],
    ["price_unit", "计价单位", "select", ["人天", "人月", "人时", "项"]],
    ["unit_price", "人员单价（元）", "number"],
    ["status", "状态", "select", ["履行中", "即将到期", "已到期", "已终止", "草稿"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["remark", "备注", "textarea"],
  ];
}

function contractFormFields() {
  return [
    ["code", "合同/协议编号", "text"],
    ["name", "合同/协议名称", "text"],
    ["contract_attribute", "合同属性", "select", ["框架", "合同", "补充协议", "订单"]],
    ["contract_type", "合同类型", "select", ["人员外包框架", "人员外包", "服务采购", "软件采购", "其他"]],
    ["signing_subject", "签约主体", "text"],
    ["counterparty_name", "相对方/签约对方", "text"],
    ["signed_date", "签订日期", "date"],
    ["duration_months", "协议时长（月）", "number"],
    ["total_amount", "合同总额（万元）", "number"],
    ["currency", "币种", "select", ["CNY", "USD", "EUR"]],
    ["tax_included", "含税方式", "select", ["含税", "不含税"]],
    ["payment_terms", "付款条款", "textarea"],
    ["owner_department", "归口部门", "text"],
    ["status", "状态", "select", ["草稿", "审批中", "履行中", "即将到期", "已到期", "已终止"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["remark", "备注", "textarea"],
  ];
}

function contractLotFormFields() {
  return [
    ["contract_id", "所属合同/协议", "select", state.data.governance.contracts.map((contract) => [contract.id, `${contract.name}｜${contract.code || "-"}`])],
    ["code", "标段编号", "text"],
    ["name", "标段名称", "text"],
    ["lot_type", "标段类型", "select", ["人员外包", "运维支撑", "实施支撑", "开发支撑", "测试支撑", "其他"]],
    ["service_scope", "服务范围", "textarea"],
    ["effective_from", "有效期开始", "date"],
    ["effective_to", "有效期结束", "date"],
    ["budget_amount", "标段预算（万元）", "number"],
    ["status", "状态", "select", ["启用", "停用", "已关闭"]],
    ["remark", "备注", "textarea"],
  ];
}

function lotSupplierPriceFormFields(lots = state.data.governance.contractLots) {
  return [
    ["contract_id", "合同/协议", "select", state.data.governance.contracts.map((contract) => [contract.id, `${contract.name}｜${contract.code || "-"}`])],
    ["lot_id", "标段/服务包", "select", [["", "不选择标段，直接关联合同"], ...lots.map((lot) => [lot.id, `${lot.contract_name}｜${lot.name}`])]],
    ["supplier_id", "供应商", "select", state.data.governance.suppliers.map((supplier) => [supplier.id, `${supplier.name}｜${supplier.code || "-"}`])],
    ["shortlist_status", "入围状态", "select", ["待入围", "已入围", "暂停", "退出"]],
    ["agreement_code", "框架协议编号", "text"],
    ["agreement_name", "框架协议名称", "text"],
    ["personnel_type", "人员类型", "select", ["开发人员", "实施顾问", "测试人员", "运维人员", "项目经理", "架构师", "人员服务"]],
    ["personnel_level", "人员级别", "select", ["初级", "初中级", "初中一级", "初中二级", "初中三级", "中级", "中高一级", "中高二级", "中高三级", "高级", "专家"]],
    ["price_unit", "计价单位", "select", ["人日", "人月", "人时", "项"]],
    ["unit_price", "含税单价（元）", "number"],
    ["tax_rate", "税率", "number"],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["status", "价格状态", "select", ["待生效", "有效", "已失效"]],
    ["remark", "备注", "textarea"],
  ];
}

function lotSupplierAwardFormFields(lots = state.data.governance.contractLots) {
  return [
    ["contract_id", "合同/协议", "select", state.data.governance.contracts.map((contract) => [contract.id, `${contract.name}｜${contract.code || "-"}`])],
    ["lot_id", "标段/服务包", "select", [["", "不选择标段，直接关联合同"], ...lots.map((lot) => [lot.id, `${lot.contract_name}｜${lot.name}`])]],
    ["supplier_id", "供应商", "select", state.data.governance.suppliers.map((supplier) => [supplier.id, `${supplier.name}｜${supplier.code || "-"}`])],
    ["shortlist_status", "入围状态", "select", ["待入围", "已入围", "暂停", "退出"]],
    ["agreement_code", "框架协议编号", "text"],
    ["agreement_name", "框架协议名称", "text"],
    ["effective_from", "入围有效期开始", "date"],
    ["effective_to", "入围有效期结束", "date"],
    ["status", "状态", "select", ["有效", "暂停", "已失效"]],
    ["remark", "备注", "textarea"],
  ];
}

function avatar(person, size = "") {
  const name = person.real_name || person.name || "?";
  if (person.photo_url) {
    return `<img class="avatar ${size}" src="${escapeHtml(person.photo_url)}" alt="${escapeHtml(name)}" />`;
  }
  return `<span class="avatar ${size}">${escapeHtml(name.slice(-2))}</span>`;
}

function personValidationStatus(person) {
  const idCard = validateIdCard(person.id_card);
  const email = validateEmail(person.email);
  const mobile = validateMobile(person.mobile);
  return {
    idCard: { ok: idCard.ok, label: idCard.label },
    email: { ok: email.ok, label: email.label },
    mobile: { ok: mobile.ok, label: mobile.label },
    contact: { ok: email.ok && mobile.ok, label: email.ok && mobile.ok ? "联系方式有效" : "需补正" },
  };
}

function validateIdCard(value) {
  if (!value) return { ok: false, label: "未填写身份证" };
  return /^\d{17}[\dXx]$/.test(value)
    ? { ok: true, label: "身份证格式有效" }
    : { ok: false, label: "身份证格式错误" };
}

function validateEmail(value) {
  if (!value) return { ok: false, label: "未填写邮箱" };
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
    ? { ok: true, label: "邮箱格式有效" }
    : { ok: false, label: "邮箱格式错误" };
}

function validateMobile(value) {
  if (!value) return { ok: false, label: "未填写电话" };
  return /^1\d{10}$/.test(value)
    ? { ok: true, label: "电话格式有效" }
    : { ok: false, label: "电话格式错误" };
}

function validatePersonPayload(payload) {
  const errors = [];
  const idCard = validateIdCard(payload.id_card);
  const email = validateEmail(payload.email);
  const mobile = validateMobile(payload.mobile);
  if (!payload.employee_no) errors.push("请填写人员编号");
  if (!payload.real_name) errors.push("请填写姓名");
  if (!idCard.ok) errors.push(idCard.label);
  if (!email.ok) errors.push(email.label);
  if (!mobile.ok) errors.push(mobile.label);
  if (payload.person_type === "第三方" && !payload.supplier_id) errors.push("第三方人员必须选择第三方供应商");
  if (payload.person_type === "第三方" && !payload.outsourcing_contract_id) errors.push("第三方人员必须关联人员外包框架协议");
  if (payload.person_type === "分公司" && !payload.branch_company) errors.push("分公司人员必须选择所属分公司");
  return errors;
}

function validateSupplierPayload(payload) {
  const errors = [];
  if (!payload.name) errors.push("请填写供应商名称");
  if (payload.credit_code && !/^[0-9A-Z]{15,18}$/.test(payload.credit_code)) errors.push("统一社会信用代码应为 15-18 位数字或大写字母");
  if (payload.phone && !/^[\d\-+() ]{7,20}$/.test(payload.phone)) errors.push("联系电话格式不正确");
  if (payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) errors.push("邮箱格式不正确");
  return errors;
}

function validateSupplierAgreementPayload(payload) {
  const errors = [];
  if (!payload.supplier_id) errors.push("请选择供应商");
  if (!payload.name) errors.push("请填写协议/合同名称");
  if (Number(payload.duration_months || 0) < 0) errors.push("协议时长不能为负数");
  if (Number(payload.total_amount || 0) < 0) errors.push("协议总额不能为负数");
  if (Number(payload.unit_price || 0) < 0) errors.push("人员单价不能为负数");
  if (payload.agreement_type === "人员框架协议" && !payload.personnel_rate_type) errors.push("人员框架协议必须填写人员框架类型");
  if (payload.agreement_type === "人员框架协议" && !Number(payload.unit_price || 0)) errors.push("人员框架协议必须填写人员单价");
  return errors;
}

function validateContractPayload(payload) {
  const errors = [];
  if (!payload.name) errors.push("请填写合同/协议名称");
  if (!payload.code) errors.push("请填写合同/协议编号");
  if (!payload.effective_from || !payload.effective_to) errors.push("请维护合同有效期开始和结束日期");
  if (payload.effective_from && payload.effective_to && payload.effective_from > payload.effective_to) errors.push("合同有效期开始日期不能晚于结束日期");
  if (Number(payload.duration_months || 0) < 0) errors.push("合同/协议时长不能为负数");
  if (Number(payload.total_amount || 0) < 0) errors.push("合同总额不能为负数");
  return errors;
}

function validateContractLotPayload(payload) {
  const errors = [];
  if (!payload.contract_id) errors.push("请选择所属合同/协议");
  if (!payload.name) errors.push("请填写标段名称");
  if (!payload.code) errors.push("请填写标段编号");
  if (!payload.effective_from || !payload.effective_to) errors.push("请维护标段有效期开始和结束日期");
  if (payload.effective_from && payload.effective_to && payload.effective_from > payload.effective_to) errors.push("标段有效期开始日期不能晚于结束日期");
  if (Number(payload.budget_amount || 0) < 0) errors.push("标段预算不能为负数");
  return errors;
}

function validateLotSupplierPricePayload(payload) {
  const errors = [];
  if (!payload.contract_id && !payload.lot_id) errors.push("请选择合同/协议或标段");
  if (!payload.supplier_id) errors.push("请选择供应商");
  if (!payload.personnel_type) errors.push("请选择人员类型");
  if (!payload.personnel_level) errors.push("请选择人员级别");
  if (!payload.effective_from || !payload.effective_to) errors.push("请维护价格生效日期和失效日期");
  if (payload.effective_from && payload.effective_to && payload.effective_from > payload.effective_to) errors.push("价格有效期开始日期不能晚于结束日期");
  if (Number(payload.unit_price || 0) < 0) errors.push("单价不能为负数");
  if (Number(payload.tax_rate || 0) < 0) errors.push("税率不能为负数");
  return errors;
}

function validateFundPlanPayload(payload) {
  const errors = [];
  if (!payload.project_id) errors.push("请选择项目");
  if (!payload.month) errors.push("请填写计划月份");
  if (!["上半月", "下半月"].includes(payload.period_half)) errors.push("请选择上半月或下半月");
  if (!["收款计划", "支出计划"].includes(payload.plan_type)) errors.push("请选择计划类型");
  if (Number(payload.planned_receipt || 0) < 0) errors.push("计划收款不能为负数");
  if (Number(payload.planned_payment || 0) < 0) errors.push("计划付款不能为负数");
  if (payload.plan_type === "收款计划" && Number(payload.planned_receipt || 0) <= 0) errors.push("收款计划必须填写计划收款");
  if (payload.plan_type === "支出计划" && Number(payload.planned_payment || 0) <= 0) errors.push("支出计划必须填写计划支出");
  return errors;
}

function validateFundActualPayload(payload) {
  const errors = [];
  if (!payload.project_id) errors.push("请选择项目");
  if (!payload.plan_id) errors.push("请选择审批生效的资金计划");
  if (!payload.occurred_date) errors.push("请选择发生日期");
  if (!["收款", "付款"].includes(payload.direction)) errors.push("请选择收款或付款");
  if (payload.direction === "收款" && !payload.receivable_id) errors.push("回款登记必须选择应收账款");
  if (Number(payload.amount || 0) <= 0) errors.push("金额必须大于 0");
  return errors;
}

function normalizePersonPayloadByType(payload) {
  if (payload.person_type !== "第三方") {
    payload.supplier_id = null;
    payload.outsourcing_contract_id = null;
    payload.outsourcing_lot_id = null;
    payload.outsourcing_award_id = null;
    payload.outsourcing_price_id = null;
  }
  if (payload.person_type !== "分公司") {
    payload.branch_company = "";
  }
  return payload;
}

function renderPersonDetail(personId) {
  const person = state.data.governance.persons.find((item) => Number(item.id) === Number(personId));
  if (!person) {
    state.view = "personAdmin";
    renderNav();
    loadView();
    return;
  }
  document.querySelector("#pageTitle").textContent = "人员档案";
  document.querySelector("#pageSubtitle").textContent = "真实人员信息、身份校验、联系方式、组织岗位和供应商关系";
  const linkedUsers = state.data.governance.users.filter((user) => Number(user.person_id) === Number(person.id));
  const validation = personValidationStatus(person);
  document.querySelector("#content").innerHTML = `
    <section class="person-profile">
      <div class="panel profile-hero">
        <div class="profile-main">
          ${avatar(person, "lg")}
          <div>
            <h2>${escapeHtml(person.real_name)}</h2>
            <p>${escapeHtml(person.employee_no || "-")}｜${escapeHtml(person.person_type || "合同制")}｜${escapeHtml(person.position || "-")}</p>
            <div class="permission-list">
              ${badge(person.status, person.status === "在职" ? "green" : "red")}
              ${badge(person.org_name || "未归属")}
              ${person.person_type === "分公司" ? badge(person.branch_company || "未选择分公司", person.branch_company ? "green" : "red") : ""}
              ${person.person_type === "第三方" ? badge(person.supplier_name || "未指定供应商", person.supplier_name ? "" : "red") : ""}
            </div>
          </div>
        </div>
        <div class="actions">
          <button class="secondary" id="backToPersons">返回列表</button>
          <button class="primary" data-edit-person="${person.id}">维护档案</button>
        </div>
      </div>
      <section class="grid two-col">
        <div class="panel">
          <div class="panel-header"><h2>身份信息</h2><span class="status ${validation.idCard.ok ? "green" : "red"}">${validation.idCard.label}</span></div>
          <div class="panel-body detail-list">
            ${detailRow("人员编号", person.employee_no || "-")}
            ${detailRow("姓名", person.real_name || "-")}
            ${detailRow("身份证", person.id_card || "-")}
            ${detailRow("人员类型", person.person_type || "合同制")}
            ${detailRow("所属分公司", person.person_type === "分公司" ? person.branch_company || "未选择" : "不适用")}
            ${detailRow("有效期", `${person.effective_from || "-"} 至 ${person.effective_to || "长期"}`)}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h2>联系方式</h2><span class="status ${validation.contact.ok ? "green" : "red"}">${validation.contact.label}</span></div>
          <div class="panel-body detail-list">
            ${detailRow("邮箱", person.email || "-")}
            ${detailRow("电话", person.mobile || "-")}
            ${detailRow("邮箱校验", validation.email.label)}
            ${detailRow("电话校验", validation.mobile.label)}
          </div>
        </div>
      </section>
      <section class="grid two-col">
        <div class="panel">
          <div class="panel-header"><h2>组织岗位</h2><span class="status">主数据</span></div>
          <div class="panel-body detail-list">
            ${detailRow("所属组织", person.org_name || "-")}
            ${detailRow("岗位", person.position || "-")}
            ${detailRow("关联账号", linkedUsers.length ? linkedUsers.map((user) => user.username).join("、") : "暂无")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><h2>外部关系</h2><span class="status ${person.person_type === "第三方" && !person.supplier_name ? "red" : "green"}">供应商</span></div>
          <div class="panel-body detail-list">
            ${detailRow("第三方供应商", person.person_type === "第三方" ? person.supplier_name || "未指定" : "不适用")}
            ${detailRow("供应商编号", person.person_type === "第三方" ? person.supplier_code || "-" : "不适用")}
            ${detailRow("外包框架", person.person_type === "第三方" ? person.outsourcing_contract_name || "未关联" : "不适用")}
            ${detailRow("标段/服务包", person.person_type === "第三方" ? person.outsourcing_lot_name || "未选择" : "不适用")}
            ${detailRow("标准价格", person.person_type === "第三方" && person.outsourcing_price_id ? `${person.outsourcing_personnel_type || "人员服务"}-${person.outsourcing_personnel_level || "-"}｜${formatMoney(person.outsourcing_unit_price)}元/${person.outsourcing_price_unit || "人日"}` : person.person_type === "第三方" ? "未选择" : "不适用")}
          </div>
        </div>
      </section>
    </section>
  `;
  document.querySelector("#backToPersons").addEventListener("click", async () => {
    state.view = "personAdmin";
    renderNav();
    await loadView();
  });
  document.querySelector("[data-edit-person]").addEventListener("click", async () => {
    state.view = `personEdit:${person.id}`;
    renderNav();
    await loadView();
  });
}

function renderPersonEditPage(personId) {
  const person = state.data.governance.persons.find((item) => Number(item.id) === Number(personId));
  if (!person) {
    state.view = "personAdmin";
    renderNav();
    loadView();
    return;
  }
  document.querySelector("#pageTitle").textContent = "维护人员档案";
  document.querySelector("#pageSubtitle").textContent = "按人力资源主数据分类维护人员信息、任职信息和第三方外包关联";
  const sections = personEditSections();
  const fields = sections.flatMap((section) => section.fields);
  document.querySelector("#content").innerHTML = `
    <form id="personEditForm" class="person-edit-page">
      <section class="panel profile-hero">
        <div class="profile-main">
          ${avatar(person, "lg")}
          <div>
            <h2>${escapeHtml(person.real_name || "人员档案")}</h2>
            <p>${escapeHtml(person.employee_no || "-")}｜${escapeHtml(person.person_type || "合同制")}｜${escapeHtml(person.org_name || "未归属组织")}</p>
            <div class="permission-list">
              ${badge(person.status || "在职", person.status === "在职" ? "green" : "red")}
              ${badge(person.person_type || "合同制")}
              ${person.person_type === "第三方" ? badge(person.outsourcing_contract_name || "未关联框架协议", person.outsourcing_contract_name ? "green" : "red") : ""}
            </div>
          </div>
        </div>
        <div class="actions">
          <button type="button" class="secondary" id="cancelPersonEdit">返回档案</button>
          <button type="submit" class="primary">保存</button>
        </div>
      </section>
      <section class="person-edit-sections">
        ${sections.map((section) => `
          <section class="panel person-edit-section ${section.id === "outsourcing" ? "person-outsourcing-section" : ""}">
            <div class="panel-header">
              <div>
                <h2>${escapeHtml(section.title)}</h2>
                <p>${escapeHtml(section.description)}</p>
              </div>
            </div>
            <div class="panel-body form-grid ${section.grid || "person-edit-grid"}">
              ${section.fields.map((field) => fieldControl(field, person)).join("")}
            </div>
          </section>
        `).join("")}
      </section>
    </form>
  `;
  bindPersonEditDependencies(document.querySelector("#personEditForm"), person);
  bindImageUploadControls(document.querySelector("#personEditForm"));
  document.querySelector("#cancelPersonEdit").addEventListener("click", async () => {
    state.view = `personDetail:${person.id}`;
    renderNav();
    await loadView();
  });
  document.querySelector("#personEditForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {};
    fields.forEach(([key]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : value;
    });
    normalizePersonPayloadByType(payload);
    const errors = validatePersonPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api(`persons/${person.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    state.view = `personDetail:${person.id}`;
    renderNav();
    await loadView();
  });
}

function organizationColumns() {
  return [
    { label: "组织", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span>` },
    { label: "类型", render: (row) => badge(orgTypeLabel(row.type)) },
    { label: "上级", render: (row) => escapeHtml(row.parent_name || "-") },
    { label: "负责人", render: (row) => escapeHtml(row.owner_name || "未指定") },
    { label: "用户数", key: "user_count" },
    { label: "状态", render: (row) => badge(row.status, row.status === "启用" ? "green" : "red") },
    { label: "有效期", render: (row) => `${escapeHtml(row.effective_from)} 至 ${escapeHtml(row.effective_to || "长期")}` },
  ];
}

function renderMetricTile(label, value, unit) {
  return `<div class="metric-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}<small>${escapeHtml(unit)}</small></strong></div>`;
}

function orgTypeLabel(type) {
  const labels = {
    company: "公司",
    department: "部门",
    center: "中心",
    business_group: "业务组",
    virtual: "虚拟组织",
    project_team: "项目组",
    headquarters: "总部部门",
    provincial_company: "省公司",
    professional_company: "专业公司",
    subsidiary: "子公司",
  };
  return labels[type] || type || "-";
}

function organizationTypeOptions() {
  return [
    ["company", "公司"],
    ["department", "部门"],
    ["center", "中心"],
    ["business_group", "业务组"],
    ["virtual", "虚拟组织"],
    ["project_team", "项目组"],
  ];
}

function getSelectedOrganization(organizations) {
  const selected = organizations.find((org) => Number(org.id) === Number(state.selectedOrgId));
  if (selected) return selected;
  const root = organizations.find((org) => org.parent_id == null) || organizations[0];
  state.selectedOrgId = root?.id || 0;
  return root;
}

function getOrgChildren(orgId, organizations) {
  return organizations.filter((org) => Number(org.parent_id) === Number(orgId));
}

function getOrgParent(org, organizations) {
  return organizations.find((item) => Number(item.id) === Number(org.parent_id));
}

function orgMatchesSearch(org, keyword) {
  if (!keyword) return true;
  const text = `${org.name || ""} ${org.code || ""} ${org.owner_name || ""} ${org.parent_name || ""}`.toLowerCase();
  return text.includes(keyword.toLowerCase());
}

function hasMatchingDescendant(org, organizations, keyword) {
  return getOrgChildren(org.id, organizations).some((child) => orgMatchesSearch(child, keyword) || hasMatchingDescendant(child, organizations, keyword));
}

function renderOrganizationTree(organizations, selectedId, keyword = "") {
  if (!organizations.length) return `<div class="empty">暂无组织</div>`;
  const byParent = new Map();
  organizations.forEach((org) => {
    const key = org.parent_id == null ? "root" : String(org.parent_id);
    byParent.set(key, [...(byParent.get(key) || []), org]);
  });
  const roots = byParent.get("root") || organizations.filter((org) => !organizations.some((item) => Number(item.id) === Number(org.parent_id)));
  return `<div class="org-tree">${roots.map((org) => renderOrgTreeNode(org, byParent, organizations, selectedId, keyword, 0)).join("")}</div>`;
}

function renderOrgTreeNode(org, byParent, organizations, selectedId, keyword, depth) {
  if (keyword && !orgMatchesSearch(org, keyword) && !hasMatchingDescendant(org, organizations, keyword)) return "";
  const children = byParent.get(String(org.id)) || [];
  return `
    <button class="org-tree-node ${Number(org.id) === Number(selectedId) ? "active" : ""}" data-select-org="${org.id}" style="--depth:${depth}">
      <div class="org-node-main">
        <strong>${escapeHtml(org.name)}</strong>
        <span>${escapeHtml(org.code || "-")}｜${escapeHtml(orgTypeLabel(org.type))}</span>
      </div>
      ${badge(org.status, org.status === "启用" ? "green" : "red")}
    </button>
    ${children.map((child) => renderOrgTreeNode(child, byParent, organizations, selectedId, keyword, depth + 1)).join("")}
  `;
}

function renderLocalOrgChart(selected, organizations) {
  const parent = getOrgParent(selected, organizations);
  const siblings = parent ? getOrgChildren(parent.id, organizations) : [selected];
  const children = getOrgChildren(selected.id, organizations);
  const visibleSiblings = siblings.slice(0, 4);
  const visibleChildren = children.slice(0, 6);
  return `
    <div class="local-org-chart">
      <div class="chart-row parent-row">${parent ? chartNode(parent, "parent") : `<span class="chart-placeholder">顶级组织</span>`}</div>
      <div class="chart-line"></div>
      <div class="chart-row sibling-row">
        ${visibleSiblings.map((org) => chartNode(org, Number(org.id) === Number(selected.id) ? "current" : "sibling")).join("")}
      </div>
      ${children.length ? `<div class="chart-line"></div><div class="chart-row child-row">${visibleChildren.map((org) => chartNode(org, "child")).join("")}</div>` : `<div class="chart-empty">暂无下级组织</div>`}
    </div>
  `;
}

function chartNode(org, type) {
  return `<button class="chart-node ${type}" data-select-org="${org.id}"><strong>${escapeHtml(org.name)}</strong><span>${escapeHtml(orgTypeLabel(org.type))}</span></button>`;
}

function organizationChildTable(rows) {
  if (!rows.length) return `<div class="empty">当前组织暂无下级组织</div>`;
  return `
    <table>
      <thead><tr><th>名称</th><th>类型</th><th>负责人</th><th>人员</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code || "-")}</span></td>
            <td>${badge(orgTypeLabel(row.type))}</td>
            <td>${escapeHtml(row.owner_name || "未指定")}</td>
            <td>${Number(row.user_count || 0)} 人</td>
            <td>${badge(row.status, row.status === "启用" ? "green" : "red")}</td>
            <td>
              <button class="table-action" data-org-detail="${row.id}">详情</button>
              <button class="table-action" data-org-edit="${row.id}">维护</button>
            </td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function organizationParentOptions(currentOrgId) {
  const organizations = state.data.governance.organizations;
  const descendants = new Set();
  function collect(parentId) {
    organizations
      .filter((org) => String(org.parent_id) === String(parentId))
      .forEach((org) => {
        descendants.add(String(org.id));
        collect(org.id);
      });
  }
  if (currentOrgId != null) collect(currentOrgId);
  return [["", "无上级"], ...organizations
    .filter((org) => String(org.id) !== String(currentOrgId ?? "") && !descendants.has(String(org.id)))
    .map((org) => [org.id, org.name])];
}

function bindOrganizationAdminEvents() {
  const search = document.querySelector("#orgSearch");
  if (search) {
    search.addEventListener("input", () => {
      state.orgSearch = search.value.trim();
      rerenderOrganizationPage();
      const nextSearch = document.querySelector("#orgSearch");
      if (nextSearch) {
        nextSearch.focus();
        nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
      }
    });
  }
  document.querySelectorAll("[data-select-org]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedOrgId = Number(button.dataset.selectOrg);
      localStorage.setItem("projectBiSelectedOrgId", String(state.selectedOrgId));
      rerenderOrganizationPage();
    });
  });
  document.querySelectorAll("[data-org-detail]").forEach((button) => {
    button.addEventListener("click", () => openOrganizationDrawer(Number(button.dataset.orgDetail)));
  });
  document.querySelectorAll("[data-org-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = state.data.governance.organizations.find((org) => Number(org.id) === Number(button.dataset.orgEdit));
      openEditDialog("organizations", row);
    });
  });
  document.querySelectorAll("[data-new-child]").forEach((button) => {
    button.addEventListener("click", () => openCreateOrganization(Number(button.dataset.newChild)));
  });
  document.querySelectorAll("[data-new-sibling]").forEach((button) => {
    const parentId = button.dataset.newSibling === "" ? null : Number(button.dataset.newSibling);
    button.addEventListener("click", () => openCreateOrganization(parentId));
  });
  document.querySelectorAll("[data-disable-org]").forEach((button) => {
    button.addEventListener("click", async () => {
      const org = state.data.governance.organizations.find((item) => Number(item.id) === Number(button.dataset.disableOrg));
      if (!org || !confirm(`确认停用组织「${org.name}」？历史数据会保留。`)) return;
      await api(`organizations/${org.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "停用", effective_to: org.effective_to || today() }),
      });
      state.data.governance = await api("governance");
      rerenderOrganizationPage();
    });
  });
  document.querySelectorAll("[data-org-history]").forEach((button) => {
    button.addEventListener("click", () => showOrganizationHistory(Number(button.dataset.orgHistory)));
  });
  document.querySelectorAll("[data-panorama]").forEach((button) => {
    button.addEventListener("click", () => openPanoramaDialog());
  });
  const newOrg = document.querySelector("#newOrg");
  if (newOrg) newOrg.addEventListener("click", () => openCreateOrganization());
  const exportButton = document.querySelector("#exportOrganizations");
  if (exportButton) exportButton.addEventListener("click", () => exportOrganizations());
}

function rerenderOrganizationPage() {
  if (state.view === "orgChart") {
    renderOrganizationChart(state.data.governance);
    return;
  }
  renderOrganizationInfoAdmin(state.data.governance);
}

function showOrganizationHistory(orgId) {
  const org = state.data.governance.organizations.find((item) => Number(item.id) === Number(orgId));
  const dialog = document.querySelector("#panoramaDialog");
  document.querySelector("#panoramaContent").innerHTML = `
    <div class="panorama-toolbar">
      <strong>${escapeHtml(org?.name || "组织")}｜变更记录</strong>
      <span class="status">MVP 记录口径</span>
    </div>
    <table>
      <thead><tr><th>变更时间</th><th>变更类型</th><th>原内容</th><th>新内容</th><th>操作人</th></tr></thead>
      <tbody>
        <tr>
          <td>${escapeHtml(org?.effective_from || today())}</td>
          <td>组织启用</td>
          <td>-</td>
          <td>${escapeHtml(org?.name || "-")}</td>
          <td>${escapeHtml(currentUser()?.name || "系统")}</td>
        </tr>
      </tbody>
    </table>
  `;
  dialog.showModal();
  dialog.querySelector("[data-close-panorama]").onclick = () => dialog.close();
}

function openOrganizationDrawer(orgId) {
  const org = state.data.governance.organizations.find((item) => Number(item.id) === Number(orgId));
  if (!org) return;
  const parent = getOrgParent(org, state.data.governance.organizations);
  const children = getOrgChildren(org.id, state.data.governance.organizations);
  const users = state.data.governance.users.filter((user) => Number(user.org_id) === Number(org.id));
  const drawer = document.querySelector("#detailDrawer");
  drawer.innerHTML = `
    <div class="drawer-card">
      <header>
        <div>
          <h2>${escapeHtml(org.name)}</h2>
          <p>${escapeHtml(org.code || "-")}｜${escapeHtml(orgTypeLabel(org.type))}</p>
        </div>
        <button class="icon-button" data-close-drawer title="关闭">×</button>
      </header>
      <div class="drawer-body">
        ${detailRow("上级组织", parent?.name || "无上级")}
        ${detailRow("负责人", org.owner_name || "未指定")}
        ${detailRow("状态", org.status)}
        ${detailRow("有效期", `${org.effective_from} 至 ${org.effective_to || "长期"}`)}
        ${detailRow("下级组织", children.length ? children.map((child) => child.name).join("、") : "暂无")}
        ${detailRow("关联人员", users.length ? users.map((user) => user.name).join("、") : "暂无")}
        <h3>业务关联</h3>
        <div class="business-links">
          ${["预算主体", "核算主体", "成本中心", "采购组织", "人力编制", "权限范围"].map((item) => `<span>${item}</span>`).join("")}
        </div>
      </div>
      <footer>
        <button class="secondary" data-org-edit="${org.id}">维护</button>
        <button class="primary" data-new-child="${org.id}">新增下级组织</button>
      </footer>
    </div>
  `;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  drawer.querySelector("[data-close-drawer]").addEventListener("click", closeOrganizationDrawer);
  drawer.querySelector("[data-org-edit]").addEventListener("click", () => openEditDialog("organizations", org));
  drawer.querySelector("[data-new-child]").addEventListener("click", () => openCreateOrganization(org.id));
}

function closeOrganizationDrawer() {
  const drawer = document.querySelector("#detailDrawer");
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
}

function detailRow(label, value) {
  return `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function openPanoramaDialog() {
  const dialog = document.querySelector("#panoramaDialog");
  document.querySelector("#panoramaContent").innerHTML = `
    <div class="panorama-toolbar">
      <input type="search" placeholder="搜索定位组织" value="${escapeHtml(state.orgSearch)}" />
      <span class="status">默认展开 2 层</span>
      <span class="status">支持逐级展开</span>
      <button class="secondary" id="exportOrganizationsInDialog">导出</button>
    </div>
    <div class="panorama-tree">${renderPanoramaTree(state.data.governance.organizations, 2)}</div>
  `;
  dialog.showModal();
  dialog.querySelector("[data-close-panorama]").onclick = () => dialog.close();
  dialog.querySelector("#exportOrganizationsInDialog").onclick = () => exportOrganizations();
  dialog.querySelector("input").addEventListener("input", (event) => {
    const keyword = event.target.value.trim();
    dialog.querySelector(".panorama-tree").innerHTML = renderPanoramaTree(state.data.governance.organizations, 2, keyword);
  });
}

function renderPanoramaTree(organizations, maxDepth, keyword = "") {
  const roots = organizations.filter((org) => org.parent_id == null);
  return roots.map((org) => renderPanoramaNode(org, organizations, maxDepth, keyword, 0)).join("") || `<div class="empty">暂无组织</div>`;
}

function renderPanoramaNode(org, organizations, maxDepth, keyword, depth) {
  if (keyword && !orgMatchesSearch(org, keyword) && !hasMatchingDescendant(org, organizations, keyword)) return "";
  const children = depth < maxDepth ? getOrgChildren(org.id, organizations) : [];
  return `
    <div class="panorama-node" style="--depth:${depth}">
      <div><strong>${escapeHtml(org.name)}</strong><span>${escapeHtml(org.code || "-")}｜${escapeHtml(orgTypeLabel(org.type))}</span></div>
      ${badge(org.status, org.status === "启用" ? "green" : "red")}
    </div>
    ${children.map((child) => renderPanoramaNode(child, organizations, maxDepth, keyword, depth + 1)).join("")}
  `;
}

function exportOrganizations() {
  const headers = ["组织编码", "组织名称", "组织类型", "上级组织", "负责人", "状态", "生效日期", "失效日期", "人员数"];
  const rows = state.data.governance.organizations.map((org) => [
    org.code || "",
    org.name || "",
    orgTypeLabel(org.type),
    org.parent_name || "",
    org.owner_name || "",
    org.status || "",
    org.effective_from || "",
    org.effective_to || "",
    Number(org.user_count || 0),
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "organizations.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function roleColumns() {
  return [
    { label: "角色", render: (row) => `<strong>${escapeHtml(row.name)}</strong><br><span>${escapeHtml(row.code)}</span>` },
    { label: "数据范围", render: (row) => badge(row.data_scope) },
    { label: "说明", key: "description" },
    { label: "权限", render: (row) => row.permissions.map((permission) => `<span class="status">${escapeHtml(permission.module)}｜${escapeHtml(permission.name)}</span>`).join(" ") },
  ];
}

function renderPermissionCatalog(permissions) {
  const groups = {};
  permissions.forEach((permission) => {
    groups[permission.module] = groups[permission.module] || [];
    groups[permission.module].push(permission);
  });
  return `
    <section class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>权限点目录</h2><span class="status">${permissions.length} 个权限点</span></div>
      <div class="panel-body grid">
        ${Object.entries(groups)
          .map(([module, items]) => `
            <div>
              <h3>${escapeHtml(module)}</h3>
              <div class="permission-list">
                ${items.map((item) => `<span class="status">${escapeHtml(item.code)}｜${escapeHtml(item.name)}</span>`).join("")}
              </div>
            </div>`)
          .join("")}
      </div>
    </section>`;
}

function bindEditButtons(container, endpoint) {
  container.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetEndpoint = button.dataset.edit || endpoint;
      const rowSets = {
        users: state.data.governance?.users,
        persons: state.data.governance?.persons,
        suppliers: state.data.governance?.suppliers,
        "supplier-agreements": state.data.governance?.supplierAgreements,
        contracts: state.data.governance?.contracts,
        "contract-lots": state.data.governance?.contractLots,
        "lot-supplier-prices": state.data.governance?.lotSupplierPrices,
        "kpi-targets": state.data.performance?.targets,
        organizations: state.data.governance?.organizations,
        roles: state.data.governance?.roles,
      };
      const rows = rowSets[targetEndpoint] || state.data[state.view]?.rows || [];
      const row = rows.find((item) => String(item.id ?? item.code) === String(button.dataset.id));
      openEditDialog(targetEndpoint, row);
    });
  });
}

function bindCustomerDetailButtons(container) {
  container.querySelectorAll("[data-customer-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCustomerId = Number(button.dataset.customerDetail);
      localStorage.setItem("projectBiSelectedCustomerId", String(state.selectedCustomerId));
      renderCustomersView();
    });
  });
}

function bindOpportunityActions(container) {
  container.querySelectorAll("[data-convert-opportunity]").forEach((button) => {
    button.addEventListener("click", async () => {
      const opportunityId = button.dataset.convertOpportunity;
      await api(`opportunities/${opportunityId}/convert-project`, { method: "POST", body: JSON.stringify({}) });
      state.data.opportunities = await api("opportunities");
      state.data.projects = await api("projects");
      if (state.view === "customers") renderCustomersView();
      else renderOpportunityManagement();
    });
  });
}

function performanceKpiFormFields() {
  return [
    ["cycle_year", "适用年度", "text"],
    ["kpi_code", "指标编码", "text"],
    ["category", "指标分类", "select", kpiCategories],
    ["name", "指标名称", "text"],
    ["definition", "指标口径", "textarea"],
    ["unit", "单位", "text"],
    ["target_text", "目标说明", "textarea"],
    ["target_value", "默认目标值", "number"],
    ["weight", "建议权重/分值", "text"],
    ["kpi_type", "指标类型", "select", ["定量", "定性", "混合", "扣分项", "加分项"]],
    ["decomposition_mode", "分解方式", "select", ["严格汇总", "共担双计", "任务分派", "不分解", "仅跟踪"]],
    ["quarterly_mode", "季度拆分", "select", ["按季度", "按节点", "不拆分"]],
    ["scoring_method", "计分方法", "textarea"],
    ["data_source", "数据来源", "text"],
    ["owner_department", "责任部门", "text"],
    ["metric_code", "系统取数编码", "text"],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["version_note", "版本说明", "textarea"],
  ];
}

function personFormFields() {
  return [
    ["employee_no", "人员编号", "text"],
    ["real_name", "姓名", "text"],
    ["photo_url", "照片", "image"],
    ["id_card", "身份证", "text"],
    ["person_type", "人员类型", "select", ["合同制", "第三方", "分公司"]],
    ["branch_company", "所属分公司", "select", [["", "未选择"], ...branchCompanies]],
    ["supplier_id", "第三方供应商", "select", [["", "无"], ...state.data.governance.suppliers.map((supplier) => [supplier.id, supplier.name])]],
    ...personOutsourcingFields().slice(1),
    ["org_id", "所属组织", "select", state.data.governance.organizations.map((org) => [org.id, org.name])],
    ["position", "岗位", "text"],
    ["email", "邮箱", "text"],
    ["mobile", "手机", "text"],
    ["status", "状态", "select", ["在职", "离职", "停用"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
  ];
}

function personEditSections() {
  return [
    {
      id: "basic",
      title: "基础信息",
      description: "员工主数据和照片信息",
      fields: [
        ["employee_no", "人员编号", "text"],
        ["real_name", "姓名", "text"],
        ["photo_url", "照片", "image"],
        ["person_type", "人员类型", "select", ["合同制", "第三方", "分公司"]],
        ["branch_company", "所属分公司", "select", [["", "未选择"], ...branchCompanies]],
      ],
    },
    {
      id: "identity",
      title: "身份与联系方式",
      description: "身份校验、邮箱和手机号",
      fields: [
        ["id_card", "身份证", "text"],
        ["email", "邮箱", "text"],
        ["mobile", "手机", "text"],
      ],
    },
    {
      id: "organization",
      title: "组织任职",
      description: "所属组织、岗位和任职关系",
      fields: [
        ["org_id", "所属组织", "select", state.data.governance.organizations.map((org) => [org.id, org.name])],
        ["position", "岗位", "text"],
      ],
    },
    {
      id: "outsourcing",
      title: "第三方外包关系",
      description: "第三方人员需关联人员外包框架、标段和入围供应商，可进一步绑定标准价格",
      fields: personOutsourcingFields(),
    },
    {
      id: "status",
      title: "状态与生效",
      description: "人员状态和主数据有效期",
      fields: [
        ["status", "状态", "select", ["在职", "离职", "停用"]],
        ["effective_from", "生效日期", "date"],
        ["effective_to", "失效日期", "date"],
      ],
    },
  ];
}

function personOutsourcingFields() {
  const governance = state.data.governance;
  const suppliers = governance.suppliers || [];
  const contracts = governance.contracts || [];
  const lots = governance.contractLots || [];
  const awards = governance.lotSupplierAwards || [];
  const prices = governance.lotSupplierPrices || [];
  return [
    ["supplier_id", "第三方供应商", "select", [["", "未选择"], ...suppliers.map((supplier) => [supplier.id, supplier.name])]],
    ["outsourcing_contract_id", "人员外包框架协议", "select", [["", "未选择"], ...contracts.map((contract) => [contract.id, `${contract.name}｜${contract.code || "-"}`])]],
    ["outsourcing_lot_id", "标段/服务包", "select", [["", "未选择"], ...lots.map((lot) => [lot.id, `${lot.contract_name || "-"}｜${lot.name}`])]],
    ["outsourcing_award_id", "入围供应商", "select", [["", "未选择"], ...awards.map((award) => [award.id, `${award.lot_name || "合同级"}｜${award.supplier_name || "-"}`])]],
    ["outsourcing_price_id", "标准价格项", "select", [["", "未选择"], ...prices.map((price) => [price.id, `${price.lot_name || price.contract_name || "-"}｜${price.supplier_name || "-"}｜${priceAxisLabel(price) || price.price_item || "-"}｜${formatMoney(price.unit_price)}元/${price.price_unit || "人日"}`])]],
  ];
}

function bindPersonEditDependencies(form, person) {
  const typeSelect = form.querySelector('[name="person_type"]');
  const branchSelect = form.querySelector('[name="branch_company"]');
  const supplierSelect = form.querySelector('[name="supplier_id"]');
  const contractSelect = form.querySelector('[name="outsourcing_contract_id"]');
  const lotSelect = form.querySelector('[name="outsourcing_lot_id"]');
  const awardSelect = form.querySelector('[name="outsourcing_award_id"]');
  const priceSelect = form.querySelector('[name="outsourcing_price_id"]');
  const section = form.querySelector(".person-outsourcing-section");
  const resetSelect = (select, options, currentValue = "") => {
    if (!select) return;
    const selected = String(currentValue || select.value || "");
    select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${String(value) === selected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
    if (!Array.from(select.options).some((option) => option.value === selected)) select.value = "";
  };
  const refresh = () => {
    const isThirdParty = typeSelect?.value === "第三方";
    const isBranch = typeSelect?.value === "分公司";
    section?.classList.toggle("muted-section", !isThirdParty);
    if (branchSelect) {
      branchSelect.disabled = !isBranch;
      if (!isBranch) branchSelect.value = "";
    }
    [supplierSelect, contractSelect, lotSelect, awardSelect, priceSelect].forEach((select) => {
      if (select) select.disabled = !isThirdParty;
    });
    if (!isThirdParty) {
      [supplierSelect, contractSelect, lotSelect, awardSelect, priceSelect].forEach((select) => {
        if (select) select.value = "";
      });
      return;
    }
    const contractId = Number(contractSelect?.value || 0);
    const lotId = Number(lotSelect?.value || 0);
    const supplierId = Number(supplierSelect?.value || 0);
    const lots = (state.data.governance.contractLots || []).filter((lot) => !contractId || Number(lot.contract_id) === contractId);
    resetSelect(lotSelect, [["", "未选择"], ...lots.map((lot) => [lot.id, `${lot.contract_name || "-"}｜${lot.name}`])], lotSelect?.value || person.outsourcing_lot_id);
    const activeLotId = Number(lotSelect?.value || 0);
    const awards = (state.data.governance.lotSupplierAwards || []).filter((award) => {
      const matchContract = !contractId || Number(award.contract_id) === contractId;
      const matchLot = !activeLotId || Number(award.lot_id || 0) === activeLotId;
      const matchSupplier = !supplierId || Number(award.supplier_id) === supplierId;
      return matchContract && matchLot && matchSupplier;
    });
    resetSelect(awardSelect, [["", "未选择"], ...awards.map((award) => [award.id, `${award.lot_name || "合同级"}｜${award.supplier_name || "-"}`])], awardSelect?.value || person.outsourcing_award_id);
    const activeAward = awards.find((award) => String(award.id) === String(awardSelect?.value || ""));
    const prices = (state.data.governance.lotSupplierPrices || []).filter((price) => {
      const matchContract = !contractId || Number(price.contract_id) === contractId;
      const matchLot = !activeLotId || Number(price.lot_id || 0) === activeLotId;
      const matchSupplier = !activeAward ? (!supplierId || Number(price.supplier_id) === supplierId) : Number(price.supplier_id) === Number(activeAward.supplier_id);
      return matchContract && matchLot && matchSupplier;
    });
    resetSelect(priceSelect, [["", "未选择"], ...prices.map((price) => [price.id, `${price.supplier_name || "-"}｜${priceAxisLabel(price) || price.price_item || "-"}｜${formatMoney(price.unit_price)}元/${price.price_unit || "人日"}`])], priceSelect?.value || person.outsourcing_price_id);
  };
  [typeSelect, supplierSelect, contractSelect, lotSelect, awardSelect].forEach((select) => {
    if (select) select.addEventListener("change", refresh);
  });
  refresh();
}

function validatePerformanceKpiPayload(payload) {
  const errors = [];
  if (!payload.kpi_code) errors.push("指标编码不能为空");
  if (!payload.name) errors.push("指标名称不能为空");
  if (!payload.category) errors.push("指标分类不能为空");
  if (!payload.cycle_year) errors.push("适用年度不能为空");
  return errors;
}

function openCreatePerformanceKpi() {
  const dialog = document.querySelector("#editDialog");
  const fields = performanceKpiFormFields();
  document.querySelector("#editTitle").textContent = "新增 KPI 指标草稿";
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    cycle_year: state.selectedPerformanceYear || "2026",
    kpi_code: `KPI-${Date.now().toString().slice(-6)}`,
    category: state.selectedKpiCategory === "全部" ? "经营" : state.selectedKpiCategory,
    kpi_type: "定量",
    decomposition_mode: "严格汇总",
    quarterly_mode: "按季度",
    effective_from: today(),
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validatePerformanceKpiPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("performance-kpis", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    state.data.performance = await api("performance");
    renderPerformanceCatalogView();
  };
}

function openEditDialog(endpoint, row) {
  const configs = {
    opportunities: {
      title: "维护商机",
      fields: [
        ["stage", "阶段", "select", opportunityStages],
        ["probability", "赢单概率", "number"],
        ["expected_sign_month", "预计签约月份", "text"],
        ["risk_level", "风险等级", "select", ["低", "中", "高"]],
        ["next_action", "下一步动作", "textarea"],
      ],
    },
    projects: {
      title: "维护项目",
      fields: [
        ["status", "状态", "select", ["商机中", "待立项", "已立项", "交付中", "验收中", "运维中", "已关闭", "暂停", "终止"]],
        ["phase", "当前阶段", "text"],
        ["progress", "进度", "number"],
        ["health", "健康度", "select", ["绿", "黄", "红"]],
        ["planned_end", "计划完成", "text"],
      ],
    },
    forecasts: {
      title: "维护预测",
      fields: [
        ["forecast_revenue", "预测收入", "number"],
        ["forecast_cost", "预测成本", "number"],
        ["forecast_gross_profit", "预测毛利", "number"],
        ["forecast_cash_in", "预测回款", "number"],
        ["resource_gap", "资源缺口", "text"],
        ["risk_note", "风险说明", "textarea"],
        ["review_status", "审核状态", "select", ["草稿", "已提交", "业务组审核", "经营审核", "退回"]],
      ],
    },
    dispatch: {
      title: "维护调度",
      fields: [
        ["priority", "优先级", "select", ["高", "中", "低"]],
        ["due_date", "截止日期", "text"],
        ["status", "状态", "select", ["待处理", "处理中", "延期", "已完成", "关闭"]],
        ["progress_note", "进展反馈", "textarea"],
      ],
    },
    "kpi-targets": {
      title: "维护绩效目标",
      fields: [
        ["target_value", "目标值（万元）", "number"],
      ],
    },
    "performance-kpis": {
      title: "维护 KPI 指标草稿",
      fields: performanceKpiFormFields(),
    },
    users: {
      title: "维护用户",
      fields: [
        ["username", "用户名", "text"],
        ["password", "登录密码", "text"],
        ["person_id", "关联人员", "select", [["", "未关联"], ...state.data.governance.persons.map((person) => [person.id, `${person.real_name}｜${person.employee_no || "-"}`])]],
        ["name", "账号显示名", "text"],
        ["email", "邮箱", "text"],
        ["role", "角色", "select", state.data.governance.roles.map((role) => [role.code, role.name])],
        ["org_id", "所属组织", "select", state.data.governance.organizations.map((org) => [org.id, org.name])],
        ["status", "状态", "select", ["启用", "停用"]],
        ["effective_from", "生效日期", "date"],
        ["effective_to", "失效日期", "date"],
      ],
    },
    persons: {
      title: "维护人员",
      fields: personFormFields(),
    },
    suppliers: {
      title: "维护供应商",
      fields: supplierFormFields(),
    },
    "supplier-agreements": {
      title: "维护协议/合同",
      fields: supplierAgreementFormFields(),
    },
    contracts: {
      title: "维护合同/协议",
      fields: contractFormFields(),
    },
    "contract-lots": {
      title: "维护合同标段",
      fields: contractLotFormFields(),
    },
    "lot-supplier-prices": {
      title: "维护入围供应商价格",
      fields: lotSupplierPriceFormFields(),
    },
    organizations: {
      title: "维护组织",
      fields: [
        ["code", "组织编码", "text"],
        ["name", "组织名称", "text"],
        ["short_name", "组织简称", "text"],
        ["type", "组织类型", "select", organizationTypeOptions()],
        ["parent_id", "上级组织", "select", organizationParentOptions(row.id)],
        ["owner_id", "负责人", "select", [["", "未指定"], ...state.data.governance.persons.map((person) => [person.id, person.real_name])]],
        ["leader_id", "分管领导", "select", [["", "未指定"], ...state.data.governance.persons.map((person) => [person.id, person.real_name])]],
        ["sort_order", "排序号", "number"],
        ["status", "状态", "select", ["草稿", "启用", "停用", "已撤销"]],
        ["effective_from", "生效日期", "date"],
        ["effective_to", "失效日期", "date"],
        ["remark", "备注", "textarea"],
      ],
    },
    roles: {
      title: "配置角色权限",
      fields: [
        ["permission_codes", "权限点", "checkboxes", state.data.governance.permissions.map((permission) => [permission.code, `${permission.module}｜${permission.name}`])],
      ],
    },
  };
  const config = configs[endpoint];
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = config.title;
  document.querySelector("#editFields").innerHTML = config.fields.map((field) => fieldControl(field, row)).join("");
  bindImageUploadControls(document.querySelector("#editFields"));
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    config.fields.forEach(([key, , type]) => {
      if (type === "checkboxes") {
        payload[key] = Array.from(document.querySelectorAll(`[name="${key}"]:checked`)).map((element) => element.value);
        return;
      }
      const element = document.querySelector(`[name="${key}"]`);
      const value = element.value === "" ? null : element.value;
      if (endpoint === "users" && key === "password" && value === null) return;
      payload[key] = type === "number" ? (value === null ? null : Number(value)) : value;
    });
    if (endpoint === "persons") {
      const errors = validatePersonPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "suppliers") {
      const errors = validateSupplierPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "supplier-agreements") {
      const errors = validateSupplierAgreementPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "contracts") {
      const errors = validateContractPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "contract-lots") {
      const errors = validateContractLotPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "lot-supplier-prices") {
      const errors = validateLotSupplierPricePayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    if (endpoint === "opportunities") payload.updated_at = new Date().toISOString().slice(0, 10);
    if (endpoint === "performance-kpis") {
      const errors = validatePerformanceKpiPayload(payload);
      if (errors.length) {
        alert(errors.join("\n"));
        return;
      }
    }
    await api(`${endpoint}/${row.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    dialog.close();
    if (endpoint === "organizations") closeOrganizationDrawer();
    await loadView();
  };
}

function fieldControl([key, label, type, options], row = {}) {
  const value = row[key] ?? "";
  if (type === "image") {
    const preview = value ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(label)}预览" />` : `<span>未上传</span>`;
    return `
      <div class="field image-upload-field">
        <label>${label}</label>
        <div class="image-upload-control">
          <div class="image-upload-preview" data-image-preview="${key}">${preview}</div>
          <div class="image-upload-actions">
            <input type="hidden" name="${key}" value="${escapeHtml(value)}" />
            <input class="image-upload-input" type="file" accept="image/*" data-image-upload="${key}" />
            <button type="button" class="table-action" data-clear-image="${key}">清除</button>
          </div>
        </div>
      </div>`;
  }
  if (type === "select") {
    return `<div class="field"><label>${label}</label><select name="${key}">${options
      .map((option) => {
        const optionValue = Array.isArray(option) ? option[0] : option;
        const optionLabel = Array.isArray(option) ? option[1] : option;
        return `<option value="${escapeHtml(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
      })
      .join("")}</select></div>`;
  }
  if (type === "checkboxes") {
    const selected = new Set(row.permission_codes || []);
    return `<div class="field"><label>${label}</label><div class="checkbox-grid">${options
      .map(([optionValue, optionLabel]) => `
        <label class="checkbox-row">
          <input type="checkbox" name="${key}" value="${escapeHtml(optionValue)}" ${selected.has(optionValue) ? "checked" : ""} />
          <span>${escapeHtml(optionLabel)}</span>
        </label>`)
      .join("")}</div></div>`;
  }
  if (type === "textarea") {
    return `<div class="field"><label>${label}</label><textarea name="${key}">${escapeHtml(value)}</textarea></div>`;
  }
  return `<div class="field"><label>${label}</label><input name="${key}" type="${type}" value="${escapeHtml(value)}" /></div>`;
}

function bindImageUploadControls(container = document) {
  container.querySelectorAll("[data-image-upload]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      const key = input.dataset.imageUpload;
      if (!file || !key) return;
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        const hidden = container.querySelector(`[name="${key}"]`);
        const preview = container.querySelector(`[data-image-preview="${key}"]`);
        if (hidden) hidden.value = value;
        if (preview) preview.innerHTML = `<img src="${escapeHtml(value)}" alt="照片预览" />`;
      };
      reader.readAsDataURL(file);
    });
  });
  container.querySelectorAll("[data-clear-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.clearImage;
      const hidden = container.querySelector(`[name="${key}"]`);
      const preview = container.querySelector(`[data-image-preview="${key}"]`);
      const input = container.querySelector(`[data-image-upload="${key}"]`);
      if (hidden) hidden.value = "";
      if (preview) preview.innerHTML = "<span>未上传</span>";
      if (input) input.value = "";
    });
  });
}

function openCreateDispatch() {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增调度动作";
  document.querySelector("#editFields").innerHTML = [
    ["title", "调度事项", "text"],
    ["source_type", "来源", "select", ["KPI偏差", "项目风险", "商机推进", "回款风险", "资源缺口", "经营例会"]],
    ["priority", "优先级", "select", ["高", "中", "低"]],
    ["due_date", "截止日期", "text"],
    ["progress_note", "说明", "textarea"],
  ].map((field) => fieldControl(field)).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    ["title", "source_type", "priority", "due_date", "progress_note"].forEach((key) => {
      payload[key] = document.querySelector(`[name="${key}"]`).value;
    });
    await api("dispatch", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateFundPlan(planType = "支出计划") {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = `填报${planType}`;
  const amountField = planType === "支出计划"
    ? ["planned_payment", "计划支出（万元）", "number"]
    : ["planned_receipt", "计划收款（万元）", "number"];
  const fields = [
    ["project_id", "项目", "select", state.data.funds.projects.map((project) => [project.id, `${project.name}｜${project.code}`])],
    ["month", "计划月份", "text"],
    ["period_half", "半月周期", "select", ["上半月", "下半月"]],
    ["plan_type", "计划类型", "select", [planType]],
    amountField,
    ["plan_note", "计划说明", "textarea"],
    ["status", "状态", "select", ["草稿", "已提交"]],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    project_id: state.data.funds.projects[0]?.id || "",
    month: "2026-08",
    period_half: "上半月",
    plan_type: planType,
    planned_receipt: 0,
    planned_payment: 0,
    status: "草稿",
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validateFundPlanPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("fund-plans", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    state.data.funds = await api("funds");
    renderFundsView(state.view);
  };
}

function openTimesheetDialog(row = null) {
  const data = state.data.timesheets || { projects: [], persons: [] };
  if (!data.projects?.length) {
    alert("当前没有可填报的项目");
    return;
  }
  if (!data.persons?.length) {
    alert("当前没有可填报的人员");
    return;
  }
  const current = currentUser();
  const defaults = {
    project_id: data.projects[0]?.id || "",
    person_id: current?.person_id || data.persons[0]?.id || "",
    period_type: "周",
    period_start: today(),
    entry_mode: "比例",
    allocation_ratio: 1,
    work_hours: 0,
    work_content: "",
    status: "草稿",
  };
  const model = { ...defaults, ...(row || {}) };
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = row ? "维护工时" : "填报工时";
  const fields = [
    ["project_id", "项目", "select", data.projects.map((project) => [project.id, `${project.name}｜${project.code}`])],
    ["person_id", "人员", "select", data.persons.map((person) => [person.id, `${person.real_name}｜${person.employee_no || "-"}｜${person.person_type || "-"}`])],
    ["period_type", "周期类型", "select", ["周", "月"]],
    ["period_start", "周期开始", "date"],
    ["entry_mode", "填报方式", "select", ["比例", "小时"]],
    ["allocation_ratio", "投入比例", "number"],
    ["work_hours", "工作时长（小时）", "number"],
    ["status", "状态", "select", ["草稿", "已提交", "已确认"]],
    ["work_content", "工作内容", "textarea"],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, model)).join("");
  bindTimesheetDialogMode();
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const element = document.querySelector(`[name="${key}"]`);
      const value = element.value === "" ? null : element.value;
      payload[key] = type === "number" ? Number(value || 0) : value;
    });
    if (payload.entry_mode === "比例") payload.work_hours = 0;
    if (payload.entry_mode === "小时") payload.allocation_ratio = 0;
    const errors = validateTimesheetPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    if (row) {
      await api(`timesheets/${row.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await api("timesheets", { method: "POST", body: JSON.stringify(payload) });
    }
    dialog.close();
    state.data.timesheets = await api("timesheets");
    renderTimesheetManagement();
  };
}

function bindTimesheetDialogMode() {
  const mode = document.querySelector('[name="entry_mode"]');
  const ratio = document.querySelector('[name="allocation_ratio"]');
  const hours = document.querySelector('[name="work_hours"]');
  const sync = () => {
    const isRatio = mode.value === "比例";
    ratio.disabled = !isRatio;
    hours.disabled = isRatio;
    if (isRatio) hours.value = "0";
    if (!isRatio) ratio.value = "0";
  };
  mode.addEventListener("change", sync);
  sync();
}

function validateTimesheetPayload(payload) {
  const errors = [];
  if (!payload.project_id) errors.push("请选择项目");
  if (!payload.person_id) errors.push("请选择人员");
  if (!payload.period_start) errors.push("请选择周期开始日期");
  if (payload.entry_mode === "比例" && Number(payload.allocation_ratio || 0) <= 0) errors.push("投入比例必须大于 0");
  if (payload.entry_mode === "小时" && Number(payload.work_hours || 0) <= 0) errors.push("工作时长必须大于 0");
  return errors;
}

function openCreateFundActual(direction = "收款") {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = direction === "收款" ? "登记回款" : "登记付款";
  const planType = direction === "收款" ? "收款计划" : "支出计划";
  const effectivePlans = state.data.funds.plans.filter((plan) => plan.status === "审批生效" && plan.plan_type === planType);
  if (!effectivePlans.length) {
    alert(`暂无审批生效的${planType}，不能登记${direction}`);
    return;
  }
  const openReceivables = state.data.funds.receivables.filter((item) => Number(item.balance_amount || 0) > 0);
  if (direction === "收款" && !openReceivables.length) {
    alert("暂无未结清应收账款，不能登记回款");
    return;
  }
  const fields = [
    ["project_id", "项目", "select", state.data.funds.projects.map((project) => [project.id, `${project.name}｜${project.code}`])],
    ["plan_id", "关联生效计划", "select", effectivePlans.map((plan) => [plan.id, `${plan.project_name}｜${plan.month}｜${plan.period_half}`])],
    ...(direction === "收款" ? [["receivable_id", "关联应收账款", "select", openReceivables.map((item) => [item.id, `${item.project_name}｜余额 ${formatMoney(item.balance_amount)} 万元｜账龄 ${Number(item.aging_days || 0)} 天`])]] : []),
    ["occurred_date", "发生日期", "date"],
    ["direction", "方向", "select", [direction]],
    ["amount", "金额（万元）", "number"],
    ["counterparty", "对方单位", "text"],
    ["category", "类别", "select", direction === "收款" ? ["里程碑回款", "预付款", "尾款", "质保金", "其他"] : ["外包付款", "采购付款", "费用报销", "差旅支出", "其他"]],
    ["remark", "备注", "textarea"],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    project_id: effectivePlans[0]?.project_id || state.data.funds.projects[0]?.id || "",
    plan_id: effectivePlans[0]?.id || "",
    receivable_id: openReceivables[0]?.id || "",
    occurred_date: today(),
    direction,
    amount: 0,
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validateFundActualPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("fund-actuals", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    state.data.funds = await api("funds");
    renderFundsView(state.view);
  };
}

function openCreateUser() {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增用户";
  const fields = [
    ["username", "用户名", "text"],
    ["password", "登录密码", "text"],
    ["person_id", "关联人员", "select", [["", "未关联"], ...state.data.governance.persons.map((person) => [person.id, `${person.real_name}｜${person.employee_no || "-"}`])]],
    ["name", "账号显示名", "text"],
    ["email", "邮箱", "text"],
    ["role", "角色", "select", state.data.governance.roles.map((role) => [role.code, role.name])],
    ["org_id", "所属组织", "select", state.data.governance.organizations.map((org) => [org.id, org.name])],
    ["status", "状态", "select", ["启用", "停用"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, { password: "123456", status: "启用", effective_from: today() })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = type === "number" ? Number(value) : value;
    });
    await api("users", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreatePerson() {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增人员";
  const fields = personFormFields();
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, { person_type: "合同制", status: "在职", effective_from: today() })).join("");
  bindImageUploadControls(document.querySelector("#editFields"));
  bindPersonEditDependencies(document.querySelector("#editFields"), {});
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : value;
    });
    normalizePersonPayloadByType(payload);
    const errors = validatePersonPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("persons", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateSupplier() {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增供应商";
  const fields = supplierFormFields();
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    type: "第三方人力",
    status: "合作中",
    effective_from: today(),
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : value;
    });
    const errors = validateSupplierPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("suppliers", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateContract() {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增合同/协议";
  const fields = contractFormFields();
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    contract_attribute: "框架",
    contract_type: "人员外包框架",
    signing_subject: "企业数智化事业部",
    signed_date: today(),
    duration_months: 12,
    total_amount: 0,
    currency: "CNY",
    tax_included: "含税",
    status: "履行中",
    effective_from: today(),
    effective_to: nextYearDate(),
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validateContractPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("contracts", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateContractLot(contractId = null) {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增合同标段";
  const fields = contractLotFormFields();
  const selectedContract = state.data.governance.contracts.find((contract) => Number(contract.id) === Number(contractId)) || state.data.governance.contracts[0] || {};
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    contract_id: contractId || selectedContract.id || "",
    lot_type: "人员外包",
    effective_from: selectedContract.effective_from || today(),
    effective_to: selectedContract.effective_to || nextYearDate(),
    budget_amount: 0,
    status: "启用",
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validateContractLotPayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("contract-lots", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateLotSupplierPrice(lotId = null, contractId = null, supplierId = null) {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增入围供应商价格项";
  const contractLots = contractId
    ? state.data.governance.contractLots.filter((lot) => Number(lot.contract_id) === Number(contractId))
    : state.data.governance.contractLots;
  const selectedLot = contractLots.find((lot) => Number(lot.id) === Number(lotId));
  const selectedContract = state.data.governance.contracts.find((contract) => Number(contract.id) === Number(contractId || selectedLot?.contract_id)) || state.data.governance.contracts[0] || {};
  const fields = lotSupplierPriceFormFields(contractLots);
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    contract_id: contractId || selectedLot?.contract_id || selectedContract.id || "",
    lot_id: lotId || "",
    supplier_id: supplierId || state.data.governance.suppliers[0]?.id || "",
    shortlist_status: "已入围",
    personnel_type: "开发人员",
    personnel_level: "初级",
    price_unit: "人日",
    unit_price: 0,
    tax_rate: 0.06,
    effective_from: selectedLot?.effective_from || selectedContract.effective_from || today(),
    effective_to: selectedLot?.effective_to || selectedContract.effective_to || nextYearDate(),
    status: "有效",
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key, , type]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : type === "number" ? Number(value) : value;
    });
    const errors = validateLotSupplierPricePayload(payload);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }
    await api("lot-supplier-prices", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateAwardSupplier(lotId = null, contractId = null) {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增入围供应商";
  const contractLots = contractId
    ? state.data.governance.contractLots.filter((lot) => Number(lot.contract_id) === Number(contractId))
    : state.data.governance.contractLots;
  const selectedLot = contractLots.find((lot) => Number(lot.id) === Number(lotId));
  const selectedContract = state.data.governance.contracts.find((contract) => Number(contract.id) === Number(contractId || selectedLot?.contract_id)) || state.data.governance.contracts[0] || {};
  const fields = lotSupplierAwardFormFields(contractLots);
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, {
    contract_id: contractId || selectedLot?.contract_id || selectedContract.id || "",
    lot_id: lotId || "",
    supplier_id: state.data.governance.suppliers[0]?.id || "",
    shortlist_status: "已入围",
    effective_from: selectedLot?.effective_from || selectedContract.effective_from || today(),
    effective_to: selectedLot?.effective_to || selectedContract.effective_to || nextYearDate(),
    status: "有效",
  })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = value === "" ? null : value;
    });
    if (!payload.supplier_id || !payload.effective_from || !payload.effective_to) {
      alert("请维护供应商和入围有效期");
      return;
    }
    await api("lot-supplier-awards", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    await loadView();
  };
}

function openCreateOrganization(parentId = null) {
  const dialog = document.querySelector("#editDialog");
  document.querySelector("#editTitle").textContent = "新增组织";
  const fields = [
    ["code", "组织编码", "text"],
    ["name", "组织名称", "text"],
    ["short_name", "组织简称", "text"],
    ["type", "组织类型", "select", organizationTypeOptions()],
    ["parent_id", "上级组织", "select", organizationParentOptions()],
    ["owner_id", "负责人", "select", [["", "未指定"], ...state.data.governance.persons.map((person) => [person.id, person.real_name])]],
    ["leader_id", "分管领导", "select", [["", "未指定"], ...state.data.governance.persons.map((person) => [person.id, person.real_name])]],
    ["sort_order", "排序号", "number"],
    ["status", "状态", "select", ["草稿", "启用", "停用", "已撤销"]],
    ["effective_from", "生效日期", "date"],
    ["effective_to", "失效日期", "date"],
    ["remark", "备注", "textarea"],
  ];
  document.querySelector("#editFields").innerHTML = fields.map((field) => fieldControl(field, { type: "business_group", parent_id: parentId ?? "", status: "启用", effective_from: today(), sort_order: 0 })).join("");
  dialog.showModal();
  document.querySelector("#editForm").onsubmit = async (event) => {
    event.preventDefault();
    if (event.submitter.value !== "save") {
      dialog.close();
      return;
    }
    const payload = {};
    fields.forEach(([key]) => {
      const value = document.querySelector(`[name="${key}"]`).value;
      payload[key] = key === "sort_order" ? Number(value || 0) : (value === "" ? null : value);
    });
    await api("organizations", { method: "POST", body: JSON.stringify(payload) });
    dialog.close();
    closeOrganizationDrawer();
    await loadView();
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextYearDate() {
  const value = new Date();
  value.setFullYear(value.getFullYear() + 1);
  value.setDate(value.getDate() - 1);
  return value.toISOString().slice(0, 10);
}

function badge(value, className = "") {
  return `<span class="status ${className || escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("zh-CN", { maximumFractionDigits: 1 });
}

function sumBy(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init().catch((error) => {
  localStorage.removeItem("projectBiSessionUserId");
  state.userId = 0;
  showLogin();
  document.querySelector("#content").innerHTML = `<div class="panel"><div class="empty">${escapeHtml(error.message)}</div></div>`;
});
