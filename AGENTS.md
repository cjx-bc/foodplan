# AGENTS.md

本文件是 `C:\Users\33428\Desktop\foodplan` 项目的代理工作说明。只要涉及编码、项目配置、构建、脚本、文档生成或源码读写，统一使用 UTF-8。

## 项目概览

这是一个 SmartMeal 助手 MVP Web 前端原型，展示 AI 饮食计划助手的核心流程：AI 对话、今日三餐、库存管理、每周计划、营养统计和购物清单。

项目当前由两部分组成：

- Web 前端：Vite + React + TypeScript 单页应用，页面切换由 `src/app/App.tsx` 内的 hash 路由状态实现，并已通过 `localStorage` 保留本地工作台状态。
- 后端服务：Node.js 原生 HTTP + TypeScript，位于 `server/`，当前提供 `health`、`profile`、`inventory-items`、`meal-plans`、`weekly-plans`、`shopping-lists`、`conversations` API，并使用 `server/data/store.json` 作为本地 JSON 存储。

当前还没有数据库、真实 AI API 或 React Router。

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
| 后端运行时 | Node.js HTTP | 不引入 Express，先用原生 HTTP 完成 MVP API 骨架。 |
| 服务端开发工具 | tsx + TypeScript | `npm run dev:server` 热更新，`npm run start:server` 运行构建产物。 |
| 本地存储 | JSON 文件 | 当前使用 `server/data/store.json`，后续再升级数据库。 |

## 对外文档

| 文件 | 状态 | 说明 |
| --- | --- | --- |
| `README.md` | 已更新 | 面向 GitHub 仓库访客，说明项目定位、功能范围、技术栈、启动方式、目录结构和后续计划。 |
| `docs/smartmeal-backend-api-contract.md` | 已新增 | 后端 API 正式合约，覆盖 profile、inventory、meal-plan、weekly-plan、shopping-list、conversation 六类资源。 |
| `docs/smartmeal-core-data-model.md` | 已新增 | 核心数据模型正式定义，冻结用户档案、库存、餐单、周计划、购物清单和对话记录的字段与关系。 |

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

```powershell
npm run dev:server
```

启动后端开发服务，默认监听 `http://localhost:8787`。

```powershell
npm run start:server
```

运行后端构建产物 `server-dist/index.js`。

```powershell
npm run build:server
```

只构建后端 TypeScript 产物到 `server-dist/`。

## 验证流程

当前没有 `lint` 或格式化脚本。修改源码后至少运行：

```powershell
npm run build
npm run build:server
```

涉及后端链路、前后端接线或接口契约改动时，再额外运行：

```powershell
npm run test:api-smoke
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
├── tsconfig.server.json
├── server
├── src
├── docs
├── artifacts
├── dist
├── server-dist
└── node_modules
```

- `src`：应用源码。
- `server`：后端源码、校验逻辑和本地 JSON 存储。
- `docs`：产品需求、MVP 截图、任务拆解和开发拆解。
- `artifacts`：阶段截图和路由验证截图，不是运行时资源。
- `dist`：Vite 构建输出，不手工编辑。
- `server-dist`：后端 TypeScript 构建输出，不手工编辑。
- `node_modules`：依赖目录，不手工编辑。

## 源码结构

```text
src
├── main.tsx
├── vite-env.d.ts
├── app
│   ├── App.tsx
│   ├── api.ts
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
├── scripts
│   └── api-smoke.ts
└── utils
    ├── labels.ts
    ├── nutrition.ts
    └── planning.ts

server
├── catalog.ts
├── data
│   └── store.json
├── index.ts
├── planner.ts
├── responses.ts
├── store.ts
├── types.ts
├── utils.ts
└── validators.ts
```

## 文件归属

