# AGENTS.md

本文件是 `C:\Users\33428\Desktop\foodplan` 项目的代理工作说明。只要涉及编码、项目配置、构建、脚本、文档生成或源码读写，统一使用 UTF-8。

## 项目概览

这是一个 SmartMeal 助手 MVP Web 前端原型，展示 AI 饮食计划助手的核心流程：AI 对话、今日三餐、库存管理、每周计划、营养统计和购物清单。

项目当前由两部分组成：

- Web 前端：Vite + React + TypeScript 单页应用，页面切换由 `src/app/App.tsx` 内的 hash 路由状态实现，并已通过 `localStorage` 保留本地工作台状态。
- 后端服务：Node.js 原生 HTTP + TypeScript，位于 `server/`，当前提供 `health`、`auth/guest`、`session`、`workspace-state`、`profile`、`inventory-items`、`meal-plans`、`weekly-plans`、`shopping-lists`、`conversations` API；数据库目标选型现调整为 MySQL。

当前数据边界仍按 guest session -> workspace -> resources 设计，且已具备 MySQL migration / seed、DeepSeek 结构化生成适配层和 workspace 隔离回归脚本。`server/data/store.json` 仅作为 seed 输入，不再作为运行时真相源。仍没有 React Router。

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
| 数据库 | MySQL 8 | 已使用 `mysql2` 驱动；支持 `DATABASE_URL` 或 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。 |
| 种子数据 | JSON -> MySQL | `server/data/store.json` 仅作为 seed 输入，运行时读写全部走 MySQL。 |

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

```powershell
npm run db:migrate
```

执行数据库 migration。当前目标数据库为 MySQL；脚本会先确保目标数据库存在，再应用 `server/migrations/*.sql`。

```powershell
npm run db:seed
```

把 `server/data/store.json` 导入 MySQL 作为初始 workspace 数据。该 JSON 文件只作为 seed 输入，不参与运行时读写。

```powershell
npm run test:api-contract
npm run test:workspace-smoke
npm run test:ui-regression
```

分别校验接口契约、workspace 隔离和 UI 回归脚本入口。

```powershell
$env:PLAYWRIGHT_CDP_URL="http://127.0.0.1:9222"
$env:PLAYWRIGHT_CHANNEL="msedge"
npm run test:ui-regression
```

将 UI 回归脚本连接到已开启远程调试端口的本机 Chrome / Edge，直接复用当前浏览器登录态。适合需要复用站点 session 的自动化登录场景。

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222
```

或：

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

先用以上命令启动带远程调试端口的浏览器，再执行 `PLAYWRIGHT_CDP_URL` 模式的 UI 回归命令。

```powershell
$env:PLAYWRIGHT_EXTENSION_MODE="1"
$env:PLAYWRIGHT_USER_DATA_DIR="$PWD\\.playwright-user-data"
$env:PLAYWRIGHT_CHANNEL="chrome"
$env:PLAYWRIGHT_HEADLESS="false"
npm run test:ui-regression
```

以持久化浏览器上下文运行 UI 回归，复用同一个 Playwright 用户目录；适合把登录态长期保存在项目本地测试目录，不适合直接读取正在运行中的系统浏览器 Profile。

## 验证流程

当前没有 `lint` 或格式化脚本。修改源码后至少运行：

```powershell
npm run build
npm run build:server
```

涉及后端链路、前后端接线或接口契约改动时，再额外运行：

```powershell
npm run test:api-smoke
npm run test:api-contract
npm run test:workspace-smoke
```

涉及数据库结构改动时，再额外运行：

```powershell
npm run db:migrate
```

只修改文档时，至少用 UTF-8 读取确认内容正常：

```powershell
Get-Content -Encoding UTF8 AGENTS.md
```

UI 改动应启动开发服务器并人工检查关键页面和视口。当前已有截图产物覆盖 `chat`、`today`、`inventory`、`shopping` 等路由，可作为视觉参考，但不作为自动化测试。

涉及需要登录态的网站联调时，优先使用 Playwright MCP extension 模式或 `PLAYWRIGHT_CDP_URL` 连接已有 Chrome / Edge 会话，避免在自动化脚本中重复输入账号密码。

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
├── scripts
├── server
├── src
├── docs
├── artifacts
├── dist
├── server-dist
└── node_modules
```

- `src`：应用源码。
- `scripts`：数据库迁移、seed 与回归脚本。
- `server`：后端源码、数据库读写、校验逻辑和 AI 适配层。
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
└── utils
    ├── labels.ts
    ├── nutrition.ts
    └── planning.ts

