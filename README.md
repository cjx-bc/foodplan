# SmartMeal 助手 MVP

SmartMeal 是一个面向家庭饮食管理场景的 Web 端 MVP 原型。项目围绕一个可演示闭环展开：用户通过 AI 对话表达饮食需求，系统结合库存和营养目标，生成今日三餐、营养反馈、每周计划和购物清单。

当前仓库已经包含前端原型和一套 MVP 阶段后端服务。前端继续负责信息架构和演示流程；后端已提供 `health`、`profile`、`inventory-items`、`meal-plans`、`weekly-plans`、`shopping-lists`、`conversations` API，已切到 MySQL 存储，并补齐 guest session、workspace 归属、迁移脚本、seed 脚本和 DeepSeek 结构化生成适配层。

![SmartMeal MVP 示意图](docs/mvp.png)

## 项目目标

- 用 AI 对话作为饮食规划入口，降低“今天吃什么”的决策成本
- 把三餐推荐、营养反馈、库存使用和购物清单串成一个连续工作流
- 用可操作的前端原型验证产品方向，再逐步接入后端和真实 AI 能力

## 当前功能

### 已完成

- 总览页：集中展示今日状态、关键指标、三餐预览和 AI 摘要
- AI 对话页：支持输入、快捷操作、mock 回复和执行结果工作区
- 今日三餐：支持查看早餐、午餐、晚餐，展开详情和单餐替换
- 营养概览：根据当前推荐结果计算热量、蛋白质、碳水、脂肪和膳食纤维
- 库存管理：支持手动新增库存、临期状态展示和库存概览
- 每周计划：支持偏好切换、生成本周计划、单日微调和确认采用
- 购物清单：按分类展示采购项，并支持勾选已购买
- 后端主链路：已提供 `health`、`auth/guest`、`session`、`workspace-state`、`profile`、`inventory-items`、`meal-plans`、`weekly-plans`、`shopping-lists`、`conversations` API
- 数据持久化：已提供 MySQL migration、基于 `server/data/store.json` 的 seed 导入脚本，以及 guest session -> workspace -> resources 的隔离边界
- 自动化脚本：已提供 `api-smoke`、`api-contract`、`workspace-smoke`、`ui-regression` 四类脚本入口

### 暂未实现

- 购物清单下载或打印
- 库存图片识别
- 更细的营养可信度规则与异常样本分析面板

## 产品范围

当前原型覆盖的核心页面：

- `overview` 总览
- `chat` AI 对话
- `today` 今日三餐
- `inventory` 家庭库存
- `weekly` 每周计划
- `nutrition` 营养统计
- `shopping` 购物清单

页面切换基于 `src/app/App.tsx` 内的 hash 路由状态实现，没有引入 React Router。

## 技术栈

| 类型 | 选型 |
| --- | --- |
| 构建工具 | Vite 7 |
| 前端框架 | React 19 |
| 语言 | TypeScript 5 |
| 样式 | CSS Modules + `src/styles/global.css` |
| 图标 | lucide-react |
| 包管理 | npm |
| 后端运行时 | Node.js HTTP + TypeScript |
| 数据库 | MySQL 8 |
| AI 适配 | DeepSeek `deepseek-v4-flash` + AJV schema 校验 |

## 快速开始

### 1. 安装依赖

```powershell
npm install
```

### 2. 启动开发环境

```powershell
npm run dev
```

默认使用 `vite --host 0.0.0.0` 启动。

### 3. 生产构建

```powershell
npm run build
```

### 4. 预览构建产物

```powershell
npm run preview
```

### 5. 启动后端开发服务

```powershell
npm run dev:server
```

默认监听 `http://localhost:8787`。

### 6. 初始化数据库

先准备 MySQL 连接配置。后端优先读取 `DATABASE_URL`，也支持 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_PASSWORD`、`MYSQL_DATABASE`。本地示例：

```powershell
$env:MYSQL_HOST="127.0.0.1"
$env:MYSQL_PORT="3306"
$env:MYSQL_USER="root"
$env:MYSQL_PASSWORD="1234"
$env:MYSQL_DATABASE="smartmeal"
```

```powershell
npm run db:migrate
npm run db:seed
```

### 7. 运行回归脚本

```powershell
npm run test:api-smoke
npm run test:api-contract
npm run test:workspace-smoke
```

## 目录结构

```text
.
├── AGENTS.md
├── docs
├── scripts
├── server
├── artifacts
├── src
│   ├── app
│   ├── components
│   ├── data
│   ├── features
│   ├── styles
│   ├── types
│   └── utils
├── package.json
└── vite.config.ts
```

## 核心业务模块

项目当前围绕这些领域对象组织，并按 `session -> workspace -> user-owned resources` 管理归属：

- `UserProfile`：营养目标、口味偏好、饮食限制
- `InventoryItem`：库存食材、数量、过期日期和状态
- `MealRecommendation`：单餐推荐，包含营养、食材、做法和 AI 提示
- `NutritionSummary`：推荐结果与目标值的差异和评分
- `ShoppingListItem`：购物项、分类、购买原因和完成状态
- `WeeklyPlanDay`：每周计划单日数据

核心类型定义位于 `src/types/smartmeal.ts`。

## 设计原则

- 当前只做 Web 端工作台体验，不按移动 App 信息架构设计
- 中文文案保持短、清楚、可操作
- 视觉方向偏“温和健康工具”，绿色用于主操作和正向状态
- 模块以演示闭环优先，不预设后端或真实 AI 已经存在

## 文档参考

`docs` 目录包含产品和开发拆解资料：

- `docs/prd.txt`：产品需求文档
- `docs/smartmeal-mvp-dev-breakdown.md`：MVP 范围、数据模型和 API 草案
- `docs/smartmeal-mvp-task-list.md`：前后端与 QA 任务拆分
- `docs/smartmeal-backend-api-contract.md`：正式后端 API 合约
- `docs/smartmeal-core-data-model.md`：正式核心数据模型
- `docs/mvp.png`：原型示意图

## 当前状态

| 范围 | 进度 | 说明 |
| --- | ---: | --- |
| 前端 MVP 演示闭环 | 100% | 总览、对话、三餐、库存、营养、购物清单和每周计划已统一到真实后端资源，刷新恢复走 session + workspace-state 回拉 |
| 整体 MVP | 96% | 后端 API、weekly-plan/adopt、DeepSeek 结构化生成、MySQL 存储、guest workspace 边界和关键回归脚本已落地；仍缺更细的营养可信度和完整 UI 自动验收环境 |

## 下一步

1. 把 `chat / today / shopping / weekly` 的真实试用流接到稳定 MySQL 环境，并补正式部署配置
2. 继续补营养可信度：食材单位归一扩展到餐食食材、推荐合理性规则和异常样本分析
3. 跑通 `test:api-smoke / test:api-contract / test:workspace-smoke / test:ui-regression` 的持续集成环境
4. 再往后补用户注册态和非 guest workspace 的认证联调能力

## 验证说明

当前仓库没有 `lint` 脚本。代码改动后的最低验证方式：

```powershell
npm run build
npm run build:server
```

只修改文档时，至少用 UTF-8 读取确认内容正常。