| 范围 | 主要文件 |
| --- | --- |
| 应用级状态、导航、hash 页面切换、6 个页面组合与桌面工作台布局 | `src/app/App.tsx` |
| 应用外壳、页面布局、导航样式、页面壳、图表和工作台样式 | `src/app/App.module.css` |
| 通用 UI | `src/components` |
| AI 对话面板 | `src/features/chat` |
| 库存表单和库存列表 | `src/features/inventory` |
| 今日三餐卡片与替换餐食 | `src/features/meals` |
| 营养统计和建议 | `src/features/nutrition` |
| 购物清单 | `src/features/shopping` |
| 演示数据 | `src/data/mockData.ts` |
| 领域类型 | `src/types/smartmeal.ts` |
| 标签和营养计算 | `src/utils` |
| 后端 HTTP 路由入口 | `server/index.ts` |
| 后端规则型餐单目录与生成器 | `server/catalog.ts`、`server/planner.ts` |
| 后端响应封装 | `server/responses.ts` |
| 后端本地存储读写 | `server/store.ts` |
| 后端实体类型 | `server/types.ts` |
| 后端校验和状态计算 | `server/validators.ts`、`server/utils.ts` |

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
- `PlanningMode`：当前按今日执行还是按本周执行查看工作台。
- `DerivedShoppingListItem`：由规则层推导出的采购项，包含稳定 key 和来源模式。
- `ChatMessage`：用户或助手消息，可带结构化推荐结果。
- `AiActionSummary`：AI 操作结果摘要，记录影响餐次、营养变化、购物清单变化和库存使用。
- `WeeklyPlanDay`：每周计划日卡数据，记录每日三餐标题、完整餐单详情、估算热量和计划状态。

新增业务字段时，先更新类型，再同步 `mockData.ts`、工具函数和展示组件。不要在多个组件中重复声明同一领域结构。

## 当前功能状态

| 模块 | 状态 | 说明 |
| --- | --- | --- |
| FE-01 初始化前端项目 | 已完成 | Vite + React + TypeScript 项目已存在。 |
| FE-02 类型定义 | 已完成 | 核心领域类型已在 `src/types/smartmeal.ts` 定义。 |
| FE-03 mock 数据 | 已完成 | 用户目标、库存、餐食、购物清单、对话数据和周计划日卡餐单详情已在 `src/data/mockData.ts`。 |
| FE-04 首页框架 | 已完成 | 顶部品牌、导航和 7 页桌面工作台页面容器已实现，默认入口为 `overview` 总览页。 |
| FE-05 AI 对话区 | 已完成 | 支持输入、快捷操作、mock 回复和右侧三餐/营养/库存/购物摘要工作区。 |
| FE-05A 前端真实 API 接线 | 已完成 | `chat / today / shopping / weekly / inventory` 已改为消费后端真实接口，`src/app/api.ts` 负责最小请求封装。 |
| FE-06 今日三餐卡片 | 已完成 | 支持展示、展开详情和单餐替换，并已接入 `POST /api/v1/meal-plans/:id/meals/:mealType/regenerate`。 |
| FE-07 营养概览 | 已完成 | 三餐变化后通过 `buildNutritionSummary` 同步计算。 |
| FE-08 库存模块 | 已完成 | 支持新增库存、临期状态计算和列表展示，新增库存后会触发当前采购缺口重算。 |
| FE-09 购物清单模块 | 已完成 | 支持分类展示和勾选已购买，并已接入真实 `shopping-lists` API。 |
| FE-10 页面视觉改版 | 已完成 | 已按参考图把 `chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping` 六页改成统一的 A 方向健康工具台样式。 |
| 每周计划页 | 已完成 | 已支持偏好选择、生成本周计划、单日微调、洞察摘要和确认采用的本地状态工作区。 |
| Weekly / Nutrition 桌面细化 | 已完成 | 已增强 `weekly` 页的计划摘要、选中日聚焦和餐格信息密度，并把 `nutrition` 页升级为更接近分析台的 Hero + 图表指标布局。 |
| Overview / Chat CTA 闭环 | 已完成 | 已补强总览页 CTA、三步流转条、模式动作区和对话页执行流程卡，让 AI 调整、今日执行、本周确认和采购回看形成明确动作链。 |
| 390px - 768px 首屏压缩 | 已完成 | 已改为更紧凑的头部间距、横向滚动导航、小尺寸 CTA 和更浅的首屏卡片间距，窄屏下无横向溢出，首屏高度明显收敛。 |
| 本地规则闭环 | 已完成 | 今日三餐、营养统计、每周计划和购物清单已通过共享状态推导保持同步，并支持今日/本周双模式切换。 |
| Web UI 定向打磨 | 已完成 | 已切换为暖白底、绿色主操作、圆角卡片和高保真桌面工作台风格。 |
| Git 仓库发布 | 已完成 | 项目已初始化 Git，忽略构建产物后提交并推送到 `cjx-bc/foodplan` 的 `main`。 |
| GitHub README | 已完成 | 已基于 `docs` 目录内容补齐仓库首页说明。 |
| 后端 API 合约 | 已完成 | 已新增正式 API 合约文档，明确 profile、inventory、meal-plan、weekly-plan、shopping-list、conversation 资源边界、请求响应和错误格式。 |
| 核心数据模型 | 已完成 | 已新增正式数据模型文档，冻结用户档案、库存、餐单、周计划、购物清单和对话记录的核心字段、关系和落库建议。 |
| BE-01 后端项目初始化 | 已完成 | 已新增 `server/` 目录、TypeScript 构建配置、`tsx` 开发脚本和本地 JSON 存储。 |
| BE-02 用户配置 API | 已完成 | 已实现 `GET/PATCH /api/v1/profile`，含统一错误响应和字段校验。 |
| BE-03 库存 API | 已完成 | 已实现 `GET/POST/PATCH/DELETE /api/v1/inventory-items`，含查询过滤、状态推导和本地写回。 |
| BE-04 今日餐单 API | 已完成 | 已实现 `POST /api/v1/meal-plans`、`GET /api/v1/meal-plans/:id`，支持基于库存和目标生成结构化日计划。 |
| BE-05 购物清单 API | 已完成 | 已实现 `POST /api/v1/shopping-lists/generate`、`GET /api/v1/shopping-lists/current`、`PATCH /api/v1/shopping-lists/:id/items/:itemId`。 |
| BE-06 对话 API | 已完成 | 已实现 `POST/GET /api/v1/conversations`、`GET/POST /api/v1/conversations/:id/messages`，支持消息记录与餐单联动。 |
| BE-07 每周计划 API | 已完成 | 已实现 `POST /api/v1/weekly-plans`、`GET /api/v1/weekly-plans/:id`、`PATCH /api/v1/weekly-plans/:id/days/:date`、`POST /api/v1/weekly-plans/:id/adopt`。 |
| 后端实现 | 进行中 | 日计划、购物、会话、weekly-plan 和 adopt 主链路已可运行；真实 AI、数据库和更细的错误降级仍未实现。 |
| AI 结构化生成 | 待评估 | 当前为本地 mock 和规则调整。 |
| 接口回归脚本 | 已完成 | 已新增 `scripts/api-smoke.ts` 和 `npm run test:api-smoke`，覆盖会话、日计划、购物清单、weekly-plan、adopt 主链路。 |
| 持久化存储 | 已完成 | 前端已改为仅在 `localStorage` 保存轻量资源指针与模式，业务真相源切换为后端 JSON 存储。 |