scripts
├── api-contract.ts
├── api-smoke.ts
├── db-migrate.ts
├── db-seed-from-json.ts
├── ui-regression.ts
└── workspace-smoke.ts

server
├── ai
│   ├── deepseek.ts
│   └── schemas.ts
├── catalog.ts
├── db.ts
├── data
│   └── store.json
├── index.ts
├── migrations
│   └── 001_init.sql
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
| 后端数据库连接与 migration | `server/db.ts`、`server/migrations/001_init.sql` |
| 后端数据库读写 | `server/store.ts` |
| 后端实体类型 | `server/types.ts` |
| 后端校验和状态计算 | `server/validators.ts`、`server/utils.ts` |
| DeepSeek 结构化输出与 schema 校验 | `server/ai/deepseek.ts`、`server/ai/schemas.ts` |
| 回归与数据库脚本 | `scripts` |

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
- `Session` / `WorkspaceState`：当前 guest 或用户会话绑定的 workspace、当前对话、当前日计划、当前周计划和当前购物清单指针。
- `Workspace`：当前数据边界根节点；`profile`、`inventory`、`meal_plan`、`weekly_plan`、`shopping_list`、`conversation` 都按 `workspaceId` 隔离。

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
| FE-05B 聊天候选方案确认流 | 已完成 | `chat` 已改为先生成候选今日/本周方案，再通过 `采用今日方案 / 采用本周方案` 明确确认后切换 `overview / today / weekly / nutrition / shopping` 的当前执行资源。 |
| FE-06 今日三餐卡片 | 已完成 | 支持展示、展开详情和单餐替换，并已接入 `POST /api/v1/meal-plans/:id/meals/:mealType/regenerate`。 |
| FE-07 营养概览 | 已完成 | 三餐变化后通过 `buildNutritionSummary` 同步计算。 |
| FE-08 库存模块 | 已完成 | 支持新增库存、临期状态计算和列表展示，新增库存后会触发当前采购缺口重算。 |
| FE-08A 库存消耗扣减 | 已完成 | 库存页已新增“手动扣减 / 自动扣减”双入口、hover 说明和红色 `-数量` 预扣减标记；确认采用方案后可按当前执行方案回写库存数量。 |
| FE-09 购物清单模块 | 已完成 | 支持分类展示和勾选已购买，并已接入真实 `shopping-lists` API。 |
| FE-10 页面视觉改版 | 已完成 | 已按参考图把 `chat`、`today`、`inventory`、`weekly`、`nutrition`、`shopping` 六页改成统一的 A 方向健康工具台样式。 |
| 每周计划页 | 已完成 | 已支持偏好选择、生成本周计划、单日微调、洞察摘要和确认采用的本地状态工作区。 |
| Weekly / Nutrition 桌面细化 | 已完成 | 已增强 `weekly` 页的计划摘要、选中日聚焦和餐格信息密度，并把 `nutrition` 页升级为更接近分析台的 Hero + 图表指标布局。 |
| 桌面端视觉紧凑化 | 已完成 | 已按接近浏览器 `90%` 缩放的观感下调桌面端基础字号、导航高度、卡片留白和指标数字尺寸，不改移动端断点结构。 |
| 评论驱动 UI 修正 | 已完成 | 已根据页面评论压缩 `chat` 快捷操作区、为消息区增加内部滚动、收紧 `overview` CTA 宽度，并把 `weekly` 偏好按钮改成更均衡的双列布局。 |
| 页面顶部说明移除 | 已完成 | 已移除 `overview / chat / today / inventory / weekly / nutrition / shopping` 页顶部的页面标题和说明文案，首屏直接进入主内容。 |
| Overview / Chat CTA 闭环 | 已完成 | 已补强总览页 CTA、三步流转条、模式动作区和对话页执行流程卡，让 AI 调整、今日执行、本周确认和采购回看形成明确动作链。 |
| Overview / Chat 骨架重构 | 已完成 | 已重做 `overview` Hero、执行节奏侧栏、关键缺口区和 `chat` 左主舞台 / 右摘要栈结构，并把配色、按钮、容器层级切到更强的编辑台风格。 |
| 390px - 768px 首屏压缩 | 已完成 | 已改为更紧凑的头部间距、横向滚动导航、小尺寸 CTA 和更浅的首屏卡片间距，窄屏下无横向溢出，首屏高度明显收敛。 |
| 本地规则闭环 | 已完成 | 今日三餐、营养统计、每周计划和购物清单已通过共享状态推导保持同步，并支持今日/本周双模式切换。 |
| Web UI 定向打磨 | 已完成 | 已切换为暖白底、绿色主操作、圆角卡片和高保真桌面工作台风格。 |
| Today / Shopping / Weekly 视觉体系统一 | 进行中 | 已统一全局视觉变量、主要按钮、面板底色和状态色，`TodayMealsPanel`、`ShoppingListPanel`、`weekly` 主工作区已切到同一套容器语言；仍需继续做真实运行态回归和局部间距收口。 |
| Git 仓库发布 | 已完成 | 项目已初始化 Git，忽略构建产物后提交并推送到 `cjx-bc/foodplan` 的 `main`。 |
| GitHub README | 已完成 | 已基于 `docs` 目录内容补齐仓库首页说明。 |
| 后端 API 合约 | 已完成 | 已新增正式 API 合约文档，明确 profile、inventory、meal-plan、weekly-plan、shopping-list、conversation 资源边界、请求响应和错误格式。 |
| 核心数据模型 | 已完成 | 已新增正式数据模型文档，冻结用户档案、库存、餐单、周计划、购物清单和对话记录的核心字段、关系和落库建议。 |
| BE-01 后端项目初始化 | 已完成 | 已新增 `server/` 目录、TypeScript 构建配置、`tsx` 开发脚本和本地 JSON 存储。 |
| BE-02 用户配置 API | 已完成 | 已实现 `GET/PATCH /api/v1/profile`，含统一错误响应和字段校验。 |
| BE-03 库存 API | 已完成 | 已实现 `GET/POST/PATCH/DELETE /api/v1/inventory-items`，含查询过滤、状态推导和本地写回。 |
| BE-04 今日餐单 API | 已完成 | 已实现 `POST /api/v1/meal-plans`、`GET /api/v1/meal-plans/:id`，支持基于库存和目标生成结构化日计划。 |
| BE-04A 今日候选方案采用 API | 已完成 | 已新增 `POST /api/v1/meal-plans/:id/adopt`，仅在明确采用时切换 `workspace-state.currentMealPlanId/currentShoppingListId`。 |
| BE-05 购物清单 API | 已完成 | 已实现 `POST /api/v1/shopping-lists/generate`、`GET /api/v1/shopping-lists/current`、`PATCH /api/v1/shopping-lists/:id/items/:itemId`。 |
| BE-06 对话 API | 已完成 | 已实现 `POST/GET /api/v1/conversations`、`GET/POST /api/v1/conversations/:id/messages`，支持消息记录与餐单联动。 |
| BE-06A 对话 proposal 语义 | 已完成 | `POST /api/v1/conversations/:id/messages` 已支持 `daily / weekly` 两种候选方案返回；生成 proposal 时不再隐式覆盖当前执行资源。 |
| BE-07 每周计划 API | 已完成 | 已实现 `POST /api/v1/weekly-plans`、`GET /api/v1/weekly-plans/:id`、`PATCH /api/v1/weekly-plans/:id/days/:date`、`POST /api/v1/weekly-plans/:id/adopt`。 |
| BE-10 库存消耗应用 API | 已完成 | 已新增 `POST /api/v1/inventory-consumptions/apply`，支持 `manual / auto` 两种扣减模式，并在扣减后重算当前来源购物清单。 |
| BE-08 数据库存储替换 | 已完成 | 已切到 MySQL 8：`server/db.ts` 使用 `mysql2`，`server/store.ts` 使用 MySQL SQL，migration/seed 已在真实 MySQL 环境跑通。 |
| BE-09 Guest Session / Workspace 边界 | 已完成 | `POST /api/v1/auth/guest` 现在会创建独立 guest user + workspace + session，资源读写按 `workspaceId` 收口。 |
| 后端实现 | 已完成（MVP 主链路） | 日计划、购物、会话、weekly-plan、adopt、DeepSeek 结构化生成和 MySQL 数据库化主链路已跑通；后续主要补营养可信度和部署配置。 |
| AI 结构化生成 | 已完成（真实调用已验证） | `server/ai/deepseek.ts` 与 `server/ai/schemas.ts` 已接入 DeepSeek `deepseek-v4-flash`；优先读 `DEEPSEEK_API_KEY`，环境变量缺失时从 MySQL `app_settings` 的 `deepseek.api_key` 读取；失败时回退本地规则生成。 |
| 自动化测试脚本 | 已完成（后端脚本）/ 待收口（UI 脚本） | `api-smoke`、`api-contract`、`workspace-smoke` 已在真实 MySQL 后端通过；`ui-regression` 已扩展运行态交互、慢响应检查，以及 `PLAYWRIGHT_CDP_URL` / 持久化 context 两种浏览器会话复用模式，但本轮执行超时问题仍需继续定位。 |
| Playwright 浏览器会话复用 | 已完成 | `scripts/ui-regression.ts` 已支持连接已开启远程调试端口的 Chrome / Edge，或使用持久化 `userDataDir` 运行回归；需要登录态的网站优先走 extension / CDP 模式，避免重复登录。 |
| 持久化存储 | 已完成 | 前端仅在 `localStorage` 保存轻量资源指针与模式；后端运行时真相源已切到 MySQL，`server/data/store.json` 仅保留为 seed 输入。 |
| 前端错误态与加载态 | 进行中 | 已补请求失败 banner/toast、空状态、loading skeleton、按钮 pending/disabled、retry 行为和失效 workspace 指针自动恢复；仍需完成真实浏览器运行态回归。 |
| Chat 生成中提示文案 | 已完成 | 已把聊天页 AI 生成中的提示从“AI 正在结合营养目标和家庭库存生成方案...”改成“正在思考ing”，降低文案长度并保持等待态轻量化。 |
| Chat 页 UI 尺寸调整 | 进行中 | 已开始把 `#/chat` 的主栅格、hero、消息区、输入条和快捷按钮整体缩小一档，目标是贴近用户提供的图一观感，而不是当前默认更大的尺寸。 |
| 生成质量地基 | 进行中 | 已扩展 meal ingredient 单位归一化、DeepSeek 结果合理性规则、异常样本记录、`promptVersion` v2 和用户可见规则降级文案；后续还需做真实模型样本对比。 |

