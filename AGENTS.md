# AGENTS.md

本文件是 `C:\Users\33428\Desktop\foodplan` 项目的代理工作说明。只要涉及编码、项目配置、构建、脚本、文档生成或源码读写，统一使用 UTF-8。

## 项目概览

这是一个 SmartMeal 助手 MVP Web 前端原型，展示 AI 饮食计划助手的核心流程：总览、AI 对话、今日三餐、库存管理、每周计划、营养统计和购物清单。

项目是 Vite + React + TypeScript 单页应用。当前没有后端、数据库、真实 AI API、持久化存储或 React Router；页面切换由 `src/app/App.tsx` 内的 hash 路由状态实现。

当前只按 Web 端设计与实现，不按移动 App 形态设计底部导航或 App 专属交互。

## 技术栈

| 类型 | 当前选型 | 备注 |
| --- | --- | --- |
| 包管理 | npm | 使用 `package-lock.json`，不要混用 yarn、pnpm 或 bun。 |
| 构建工具 | Vite 7 | 脚本位于 `package.json`。 |
| 前端框架 | React 19 | JSX 使用 `react-jsx`。 |
| 类型系统 | TypeScript 5 | 严格模式。 |
| 样式 | CSS Modules + 全局 CSS | 全局基础样式只放 `src/styles/global.css`。 |
| 图标 | lucide-react | 新增图标优先使用该库。 |

## 仓库与发布

| 项目 | 当前约定 |
| --- | --- |
| Git 默认分支 | `main` |
| 远端仓库 | `https://github.com/cjx-bc/foodplan.git` |
| 忽略内容 | `node_modules/`、`dist/`、日志和本地构建缓存不提交 |

## 常用命令

在项目根目录执行：

```powershell
npm install
```

安装依赖。

```powershell
npm run dev
```

启动开发服务器，脚本为 `vite --host 0.0.0.0`。

```powershell
npm run build
```

执行 TypeScript 构建检查并生成生产产物，脚本为 `tsc -b && vite build`。

```powershell
npm run preview
```

预览 `dist` 生产构建，脚本为 `vite preview --host 0.0.0.0`。

## 验证流程

当前没有 `test`、`lint` 或格式化脚本。修改源码后至少运行：

```powershell
npm run build
```

只修改文档时，至少用 UTF-8 读取确认内容正常：

```powershell
Get-Content -Encoding UTF8 AGENTS.md
```

UI 改动应启动开发服务器并人工检查关键页面和视口。当前已有截图产物覆盖 `chat`、`today`、`inventory`、`shopping` 等路由，可作为视觉参考，但不作为自动化测试。

## 目录说明

```text
.
├── AGENTS.md
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── src
├── docs
├── artifacts
├── dist
└── node_modules
```

- `src`：应用源码。
- `docs`：产品需求、MVP 截图、任务拆解和开发拆解。
- `artifacts`：阶段截图和路由验证截图，不是运行时资源。
- `dist`：Vite 构建输出，不手工编辑。
- `node_modules`：依赖目录，不手工编辑。

## 源码结构

```text
src
├── main.tsx
├── vite-env.d.ts
├── app
│   ├── App.tsx
│   └── App.module.css
├── components
│   ├── IconButton.tsx
│   ├── IconButton.module.css
│   ├── ProgressBar.tsx
│   └── ProgressBar.module.css
├── data
│   └── mockData.ts
├── features
│   ├── chat
│   ├── inventory
│   ├── meals
│   ├── nutrition
│   └── shopping
├── styles
│   └── global.css
├── types
│   └── smartmeal.ts
└── utils
    ├── labels.ts
    └── nutrition.ts
```

## 文件归属

| 范围 | 主要文件 |
| --- | --- |
| 应用级状态、导航、hash 页面切换、总览页、页面组合 | `src/app/App.tsx` |
| 应用外壳、页面布局、总览布局、导航样式、洞察面板样式 | `src/app/App.module.css` |
| 通用 UI | `src/components` |
| AI 对话面板 | `src/features/chat` |
| 库存表单和库存列表 | `src/features/inventory` |
| 今日三餐卡片与替换餐食 | `src/features/meals` |
| 营养统计和建议 | `src/features/nutrition` |
| 购物清单 | `src/features/shopping` |
| 演示数据 | `src/data/mockData.ts` |
| 领域类型 | `src/types/smartmeal.ts` |
| 标签和营养计算 | `src/utils` |