## 当前进度

| 范围 | 百分比 | 状态 | 依据 |
| --- | ---: | --- | --- |
| 前端 MVP 演示闭环 | 100% | 进行中 | 总览、AI 对话、今日三餐、库存、周计划、营养和购物清单已统一到真实后端数据源，刷新恢复改为“轻量 ID + 后端回拉”。 |
| 整体 MVP | 89% | 进行中 | 前端主要工作区、日计划/购物/会话/weekly-plan/adopt 主链路、接口回归脚本和后端 JSON 持久化已落地；仍缺真实 AI、数据库与更完整异常体验。 |
| 文档与交接 | 100% | 进行中 | PRD、任务清单、开发拆解、README、本文件、正式 API/数据模型文档和回归命令说明已同步；后续主要补真实 AI 与数据库接线记录。 |

## 下一步计划

| 优先级 | 状态 | 下一步 | 目标 |
| --- | --- | --- | --- |
| P0 | 已完成 | 对当前前端运行 `npm run build` 并记录结果 | 2026-05-03 已通过，源码和类型无构建错误。 |
| P0 | 已完成 | 启动 `npm run dev`，检查 `chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping` 页面 | 已完成 `1440px` 桌面截图回归，并修复 `390px` 宽度下头部横向溢出。 |
| P1 | 已完成 | 完善每周计划页交互 | 已从计划日卡升级为可生成、可调整、可确认采用的前端状态工作区。 |
| P1 | 已完成 | 打通本地规则闭环 | 已支持今日/本周双模式、周计划确认后同步今日三餐，并让购物清单保留同名项勾选状态。 |
| P0 | 已完成 | 定义后端 API 合约 | 已新增 `docs/smartmeal-backend-api-contract.md`，明确资源、请求响应、错误格式和前后端职责边界。 |
| P0 | 已完成 | 设计核心数据模型 | 已新增 `docs/smartmeal-core-data-model.md`，冻结用户档案、库存、餐单、周计划、购物清单和会话记录模型。 |
| P0 | 已完成 | 补回真正的 `overview` 总览页并与周计划 / 今日 / 购物清单共享同一状态来源 | 默认首页、导航结构和工作台摘要已重新对齐产品定义。 |
| P0 | 已完成 | 初始化后端项目并实现健康检查、profile、inventory API | 已新增 `server/` 与 `tsconfig.server.json`，并完成 `GET /api/v1/health`、`GET/PATCH /api/v1/profile`、`GET/POST/PATCH/DELETE /api/v1/inventory-items`。 |
| P0 | 已完成 | 实现 meal-plan、shopping-list、conversation API | 已完成日计划生成、购物缺口推导、购物勾选和对话消息落库，并打通 `conversation -> meal-plan -> shopping-list` 主链路。 |
| P1 | 已完成 | 继续打磨 `weekly` 和 `nutrition` 页的桌面细节 | 已增强周计划摘要、选中日聚焦、图表统计胶囊和营养页 Hero 布局，并完成 `1440px` 浏览器回归截图。 |
| P0 | 已完成 | 继续把 `overview` 与 `chat` 的 CTA 闭环压实 | 已补齐总览三步流转、模式动作区和聊天页流程卡，用户可直接从总览跳到 AI 调整、今日执行、本周确认和采购补缺口。 |
| P1 | 已完成 | 把前端 `chat / today / shopping` 接到已存在的后端 API | 已从本地 mock 过渡到真实接口，并改为资源 ID + 后端回拉恢复。 |
| P1 | 已完成 | 压缩 390px 到 768px 视口下的头部和首屏高度 | 已压缩头部、导航、按钮和 Hero 间距，并通过 `390px`、`768px` 浏览器截图确认首屏高度收敛。 |
| P1 | 已完成 | 实现 weekly-plan API 与 adopt 同步逻辑 | 已支持周计划生成、微调、确认采用，并同步今日餐单和周采购。 |
| P1 | 待执行 | 收紧前端错误态与加载态 | 补齐接口失败提示、空状态和重试行为，减少当前“静默失败”窗口。 |
| P1 | 待执行 | 做一轮桌面端运行态回归 | 在真实后端模式下检查 `overview / chat / today / weekly / shopping` 的溢出、错位和按钮行为。 |
| P2 | 待评估 | 接入真实 AI 结构化输出 | 在 `planner.ts` 规则 fallback 之上增加 schema 校验、模型调用和失败降级。 |
| P2 | 待评估 | 升级数据库持久化 | 用数据库替换 `server/data/store.json`，并补用户认证上下文。 |

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
- 默认页面是 `overview`，打开根路径时应进入总览工作台。
- `chat` 页面承担 AI 对话和右侧摘要工作区，是主要生成入口之一，但不再是默认首页。
- 视觉方向是“温和健康工具”：绿色用于主行动和健康正向状态，米白、浅黄、番茄橙用于食物感、提示和层级区分。
- 本项目暂时只做 Web 端；不要为本项目引入移动 App 底部导航、App Shell 或移动端专属交互，除非用户重新明确要求。
- 中文文案要短、清楚，适合工具型产品，不写营销式长文案。
- 新增按钮、面板、空状态或交互状态时，同步检查窄视口下的文本溢出、遮挡和布局跳动。
- 不把 `artifacts` 截图作为运行时图片。
- 图标按钮需要可读文本或明确的 `aria-label`。

