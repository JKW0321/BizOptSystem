# 经营管理系统模块化规范

## 目标

系统从单文件 MVP 演进为可持续维护的模块化 Web 应用。模块拆分遵循“公共底座稳定、专业模块自治、数据模型统一、权限统一收口”的原则。

## 后端分层

- `backend/config.py`: 路径、数据库位置、运行日期等配置。
- `backend/db.py`: 数据库连接、通用查询、通用更新。
- `backend/security.py`: 权限码、数据范围、可见性条件。
- `backend/core.py`: 金额、周期、聚合等跨模块工具。
- `backend/standards.py`: 模块分组、实体分类等系统标准。
- `backend/modules/`: 承载项目、资金、工时、合同、人力、绩效、系统治理等专业服务。
- `backend/integrations/`: 开源组件和外部能力注册表，统一管理表格、图表、拖拽看板、BI 等集成能力。
- `backend/ontology/`: 业务本体和语义层，描述实体、字段、关系和 Agent 可理解的上下文。
- `backend/llm/`: 模型网关层，为批量导入、问题分析、智能问答和 Agent 编排提供统一接口。

当前后端模块划分如下：

- `backend/modules/business/pipeline.py`: 客户、商机、项目台账和商机转项目。
- `backend/modules/business/funds.py`: 项目资金计划、实际收付、应收账龄和资金预警。
- `backend/modules/business/timesheets.py`: 项目工时、人员投入、工时成本快照。
- `backend/modules/resources/hr.py`: 人员、组织、组织层级和组织主数据。
- `backend/modules/resources/contracts.py`: 供应商、合同/框架、标段、入围供应商、人员价格体系。
- `backend/modules/performance/service.py`: KPI、组织绩效目标、分解、季度拆分、完成值和得分基础。
- `backend/modules/operations/service.py`: 经营预测、调度事项和经营驾驶舱。
- `backend/modules/system/governance.py`: 用户、角色、权限、数据范围和系统控制台。

模块依赖方向应保持单向：

`config/db/security/core → resources/system/business/performance/operations → app.py`

业务模块可以依赖公共层和基础主数据模块，但不应反向依赖 `app.py`。

## 前端分层

- `static/js/core/`: 通用格式化、按钮、状态、表格、表单等基础组件。
- `static/js/integrations/`: 开源组件适配层，例如类 Excel 表格、图表和拖拽看板。
- `static/js/modules/`: 专业业务模块，后续按菜单域迁移。
- `static/app.js`: 当前兼容入口，逐步瘦身，不再继续堆叠新模块。

## 模块域

- 经营驾驶舱: 经营驾驶舱、经营预测、调度动作。
- 业务经营: 客户、商机、项目、项目资金、项目工时。
- 资源管理: 人员、组织、供应商、合同/框架。
- 组织绩效: KPI 指标库、绩效方案、组织绩效目标、完成值、评价计分、绩效看板。
- 系统管理: 用户、角色、权限、菜单、数据范围。

## 数据模型标准

基础主数据包括组织、人员、客户、供应商、合同、KPI 指标。业务交易数据包括商机、项目、资金计划、实际收付款、工时、绩效目标和完成值。所有交易数据必须能追溯到基础主数据。

新增表建议统一包含：

- 主键 `id`
- 编码 `code` 或业务编号
- 状态 `status`
- 生效日期 `effective_from`
- 失效日期 `effective_to`
- 备注 `remark`
- 必要时增加 `created_at`、`updated_at`、`created_by`、`updated_by`

## 权限标准

角色本质由“功能范围 + 数据范围”组成。功能权限通过权限码控制页面和按钮，数据范围通过 `security.scoped_clause` 统一生成查询条件。业务模块不应自行发明数据范围口径。

## 语义本体层

系统核心对象应在 `backend/ontology/schema.py` 中注册，包括实体名称、说明、主表、关键字段和实体关系。该层不是数据库替代品，而是给 Agent、智能导入、影响分析和经营问答使用的语义索引。

当前语义接口：

- `/api/ontology`: 返回实体和关系快照。
- `/api/llm-status`: 返回模型网关是否配置，以及未来能力清单。
- `/api/component-registry`: 返回可嵌入开源组件和外部能力清单。

后续扩展建议：

- 为每个实体补充字段口径、枚举值、权限要求和数据质量规则。
- 为批量导入增加“源字段 → 系统字段”的 LLM 辅助映射。
- 为经营分析增加“问题 → 指标 → 数据表 → 可见范围”的语义计划。
- 为 Agent 增加只读分析工具和需审批的写入工具边界。

## LLM 网关标准

模型能力统一通过 `backend/llm/gateway.py` 调用，不允许业务页面直接写死某一家模型 API。

配置项：

- `PROJECT_BI_LLM_ENDPOINT`
- `PROJECT_BI_LLM_API_KEY`
- `PROJECT_BI_LLM_MODEL`

一期只做网关和状态能力，不默认调用外部模型，避免影响系统稳定性。未来可用于：

- Excel 批量导入字段识别和异常提示。
- 项目、资金、工时、绩效数据的问题诊断。
- 基于本体层的经营问答和穿透分析。
- 自动生成项目周报、资金风险说明、绩效偏差原因。

## 开源组件标准

通用交互能力优先通过成熟开源组件承载，避免重复自研：

- 工时、资金计划、KPI 完成值等“行列式批量录入”优先采用类 Excel 表格组件。
- 经营驾驶舱、绩效看板、资金执行分析优先采用成熟图表库。
- 自定义经营分析页面优先采用拖拽布局组件。
- 复杂自助 BI 可二期评估 Superset、Metabase 等嵌入式方案。

组件通过 `backend/integrations/component_registry.py` 注册，通过 `static/js/integrations/` 适配。业务页面不得直接散落第三方组件初始化代码。

详细选型见 `docs/open-source-component-strategy.md`。

## 迁移节奏

第一阶段已完成后端公共层和专业模块拆分。后续优化应遵循“先后端服务、再前端视图、最后交互细节”的节奏，不再向 `app.py` 和 `static/app.js` 堆叠新业务。