## 业务模型

核心类型在 `src/types/smartmeal.ts`：

- `MealType`：`breakfast`、`lunch`、`dinner`。
- `InventoryCategory`：食材分类，库存和购物清单共用。
- `UserProfile`：营养目标、口味偏好和饮食限制。
- `InventoryItem`：库存食材、数量、过期日期和状态。
- `NutritionFacts`：热量、蛋白质、碳水、脂肪、纤维。
- `MealIngredient`：餐食食材，记录用量、是否来自库存、是否可选。
- `MealRecommendation`：餐食推荐，包含图片、营养、食材、步骤和 AI 提示。
- `NutritionSummary`：实际摄入、目标、差异和评分。
- `MealPlanResult`：结构化餐单结果，包含餐食、营养、购物清单、库存使用和建议。
- `ShoppingListItem`：购物项、数量、勾选状态和购买原因。
- `ChatMessage`：用户或助手消息，可带结构化推荐结果。
- `AiActionSummary`：AI 操作结果摘要，记录影响餐次、营养变化、购物清单变化和库存使用。
- `WeeklyPlanDay`：每周计划日卡数据，记录每日三餐、估算热量和计划状态。

新增业务字段时，先更新类型，再同步 `mockData.ts`、工具函数和展示组件。不要在多个组件中重复声明同一领域结构。

## 当前功能状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| FE-01 初始化前端项目 | 已完成 | Vite + React + TypeScript 项目已存在。 |
| FE-02 类型定义 | 已完成 | 核心领域类型已在 `src/types/smartmeal.ts` 定义。 |
| FE-03 mock 数据 | 已完成 | 用户目标、库存、餐食、购物清单和对话数据已在 `src/data/mockData.ts`。 |
| FE-04 首页框架 | 已完成 | 顶部品牌、导航、默认总览页和页面容器已实现。 |
| FE-05 AI 对话区 | 已完成 | 支持输入、快捷操作、mock 回复和右侧执行结果/下一步工作区。 |
| FE-06 今日三餐卡片 | 已完成 | 支持展示、展开详情和单餐替换。 |
| FE-07 营养概览 | 已完成 | 三餐变化后通过 `buildNutritionSummary` 同步计算。 |
| FE-08 库存模块 | 已完成 | 支持新增库存、临期状态计算和列表展示。 |
| FE-09 购物清单模块 | 已完成 | 支持分类展示和勾选已购买。 |
| 总览页 | 已完成 | 默认进入 `overview`，集中展示今日饮食状态、关键指标、三餐预览和 AI 摘要。 |
| 每周计划页 | 已完成 | 已支持偏好选择、生成本周计划、单日微调、洞察摘要和确认采用的本地状态工作区。 |
| Web UI 定向打磨 | 已完成 | 已降低全绿视觉、加入暖色层级、补齐库存/购物清单洞察侧栏。 |
| 后端 API | 待评估 | 当前未初始化后端。 |
| AI 结构化生成 | 待评估 | 当前为本地 mock 和规则调整。 |
| 持久化存储 | 待评估 | 当前刷新后状态不会保存。 |

## 当前进度

| 范围 | 百分比 | 状态 | 依据 |
| --- | ---: | --- | --- |
| 前端 MVP 演示闭环 | 96% | 进行中 | 总览、AI 对话、三餐、库存、营养、购物清单和每周计划工作区均可演示；当前主要缺口转为真实数据与持久化。 |
| 整体 MVP | 54% | 进行中 | 前端原型闭环已较完整；后端、真实 AI、持久化和 API 合约尚未实现。 |
| 文档与交接 | 78% | 进行中 | PRD、任务清单、开发拆解和本文件已存在；本文件已同步最近 UI 与信息架构调整。 |

## 下一步计划

| 优先级 | 状态 | 下一步 | 目标 |
| --- | --- | --- | --- |
| P0 | 已完成 | 对当前前端运行 `npm run build` 并记录结果 | 2026-05-03 已通过，源码和类型无构建错误。 |
| P0 | 进行中 | 启动 `npm run dev`，检查 `overview`、`chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping` 页面 | 验证主要页面无明显溢出、遮挡或交互异常。 |
| P1 | 已完成 | 完善每周计划页交互 | 已从计划日卡升级为可生成、可调整、可确认采用的前端状态工作区。 |
| P1 | 待评估 | 设计后端 API 合约 | 对齐 `docs/smartmeal-mvp-dev-breakdown.md` 中 profile、inventory、meal-plan、shopping-list API。 |
| P2 | 待评估 | 接入持久化与真实 AI 结构化输出 | 替换本地 mock 数据，增加 JSON schema 校验和失败降级。 |