## 修改边界

- 不要手工改 `dist`、`server-dist`、`node_modules` 或构建缓存。
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
| 2026-05-04 | 已完成 | 打通真实后端主链路：新增 `src/app/api.ts`，将前端 `chat / today / shopping / weekly / inventory` 改接真实 API；同时补齐 `weekly-plans`、`meal regenerate`、`adopt` 后端路由、`workspaceState` 存储和 `scripts/api-smoke.ts` 回归脚本，并更新 `AGENTS.md` | 需要把 SmartMeal 从“前端 mock 工作台”推进到“真实接口 + 周计划 adopt + 刷新可恢复”的可联调状态，减少继续依赖分散 mock 和重型 `localStorage` 快照。 | 已通过 `npm run build`、`npm run build:server`、`npm run test:api-smoke`；已启动 `server-dist/index.js` 验证 `GET /api/v1/health`；已验证 `http://localhost:5173/` 可返回 200。 |
| 2026-05-04 | 已完成 | 压实 `overview / chat` CTA 闭环，并继续细化 `weekly / nutrition` 桌面卡片层级；同时压缩 `390px-768px` 视口下头部与首屏高度，涉及 `src/app/App.tsx`、`src/app/App.module.css` 与 `AGENTS.md` | 需要把总览入口到 AI 调整、今日执行、本周确认、采购补缺口的动作路径收紧，并解决窄屏首屏过高的问题，让当前前端演示闭环可以真正从总览页走通。 | 已通过 `npm run build`；已使用 Playwright + 本机 Chrome 回归 `#/overview`、`#/chat`、`#/weekly`、`#/nutrition` 在 `1440px`、`768px`、`390px` 视口下的截图检查。 |
| 2026-05-04 | 已完成 | 继续打磨 `weekly` / `nutrition` 桌面页面：更新 `src/app/App.tsx` 与 `src/app/App.module.css`，补充周计划摘要条、选中日聚焦卡、营养页 Hero 和图表统计胶囊 | 需要把每周计划页和营养统计页进一步贴近参考图的图表密度、间距和按钮层级，同时保留现有状态流和组件边界。 | 已通过 `npm run build`；已启动 `npm run dev` 并使用 Playwright 回归 `#/weekly`、`#/nutrition` 1440px 视口截图；控制台仅有 `favicon.ico` 404。 |
| 2026-05-04 | 已完成 | 以产品经理视角复核当前项目现状并更新 `AGENTS.md`：补齐默认总览入口、后端已实现接口、源码结构与下一步计划 | 需要避免后续会话继续沿用过期的首页与后端能力判断，让产品、研发和代理都基于同一份真实状态协作。 | 已通过 `npm run build`；已用 UTF-8 读取确认；已启动 `server-dist/index.js` 并验证 `GET /api/v1/health`、`GET /api/v1/profile`、`GET /api/v1/conversations`、`POST /api/v1/meal-plans`。 |
| 2026-05-04 | 已完成 | 扩展后端主链路：新增 `meal-plans`、`shopping-lists`、`conversations`、`conversationMessages` 存储与路由，实现基于规则的日计划生成、购物缺口推导和对话消息联动 | 需要把后端从基础资源层推进到真正可演示的“AI 对话 -> 今日餐单 -> 购物清单”闭环，降低前端继续接 API 的阻力。 | 已通过 `npm run build`；已验证 `POST /api/v1/conversations`、`POST /api/v1/conversations/:id/messages`、`GET /api/v1/meal-plans/:id`、`POST /api/v1/shopping-lists/generate`、`PATCH /api/v1/shopping-lists/:id/items/:itemId`。 |
| 2026-05-04 | 已完成 | 新增后端骨架：补充 `server/` 目录、`tsconfig.server.json`、`dev:server/start:server` 脚本和本地 JSON 存储，并实现 `health`、`profile`、`inventory-items` API | 需要把后端从纯文档阶段推进到可运行的服务骨架，先打通最稳定的健康检查、用户档案和库存资源，降低后续 meal-plan 与 AI 接入成本。 | 已通过 `npm install`、`npm run build`；已启动构建产物并验证 `GET /api/v1/health`、`GET /api/v1/profile`、`GET /api/v1/inventory-items`、`POST /api/v1/inventory-items`。 |
| 2026-05-04 | 已完成 | 补回 `overview` 总览页：新增默认首页路由、导航入口、总览 Hero/指标卡/执行餐单/库存覆盖/本周工作区，并接入统一推导状态；同步更新 `AGENTS.md` | 需要让产品重新拥有一个符合工作台定位的默认入口，而不是直接落在 `chat` 页面。 | 已通过 `npm run build`；已用 Playwright 验证默认进入总览、周计划确认后总览能反映本周模式。 |
| 2026-05-04 | 已完成 | 修复 `App.tsx` 的本地持久化与交互回归：补齐 `localStorage` 恢复、让周计划确认态可见、并让周采购与购物勾选在刷新后保持一致；同步更新 `AGENTS.md` | 需要把“确认周计划 -> 本周采购 -> 勾选购物项 -> 刷新恢复”这条桌面工作流做成真正可验收的闭环。 | 已通过 `npm run build`；已使用 Playwright 对 `weekly -> shopping -> today` 链路做桌面端交互验收。 |
| 2026-05-04 | 已完成 | 新增 `docs/smartmeal-backend-api-contract.md` 与 `docs/smartmeal-core-data-model.md`，并同步更新 `README.md`、`AGENTS.md` | 需要先冻结后端 API 边界和核心实体模型，避免后续实现 profile、inventory、meal-plan、weekly-plan、shopping-list、conversation 时反复改前端和文档。 | 已通过 UTF-8 读取确认。 |
| 2026-05-03 | 已完成 | 按用户提供的参考图重做 `chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping` 六页桌面工作台视觉；同步更新 `App.tsx`、`App.module.css`、核心 feature 面板样式和库存/三餐结构 | 需要把当前项目页面设计整体切换到新的 A 方向高保真风格，同时保留现有前端交互逻辑并确保不报错。 | 已通过 `npm run build`；已启动本地开发服务器检查 `1440px` 桌面截图；已修复 `390px` 窄屏下头部横向溢出。 |
| 2026-05-03 | 已完成 | 增加本地持久化：在 `App.tsx` 内持久化今日执行草稿、周计划草稿、库存、购物勾选、AI 摘要和对话状态 | 避免用户刷新后丢失当前工作上下文，让本地规则闭环更接近真实工具使用体验。 | 已通过 `npm run build`；静态页面回归正常，尚未做专门的刷新前后交互验收。 |
| 2026-05-03 | 已完成 | 建立本地规则层：新增 `planning.ts`，把总览、今日三餐、营养统计、每周计划和购物清单改成共享状态推导，并补充周计划餐单详情 mock 数据 | 把原本分散的展示态串成“今日执行 / 本周执行”双模式闭环，减少页面之间的数据打架。 | 已通过 `npm run build`，并完成关键路由桌面截图回归。 |
| 2026-05-03 | 已完成 | 重写 `README.md`：基于 `docs` 目录补齐项目介绍、功能范围、技术栈、启动命令、目录结构和下一步计划 | 让 GitHub 仓库首页能准确反映当前 SmartMeal 前端原型的能力和边界。 | 已通过 UTF-8 读取确认。 |
| 2026-05-03 | 已完成 | 完成桌面端页面回归，并修复每周计划页“确认采用”按钮误用主按钮样式的问题 | 收敛本轮 UI 回归风险，确认核心页面在 `1440px` 和 `1024px` 下可用。 | 已通过 `npm run build`，并生成最新回归截图。 |
| 2026-05-03 | 已完成 | 初始化 Git 发布配置并完成首次推送：新增 `.gitignore`，绑定远端仓库约定，提交 `Add SmartMeal MVP frontend` 并推送到 `main` | 需要把当前前端原型提交并推送到 `cjx-bc/foodplan`，同时保留后续会话可继续使用的发布上下文。 | 已通过 `npm run build`，远端推送成功，提交 SHA 为 `6d2d5b16e486faa5ccf13e14048d67720eb296ff`。 |
| 2026-05-03 | 已完成 | 每周计划页升级为可操作工作区：增加偏好筛选、计划生成、单日微调、确认采用和洞察摘要 | 把周计划从静态展示补齐为可演示的前端闭环。 | 已通过 `npm run build`。 |
| 2026-05-03 | 已完成 | 同步最新项目状态：新增默认总览页、AI 对话页双栏工作区、Web UI 定向打磨说明、业务类型补充 | 让代理后续开发遵循当前实际信息架构和 Web 端范围。 | 已通过 UTF-8 读取确认。 |
| 2026-05-03 | 已完成 | 新建 `AGENTS.md` | 为跨会话开发保留项目说明、规范、进度和下一步计划。 | 已通过 UTF-8 读取确认。 |