## 当前进度

| 范围 | 百分比 | 状态 | 依据 |
| --- | ---: | --- | --- |
| 前端 MVP 演示闭环 | 100% | 进行中 | `chat` 已改成 proposal -> adopt 两阶段，`overview / today / weekly / nutrition / shopping / inventory` 只跟随已确认执行资源，库存页也已支持手动/自动扣减。 |
| 整体 MVP | 99% | 进行中 | proposal/adopt、weekly adopt、inventory consumption、guest workspace 隔离、DeepSeek AI 适配层、MySQL 持久化和 API 回归脚本已落地；当前主要剩真实浏览器 UI 回归与局部文案/间距收口。 |
| 文档与交接 | 100% | 进行中 | PRD、任务清单、开发拆解、README、本文件、正式 API/数据模型文档、数据库命令、Playwright 浏览器会话复用方式和 proposal/adopt 新规则已同步；后续主要补 UI 运行态回归记录。 |

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
| P1 | 已完成 | 重做 `overview` 页面骨架和视觉变量 | 已切到新的暖米底色、深绿 Hero、分层指标带和执行节奏侧栏，并通过 Playwright 回归 `#/overview` 桌面截图。 |
| P1 | 已完成 | 重做 `chat` 页左主区与右摘要区的主次关系 | 已把左侧升级为 Conversation Studio 主舞台，右侧摘要栈压成紧凑执行面板，并通过 Playwright 回归 `#/chat` 桌面截图。 |
| P1 | 进行中 | 统一 `today / shopping / weekly` 容器体系、按钮体系、状态色体系 | 已统一全局变量和主要面板样式，下一轮继续做真实运行态回归，检查局部溢出、空状态和细节对齐。 |
| P1 | 已完成 | 实现 weekly-plan API 与 adopt 同步逻辑 | 已支持周计划生成、微调、确认采用，并同步今日餐单和周采购。 |
| P1 | 进行中 | 收紧前端错误态与加载态 | 已补接口失败提示、空状态、loading、按钮 pending、retry 和失效资源恢复；还需继续跑通真实浏览器运行态回归。 |
| P1 | 待执行 | 做一轮桌面端运行态回归 | 在真实后端模式下检查 `overview / chat / today / weekly / shopping` 的溢出、错位和按钮行为。 |
| P1 | 已完成 | 接入 DeepSeek AI 适配层 | 已补 `server/ai/deepseek.ts`、schema 校验、meal/weekly 结构映射和规则 fallback，且不在仓库内落盘密钥；2026-05-05 已验证真实 DeepSeek 日计划生成返回 `source=ai`。 |
| P0 | 已完成 | 升级数据库持久化 | 已把数据库脚本、`server/db.ts` 和 `server/store.ts` 真正切到 MySQL，并保留 `workspaceId` 数据边界。 |
| P0 | 已完成 | 明确 guest session / workspace / user 归属 | `auth/guest` 已改为独立 guest user + workspace + session，资源读写与状态恢复按 workspace 隔离。 |
| P1 | 已完成 | 补自动化测试脚本入口 | 已新增 API contract、workspace smoke 和 UI regression 脚本入口。 |
| P1 | 进行中 | 增强生成质量地基 | 已补 meal ingredient 单位标准化、推荐合理性规则、异常样本记录、`promptVersion` v2 和规则降级可见文案；后续需要用真实模型样本做 promptVersion 对比。 |
| P1 | 已完成 | 在真实 MySQL 环境跑通 migration / seed / smoke | 已使用本机 MySQL 8.4、`root / 1234` 跑通 `db:migrate`、`db:seed`、`test:api-smoke`、`test:api-contract`、`test:workspace-smoke`。 |
| P0 | 已完成 | 补数据库化后的数据边界验证 | `scripts/workspace-smoke.ts` 已扩展验证 guest B 无法读取/修改 guest A 的 conversation、meal plan、shopping list、weekly plan、weekly day patch 和 weekly adopt。 |
| P1 | 进行中 | 做一轮真实后端模式下的桌面端运行态回归 | 已启动真实 MySQL 后端和 Vite，并扩展 `scripts/ui-regression.ts` 覆盖发送对话、换餐、生成/采用周计划、勾选购物、刷新恢复和慢响应；本轮 `npm run test:ui-regression` 超时，需下轮继续定位脚本等待点或页面阻塞。 |
| P1 | 已完成 | 给 UI 回归补浏览器 session 复用模式 | 已支持 `PLAYWRIGHT_CDP_URL` 连接现有 Chrome / Edge，会话登录可直接复用；同时保留 `PLAYWRIGHT_EXTENSION_MODE + PLAYWRIGHT_USER_DATA_DIR` 持久化 profile 模式。 |
| P0 | 已完成 | 把 AI 聊天改成 proposal -> adopt 两阶段 | 已实现今日/本周候选方案生成、显式采用按钮、`meal-plans/:id/adopt`、`weekly-plans/:id/adopt` 和页面只读已确认资源。 |
| P0 | 已完成 | 给库存页补手动/自动扣减 | 已实现 `inventory-consumptions/apply`、红色预扣减标记、手动数量确认和自动扣减可匹配项。 |
| P1 | 待执行 | 跑一轮真实浏览器 UI 回归 | 重点检查 `chat proposal -> adopt`、`weekly proposal -> adopt`、库存手动/自动扣减、刷新恢复和窄视口下按钮文案。 |
| P1 | 待执行 | 继续提高营养可信度 | 把单位归一扩到 meal ingredient、补推荐合理性规则，并把异常样本做成可追踪分析入口。 |

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
- 不要把生产可用的数据库实例、部署环境或稳定外部 AI 配额当作已存在能力；当前数据库目标虽已定为 MySQL，但真实运行环境、驱动和迁移验证仍需要单独确认。
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
| 2026-05-07 | 已完成 | 复核当前项目开发进度与工作区状态：对照 `AGENTS.md`、`git status`、前后端启动日志和目录结构，确认现阶段主要工作集中在真实浏览器 UI 回归、错误态/加载态收口和生成质量地基增强 | 用户要求检查项目开发进度，需要先把当前已完成、进行中和待执行项重新对齐，避免后续会话继续基于过期认知推进。 | 已确认前端 `http://localhost:5173` 与后端 `http://localhost:8787` 已启动；`git status` 仍有未提交的前后端改动，当前工作重点未偏离既定计划。 |
| 2026-05-07 | 已完成 | 将聊天页生成中提示文案从“AI 正在结合营养目标和家庭库存生成方案...”改为“正在思考ing”，并同步更新 `AGENTS.md` | 用户希望把等待态提示改得更短、更口语化，减少 AI 生成时的占屏感。 | 已完成源码修改；待运行 `npm run build` 做类型与打包验证。 |
| 2026-05-07 | 进行中 | 调整 chat 页 UI 尺寸：更新 `src/app/App.module.css` 与 `src/features/chat/ChatPanel.module.css`，把 chat 页主栏、hero、消息卡片和输入区从放大版收回到更紧凑的体量 | 用户澄清需要缩小而不是放大，目标是让 `#/chat` 的体量接近图一那种更紧凑的视觉，而不是当前默认更大的版本。 | 已完成样式收缩；待运行 `npm run build` 和浏览器回归确认实际观感。 |
| 2026-05-05 | 已完成 | 落地真实 AI 方案确认流与库存扣减闭环：更新 `src/app/App.tsx`、`src/app/api.ts`、`src/app/constants.ts`、`src/features/chat/ChatPanel.tsx`、`src/features/chat/ChatPanel.module.css`、`src/features/inventory/InventoryPanel.tsx`、`src/features/inventory/InventoryPanel.module.css`、`src/types/smartmeal.ts`、`server/index.ts`、`server/planner.ts`、`server/types.ts`、`server/validators.ts`、`scripts/api-smoke.ts` 和 `AGENTS.md` | 用户要求去掉“聊天即落地”的伪执行流，改成 AI 先给候选今日/本周方案，用户明确采用后再更新三餐、周计划、营养、购物、总览；同时库存页要能显示预扣减并支持手动/自动回写真实库存数量。 | 已通过 `npm run build`、`npm run build:server`、`MYSQL_PASSWORD=1234` 下的 `npm run test:api-contract`、`npm run test:api-smoke`、`npm run test:workspace-smoke`；UI 自动回归本轮尚未执行。 |
| 2026-05-05 | 已完成 | 调整 Playwright 浏览器复用模式：更新 `scripts/ui-regression.ts` 和 `AGENTS.md`，新增 `PLAYWRIGHT_CDP_URL`、`PLAYWRIGHT_EXTENSION_MODE`、`PLAYWRIGHT_USER_DATA_DIR`、`PLAYWRIGHT_HEADLESS` 说明与脚本支持 | 用户要求把 Playwright MCP 使用方式切到 extension 风格，复用当前 Chrome / Edge 登录 session，避免自动化登录时反复输入账号密码。目标是让仓库内 UI 自动化也支持连接现有浏览器会话，并把跨会话操作约定写清楚。 | 已通过 `npm run build`、`npm run build:server` 与 UTF-8 读取确认。 |
| 2026-05-05 | 已完成 | 根据页面评论把 `chat` 页 Conversation Studio Hero 从纯绿色渐变改为本地厨房蔬菜背景图：新增 `src/assets/chat-hero-kitchen.jpg`，更新 `src/app/App.module.css` 和 `AGENTS.md` | 用户希望把对话页顶部绿色背景替换成更符合“绿色健康蔬菜 / 厨房”语义的真实图片，同时保留标题和状态胶囊的可读性。 | 已通过 `npm run build`；已用 Playwright MCP 回归 `#/chat`，截图保存到 `smartmeal-chat-hero-photo-full.png`。 |
| 2026-05-05 | 已完成 | 重做 `overview` 骨架、`chat` 主次结构并统一视觉变量：更新 `src/styles/global.css`、`src/components/IconButton.module.css`、`src/app/App.tsx`、`src/app/App.module.css`、`src/features/chat/ChatPanel.module.css`、`src/features/meals/TodayMealsPanel.module.css`、`src/features/shopping/ShoppingListPanel.module.css`、`src/features/nutrition/NutritionPanel.module.css` 和 `AGENTS.md` | 用户要求先重做 `overview` 页面骨架与视觉变量，再重做 `chat` 页左主区和右摘要区，最后统一 `today / shopping / weekly` 的容器、按钮和状态色体系。目标是在不改业务链路的前提下，把页面从平均卡片布局推进到更强主次的健康编辑台视觉。 | 已通过 `npm run build`、`npm run build:server`；已用 Playwright MCP 回归 `#/overview` 与 `#/chat`，生成 `smartmeal-overview-redesign.png` 与 `smartmeal-chat-redesign.png`。 |
| 2026-05-05 | 已完成 | 继续压缩 chat 顶部标题、输入区和快捷按钮：更新 `src/features/chat/ChatPanel.tsx`、`src/features/chat/ChatPanel.module.css`，下调标题图标、说明文案、输入按钮和快捷按钮尺寸，并单独压低发送按钮高度 | 用户反馈前几轮“还是厚”，希望把对话页变得更扁更简洁。目标是继续压低视觉密度，同时保留原有信息结构。 | 待 `npm run build` 验证。 |
| 2026-05-05 | 已完成 | 再次收紧 chat 头部、输入条和快捷指令区：更新 `src/features/chat/ChatPanel.module.css`，进一步降低标题字号、图标尺寸、卡片 padding、输入高度和快捷按钮密度 | 用户通过页面评论要求把输入区、快捷指令区和标题区都“窄一点”，同时让 `AI 对话搭配页` 更简洁。目标是只做局部密度压缩，不改页面结构。 | 已通过 `npm run build`。 |
| 2026-05-05 | 已完成 | 稳定 `chat` 刷新定位：更新 `src/features/chat/ChatPanel.tsx`、`src/features/chat/ChatPanel.module.css`、`src/app/App.tsx`，把历史消息滚动改成 `useLayoutEffect` 受控定位，刷新/初始化阶段直接定位到底部，避免 `smooth` 滚动和浏览器锚点造成的来回晃动 | 用户反馈 `#/chat` 一刷新页面就动来动去，怀疑是对话历史定位问题。目标是刷新后直接停在最新聊天位置，不再出现可见滚动漂移。 | 已通过 `npm run build`。 |
| 2026-05-05 | 已完成 | 对齐 chat 页面左右栏高度：更新 `src/app/App.module.css`，将 `.chatPage` 从 `align-items: start` 调整为 `align-items: stretch`，让左侧聊天容器高度跟随右侧摘要列 | 用户反馈 chat 页面左侧比右侧短，要求左右对齐，目标是不改业务逻辑、只修正布局高度一致性。 | 已通过 `npm run build`。 |
| 2026-05-05 | 已完成 | 修复 AI 对话页布局与消息滚动：更新 `src/features/chat/ChatPanel.tsx`、`src/features/chat/ChatPanel.module.css`、`src/app/App.module.css`，调整聊天页两栏比例、压缩聊天头部和历史记录高度、把输入框放在历史记录下面且放大、把常用饮食指令压缩成输入框下方横向 chip 条、收紧右侧摘要卡片，并让消息列表在发送/生成后自动滚到底部 | 用户反馈 `http://localhost:5173/#/chat` 页面布局不合理、输入不好显示，并希望给 AI 发完消息后聊天记录自动跳到最下面；后续评论要求常用饮食指令更简洁更小，历史记录缩短，顺序固定为“历史记录 -> 输入框 -> 快捷指令”。 | 已通过 `npm run build`、`npm run build:server`；已重启 Vite 并用 Playwright 打开 `#/chat` 实测：无横向溢出，发送 `1+1?` 后消息区保持底部，页面包含 `1+1 = 2` 回复；在 `960x598` 视口下历史记录高度约 172px，输入框和常用饮食指令均可见且顺序正确，截图保存到 `output/playwright/chat-layout-fix.png`、`output/playwright/chat-compact-actions-960.png` 与 `output/playwright/chat-short-history-input-actions-960.png`。 |
| 2026-05-05 | 已完成 | 修复普通聊天被强制生成餐单：更新 `server/index.ts` 和 `server/ai/deepseek.ts`，新增服务端意图门控、普通 DeepSeek 问答路径和简单算术本地兜底 | 用户在 AI 对话页输入“你好 1+1？”时，后端仍按餐单生成处理并返回饮食建议，说明 `triggerPlanGeneration` 缺少服务端二次判断。目标是普通问答直接回答，不生成 meal plan / shopping list；只有饮食、库存、营养、餐单、购物等意图才生成结构化餐单。 | 已通过 `npm run build:server`、`npm run build`；已重启后端实测“你好 1+1？”返回 `1+1 = 2` 且 `mealPlan=null`；已用 Unicode 请求实测“生成一份清淡高蛋白晚餐”仍返回 `mealPlan` 且 `generationMeta.source=ai`。 |
| 2026-05-05 | 已完成 | DeepSeek key 持久化到 MySQL：新增 `server/migrations/002_app_settings.sql`，后端 `server/ai/deepseek.ts` 支持从 MySQL `app_settings.deepseek.api_key` 读取密钥，并对 DeepSeek 返回的 `suggestions/tags/insights` 做容错归一 | 用户要求 DeepSeek key 存入 MySQL 后端，确保本机后端重启后仍能生效，同时避免把密钥写入源码或文档明文。 | 已通过 `npm run db:migrate`、`npm run build:server`、`npm run build`；已写入本机 MySQL `app_settings`；已重启后端并实测对话生成返回 `generationMeta.source=ai`、`model=deepseek-v4-flash`、`promptVersion=2026-05-05.v2`；当前 MySQL、后端 `http://127.0.0.1:8787`、前端 `http://127.0.0.1:5173` 均已运行。 |
| 2026-05-05 | 进行中 | 稳定性收口：更新 `src/app/App.tsx`、`src/app/App.module.css`、`src/features/chat/ChatPanel.tsx`、`src/features/meals/TodayMealsPanel.tsx`、`src/features/inventory/InventoryPanel.tsx`、`src/features/shopping/ShoppingListPanel.tsx`、`server/utils.ts`、`server/planner.ts`、`server/ai/deepseek.ts`、`server/index.ts`、`scripts/workspace-smoke.ts`、`scripts/ui-regression.ts` 和 `src/types/smartmeal.ts` | 需要补齐前端错误态/加载态/空状态/retry/失效资源恢复，提高 AI 生成可信度，并在 MySQL 版本中加强 workspace 隔离验证。 | 已通过 `npm run build`、`npm run build:server`、`npm run db:migrate`、`npm run db:seed`、`npm run test:api-smoke`、`npm run test:api-contract`、`npm run test:workspace-smoke`。已启动真实 MySQL 后端和 Vite；`npm run test:ui-regression` 本轮执行超时，尚未完成 UI 运行态回归收口。 |
| 2026-05-05 | 已完成 | 后端持久化真正切到 MySQL：更新 `package.json` / `package-lock.json`、`server/db.ts`、`server/store.ts`、`server/migrations/001_init.sql`、`scripts/db-migrate.ts`、`scripts/db-seed-from-json.ts`、`README.md`、`docs/smartmeal-core-data-model.md`、`docs/smartmeal-mvp-dev-breakdown.md` 和 `AGENTS.md` | 需要把已确定的 MySQL 目标落实到真实运行时，移除旧数据库驱动、SQL 方言和文档残留，让 `server/data/store.json` 只作为 seed 输入，并保留 guest session / workspace 数据边界。 | 已通过 `npm run build`、`npm run build:server`、`npm run db:migrate`、`npm run db:seed`、`npm run test:api-smoke`、`npm run test:api-contract`、`npm run test:workspace-smoke`；实测环境为 MySQL 8.4.8，`MYSQL_USER=root`、`MYSQL_PASSWORD=1234`、`MYSQL_DATABASE=smartmeal`。 |
| 2026-05-04 | 已完成 | 移除各主页面顶部标题说明区：更新 `src/app/App.tsx`，删除 `overview / chat / today / inventory / weekly / nutrition / shopping` 的 `PageTitle` 调用及对应配置 | 需要响应评论要求，去掉重复的页面标题和说明文案，让页面首屏直接进入核心工作区，减少无效垂直空间。 | 已通过 `npx tsc -p tsconfig.app.json --noEmit`、`npx vite build`；已使用 Playwright 回归 `#/overview`、`#/weekly` 的 `960px` 视口截图确认标题区消失。 |
| 2026-05-04 | 已完成 | 调整 `AGENTS.md` 的数据库目标选型：把数据库方向改为 MySQL，并明确当时仓库代码仍有旧实现痕迹 | 用户确认数据库希望统一到 MySQL，需要先让跨会话文档反映新的目标选型，同时避免把未完成的代码切换误写成已完成状态。 | 已通过 UTF-8 读取确认。 |
| 2026-05-04 | 已完成 | 按页面评论修正 `chat / overview / weekly`：更新 `src/features/chat/ChatPanel.module.css`、`src/app/App.module.css`、`src/app/App.tsx`，压缩快捷操作区、为消息列表增加内部滚动、收紧 CTA 宽度并重排周计划偏好按钮 | 需要直接响应视觉评论，修复“聊天区越聊越长”“按钮过长过丑”“偏好按钮布局失衡”这几类可见问题，同时保持现有接口与状态逻辑不变。 | 已通过 `npx tsc -p tsconfig.app.json --noEmit`、`npx vite build`；已使用 Playwright 回归 `#/chat`、`#/overview`、`#/weekly` 的 `1260px` 视口截图。 |
| 2026-05-04 | 已完成 | 按用户要求把桌面端 UI 调整到接近浏览器 `90%` 缩放观感：更新 `src/styles/global.css` 与 `src/app/App.module.css`，统一压缩桌面端字号、页边距、导航和卡片尺寸 | 需要在不改交互结构和移动端断点的前提下，让当前工作台页面整体体量更轻、更接近用户提供的参考截图。 | 历史类型阻塞已在后续后端收口中解决；当前 `npm run build` 与 `npm run build:server` 均已通过。 |
| 2026-05-04 | 已完成 | 新增 DeepSeek AI 适配层：补充 `server/ai/deepseek.ts`、`server/ai/schemas.ts`，将日计划与周计划生成链路改为“DeepSeek 结构化输出 -> schema 校验 -> meal catalog 映射 -> 规则 fallback”；同时补齐最小 guest session / workspace-state 接口并移除残留 `openai` 依赖 | 用户决定模型改为 `deepseek-v4-flash`，需要把服务端生成边界从纯规则升级为可切真实模型、可校验、可降级的适配层，同时保证密钥只走环境变量，不进入仓库文件。 | 已通过 `npm uninstall openai`、`npm run build:server`、`npm run build`。 |
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