## 编码规范

- 所有文件读写使用 UTF-8。
- TypeScript 保持严格类型，避免 `any`。
- 组件使用函数组件，props 要有显式类型。
- 状态更新保持不可变写法，沿用 `useState`、`useMemo`、数组 `map` 和对象展开。
- JSX 使用 React 19 的 `react-jsx`，不需要为了 JSX 显式导入 `React`。
- 保持当前相对路径导入风格。
- 样式使用 CSS Modules；全局基础样式只放 `src/styles/global.css`。
- 图标优先使用 `lucide-react`。
- 简短注释只用于解释不直观的逻辑，不写空泛注释。

## UI 要求

- 保持当前 Web 工作台式信息架构：顶部品牌与导航，页面主体展示当前路由内容。
- 当前页面包括 `overview`、`chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping`。
- `overview` 是默认页面，打开根路径时应进入总览。
- `chat` 页面只承载 AI 对话和对话上下文工作区，不再放总览摘要卡。
- 视觉方向是“温和健康工具”：绿色用于主行动和健康正向状态，米白、浅黄、番茄橙用于食物感、提示和层级区分。
- 本项目暂时只做 Web 端；不要为本项目引入移动 App 底部导航、App Shell 或移动端专属交互，除非用户重新明确要求。
- 中文文案要短、清楚，适合工具型产品，不写营销式长文案。
- 新增按钮、面板、空状态或交互状态时，同步检查窄视口下的文本溢出、遮挡和布局跳动。
- 不把 `artifacts` 截图作为运行时图片。
- 图标按钮需要可读文本或明确的 `aria-label`。

## 修改边界

- 不要手工改 `dist`、`node_modules` 或构建缓存。
- 不要引入路由库、状态管理库、UI 框架或测试框架，除非任务明确要求。
- 不要把后端接口、数据库或真实 AI 调用当作已存在能力。
- 不要为小改动做跨目录大重构。
- 提交前确认 `.gitignore` 生效，避免把 `node_modules`、`dist` 和日志文件推到远端。

## 每次任务更新规则

处理新任务或项目更新时，必须基于当前 `AGENTS.md` 和项目结构更新本文件：

1. 保留已有内容，包括项目概览、技术栈、命令、目录结构、业务模型、编码规范、UI 规则和修改边界。
2. 仅针对新增功能、优化或修改部分追加或更新内容。
3. 更新“当前功能状态”“当前进度”“下一步计划”，标注百分比和状态。
4. 如果任务涉及新功能或修改，记录清楚修改原因、目标、涉及文件和验证结果。
5. 文档内容必须可操作，不写空泛或无法执行的描述。

## 交付检查

完成任务前确认：

- 改动范围符合用户请求。
- 源码改动已运行 `npm run build`。
- 文档改动已用 UTF-8 读取确认。
- UI 改动已说明是否做过浏览器检查。
- 如果新增命令、依赖、目录或测试流程，已更新本文件。

## 最近更新记录

| 日期 | 状态 | 变更 | 原因与目标 | 验证 |
| --- | --- | --- | --- | --- |
| 2026-05-03 | 已完成 | 初始化 Git 发布配置：新增 `.gitignore`，绑定远端仓库约定并更新交接说明 | 需要把当前前端原型提交并推送到 `cjx-bc/foodplan`，同时保留后续会话可继续使用的发布上下文。 | 已通过 `npm run build`，并确认远端 `main` 可访问。 |
| 2026-05-03 | 已完成 | 每周计划页升级为可操作工作区：增加偏好筛选、计划生成、单日微调、确认采用和洞察摘要 | 把周计划从静态展示补齐为可演示的前端闭环。 | 已通过 `npm run build`。 |
| 2026-05-03 | 已完成 | 同步最新项目状态：新增默认总览页、AI 对话页双栏工作区、Web UI 定向打磨说明、业务类型补充 | 让代理后续开发遵循当前实际信息架构和 Web 端范围。 | 已通过 UTF-8 读取确认。 |
| 2026-05-03 | 已完成 | 新建 `AGENTS.md` | 为跨会话开发保留项目说明、规范、进度和下一步计划。 | 已通过 UTF-8 读取确认。 |
