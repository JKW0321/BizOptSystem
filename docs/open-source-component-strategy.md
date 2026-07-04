# 开源组件嵌入策略

## 原则

系统核心经营对象、数据权限、审批流、成本计算和绩效口径必须由本系统掌握。类 Excel 表格、图表渲染、拖拽布局、批量导入解析、智能分析等通用能力可以接入成熟开源组件或外部服务。

## 推荐组件

| 场景 | 推荐组件 | 许可证 | 用途 |
| --- | --- | --- | --- |
| 类 Excel 表格 | Tabulator | MIT | 工时填报、资金计划、KPI 完成值填报、导入预览 |
| 高级数据表格 | AG Grid Community | Community MIT，企业功能商业授权 | 更复杂的表格筛选、固定列、分组汇总 |
| 可视化图表 | Apache ECharts | Apache-2.0 | 经营驾驶舱、绩效看板、资金执行分析 |
| 拖拽布局 | GridStack.js | MIT | 自定义经营分析看板 |
| 嵌入式 BI | Apache Superset | Apache-2.0 | 二期自助分析和复杂报表 |
| 快速嵌入式 BI 备选 | Metabase | 需审查开源/商业条款 | 快速做自助查询和嵌入报表 |
| LLM 辅助 | 统一模型网关 | 按供应商 | 导入字段映射、异常解释、经营问题分析 |

## 优先级

一期优先落地：

1. `Tabulator`: 改造项目工时填报，把当前表单式维护升级为类 Excel 表格。
2. `Apache ECharts`: 改造经营驾驶舱、绩效看板、资金执行分析的图表。
3. `GridStack.js`: 给经营分析页增加可拖拽卡片布局能力。

当前嵌入状态：

- 项目工时管理已通过 `static/js/integrations/spreadsheet-grid.js` 接入 Tabulator，支持在工时台账中直接编辑填报方式、比例、小时、工作内容和状态。
- 经营驾驶舱已通过 `static/js/integrations/report-builder.js` 接入 ECharts，将 KPI 完成和商机阶段增强为图表展示。
- 经营驾驶舱指标卡片区已通过 `GridStack.js` 增强为可拖拽布局。
- 所有增强均保留原 HTML 表格/条形图兜底，组件加载失败不影响基础功能使用。

二期评估：

1. `Apache Superset`: 作为独立 BI 服务嵌入，用于复杂自助分析、SQL Lab、报表设计和多维看板。
2. `Metabase`: 上手更快，但上线前需要明确许可证、嵌入方式、权限隔离和商业条款。
3. `AG Grid Community`: 当 Tabulator 难以支撑复杂台账时再引入，注意不要误用企业版特性。

## 工时管理建议

工时填报应优先升级为类 Excel 表格：

- 行是项目-人员-周期工时记录。
- 列包括周期、项目、人员、填报方式、比例、小时、工作内容、状态、预警。
- 支持复制粘贴、批量编辑、单元格校验。
- 前端只做即时提示，累计比例不超过 1、小时不超过 8、项目/人员权限、成本快照仍由后端 `business/timesheets.py` 校验。

## 经营分析建议

经营分析分两层：

- 一期内置驾驶舱：继续由系统接口提供固定经营指标，用 ECharts 提升图表表现。
- 二期自助看板：用 GridStack.js 做拖拽布局，卡片数据来源受权限控制，布局配置按用户或角色保存。

复杂自助分析可以后续引入 Superset 或 Metabase，但要注意：

- 需要统一认证和单点登录。
- 需要把系统权限映射到 BI 数据权限。
- 需要明确哪些数据可以进入 BI 语义层。
- 对 500 人以下规模，优先内嵌轻量图表和布局，不急于引入完整 BI 平台。

## 集成边界

已预留：

- `backend/integrations/component_registry.py`: 组件能力注册表。
- `/api/component-registry`: 前端和管理员可查看当前推荐能力。
- `static/js/integrations/spreadsheet-grid.js`: 类 Excel 表格适配层。
- `static/js/integrations/report-builder.js`: 图表和拖拽看板适配层。

后续页面改造时，只通过适配层调用组件，不在业务页面中直接散写 CDN、初始化参数和组件私有 API。
