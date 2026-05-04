# SmartMeal 助手 MVP v2 原型与开发拆解

## 1. MVP 定位

SmartMeal 助手 MVP 的首版目标不是一次性完成完整家庭饮食系统，而是验证一个核心闭环：

用户通过 AI 对话表达饮食需求，系统结合基础库存和营养目标，生成今日三餐、营养反馈和购物清单。

首版需要让用户感受到三个明确价值：

- 不知道吃什么时，可以直接问 AI。
- 推荐结果不只是菜名，还能看到热量、蛋白质等关键营养信息。
- 推荐菜单能联动库存和购物清单，减少重复购买和浪费。

## 2. MVP 功能范围

### P0 必须实现

1. AI 对话搭配页
   
   - 用户输入自然语言饮食需求。
   - 系统返回今日三餐建议、营养摘要、库存使用建议。
   - 支持快捷指令：减少油脂、提升蛋白质、控制热量、多用库存食材、生成购物清单。

2. 今日三餐推荐
   
   - 早餐、午餐、晚餐卡片。
   - 展示菜名、描述、烹饪时间、热量、蛋白质、碳水、脂肪、膳食纤维。
   - 支持展开详情。
   - 支持“换一个”和“查看做法”。

3. 基础库存管理
   
   - 手动添加食材。
   - 展示食材名称、分类、数量、过期日期、状态。
   - 标记临期食材。
   - AI 推荐优先使用临期或库存充足食材。

4. 营养概览
   
   - 展示目标值和推荐餐单估算值。
   - 指标包括热量、蛋白质、碳水、脂肪、膳食纤维、蔬菜摄入。
   - 给出 2 到 3 条 AI 微调建议。

5. 购物清单
   
   - 根据今日三餐生成缺少食材。
   - 按蔬菜、肉蛋、主食、调味料、乳制品分类。
   - 支持勾选已购买。

### P1 延后实现

- AI 每周计划页。
- 每周营养统计。
- 购物清单下载和打印。
- 库存照片上传入口。
- 快捷偏好设置。

### P2 后续增强

- 冰箱照片 AI 识别。
- 多用户或家庭成员营养目标。
- 长期饮食记录。
- 菜谱收藏。
- 移动端完整适配。

## 3. 首页原型结构

首版建议使用桌面端三栏布局。

### 左栏：AI 对话区

用途：承载产品核心入口。

模块：

- 对话消息列表。
- 用户输入框。
- 发送按钮。
- 智能快捷操作按钮。

默认示例输入：

```text
今天想吃清淡一点，多用家里的鸡蛋和番茄，晚餐热量低一些。
```

AI 返回内容需要结构化展示：

- 推荐思路。
- 今日三餐摘要。
- 已优先使用库存食材。
- 营养变化提示。
- 可执行下一步。

### 中栏：今日三餐推荐

用途：展示 AI 推荐结果，是用户做决策的主区域。

模块：

- 早餐卡片。
- 午餐卡片。
- 晚餐卡片。
- 今日营养进度。

每餐卡片字段：

- mealType：早餐 / 午餐 / 晚餐。
- title：菜品名称。
- imageUrl：菜品图片。
- description：一句话描述。
- cookTimeMinutes：烹饪时间。
- calories：热量。
- protein：蛋白质。
- carbs：碳水。
- fat：脂肪。
- fiber：膳食纤维。
- aiTip：AI 建议。
- ingredients：食材列表。
- steps：做法步骤。

### 右栏：库存、购物清单和营养建议

用途：让用户看到计划如何落到执行。

模块：

- 库存概览。
- 临期提醒。
- 购物清单摘要。
- AI 个性化建议。

库存概览指标：

- totalItems：总食材数。
- expiringSoonCount：临期数。
- needBuyCount：需采购数。

购物清单需要能从今日三餐自动生成，并排除库存中已有且数量充足的食材。

## 4. 页面路由建议

首版可以先做单页应用，使用页面内 Tab。

```text
/              SmartMeal 首页
/chat          AI 对话搭配
/today         今日三餐
/inventory     家庭库存
/shopping-list 购物清单
```

若开发资源有限，可以只实现 `/`，所有模块在同一页内分区展示。

## 5. 核心用户流程

### 流程 A：生成今日三餐

1. 用户打开首页。
2. 用户在 AI 输入框输入饮食需求。
3. 系统读取用户营养目标和库存。
4. AI 生成三餐推荐。
5. 页面刷新今日三餐卡片、营养概览、购物清单。

验收结果：

- 用户不需要进入多个页面即可得到今天吃什么。
- 三餐推荐必须包含营养数据。
- 购物清单必须同步更新。

### 流程 B：优先使用库存

1. 用户添加库存食材。
2. 用户输入“多用库存食材”。
3. AI 推荐结果中优先出现库存食材。
4. 系统标记哪些食材来自库存。

验收结果：

- 推荐说明中能看到“已使用库存：鸡蛋、番茄”等提示。
- 购物清单不会重复加入库存充足食材。

### 流程 C：调整营养目标

1. 用户点击“提升蛋白质”或“控制热量”。
2. 系统重新生成或局部调整餐单。
3. 营养概览展示调整前后的差异。

验收结果：

- 用户能看到具体变化，例如蛋白质 +18g、热量 -120kcal。
- AI 建议不只给结论，还要说明调整原因。

## 6. 数据模型草案

### UserProfile

```ts
type UserProfile = {
  id: string;
  name: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  tastePreferences: string[];
  dietaryRestrictions: string[];
};
```

### InventoryItem

```ts
type InventoryItem = {
  id: string;
  name: string;
  category: "vegetable" | "meat_egg" | "staple" | "seasoning" | "dairy" | "fruit" | "other";
  quantity: string;
  expireDate?: string;
  status: "fresh" | "expiring_soon" | "expired" | "need_buy";
};
```

### MealRecommendation

```ts
type MealRecommendation = {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner";
  title: string;
  description: string;
  imageUrl: string;
  cookTimeMinutes: number;
  nutrition: NutritionFacts;
  ingredients: MealIngredient[];
  steps: string[];
  aiTip: string;
};
```

### NutritionFacts

```ts
type NutritionFacts = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};
```

### MealIngredient

```ts
type MealIngredient = {
  name: string;
  amount: string;
  fromInventory: boolean;
  optional: boolean;
};
```

### ShoppingListItem

```ts
type ShoppingListItem = {
  id: string;
  name: string;
  category: InventoryItem["category"];
  amount: string;
  checked: boolean;
  reason: string;
};
```

### ChatMessage

```ts
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  structuredResult?: MealPlanResult;
};
```

### MealPlanResult

```ts
type MealPlanResult = {
  meals: MealRecommendation[];
  nutritionSummary: NutritionSummary;
  shoppingList: ShoppingListItem[];
  inventoryUsage: string[];
  suggestions: string[];
};
```

### NutritionSummary

```ts
type NutritionSummary = {
  actual: NutritionFacts;
  target: NutritionFacts;
  deltas: NutritionFacts;
  score: number;
};
```

## 7. API 草案

### POST /api/chat/meal-plan

用途：根据自然语言需求生成餐单。

请求：

```json
{
  "message": "今天想吃清淡，多用鸡蛋和番茄，晚餐热量低一些",
  "profileId": "user_001",
  "inventoryIds": ["inv_001", "inv_002"],
  "mode": "today"
}
```

响应：

```json
{
  "reply": "我已优先使用鸡蛋和番茄，并将晚餐热量控制在较低水平。",
  "result": {
    "meals": [],
    "nutritionSummary": {},
    "shoppingList": [],
    "inventoryUsage": ["鸡蛋", "番茄"],
    "suggestions": ["午餐蛋白质充足，晚餐建议增加一份绿叶菜。"]
  }
}
```

### GET /api/inventory

用途：获取库存列表。

### POST /api/inventory

用途：新增库存食材。

### PATCH /api/inventory/:id

用途：更新库存数量、状态或过期日期。

### DELETE /api/inventory/:id

用途：删除库存食材。

### POST /api/shopping-list/generate

用途：根据餐单和库存生成购物清单。

### GET /api/profile

用途：获取用户营养目标和偏好。

### PATCH /api/profile

用途：更新营养目标和偏好。

## 8. AI 生成逻辑 MVP 规则

首版不需要复杂算法，可以先使用规则 + LLM 结构化输出。

推荐逻辑：

1. 解析用户输入中的偏好、限制、目标和指定食材。
2. 合并用户长期偏好和今日临时需求。
3. 优先选择库存中未过期、临期或数量充足的食材。
4. 生成早餐、午餐、晚餐。
5. 计算估算营养值。
6. 对比目标值，输出差异和建议。
7. 生成缺口食材购物清单。

AI 输出必须约束为结构化 JSON，前端只渲染结构化结果，不能依赖大段自然语言解析。

## 9. 前端组件拆解

### Layout

- AppShell
- HeaderNav
- ThreeColumnDashboard

### AI 对话

- ChatPanel
- ChatMessageList
- ChatBubble
- QuickActionBar
- ChatInput

### 今日三餐

- TodayMealsPanel
- MealCard
- MealNutritionBadges
- MealDetailCollapse
- NutritionProgress

### 库存

- InventorySummary
- InventoryTable
- InventoryForm
- ExpiringAlert

### 购物清单

- ShoppingListPanel
- ShoppingListGroup
- ShoppingListItemRow

### 建议反馈

- AiSuggestionPanel
- NutritionDeltaCard

## 10. 视觉与交互规范

主色：

- primary：#11823B
- primaryDark：#086A2E
- success：#1F9D55
- warning：#F59E0B
- danger：#EF4444
- background：#F7FAF8
- card：#FFFFFF
- border：#DDE7DF
- textPrimary：#17211B
- textSecondary：#66736A

交互要求：

- 页面首次加载时展示示例餐单和示例库存，避免空白页。
- 快捷操作点击后，自动把指令追加到对话上下文。
- “换一个”只替换当前餐，不刷新全部餐单。
- 展开详情只影响当前卡片，不造成页面大幅跳动。
- 购物清单勾选状态需要即时反馈。

## 11. 开发里程碑

### Milestone 1：静态高保真原型

目标：完成桌面端单页视觉原型。

任务：

- 搭建 React 或 Vue 前端项目。
- 实现首页三栏布局。
- 使用 mock 数据渲染 AI 对话、三餐、库存、购物清单。
- 完成基础响应式，保证 1440px 桌面端体验。

验收：

- 页面视觉接近 PRD 示意图。
- 所有核心模块可见。
- 无明显文字溢出和布局重叠。

### Milestone 2：前端交互闭环

目标：在无真实后端情况下完成用户可操作闭环。

任务：

- 实现对话输入和 mock AI 回复。
- 实现快捷操作。
- 实现餐卡展开、换一个。
- 实现库存手动新增。
- 实现购物清单勾选。

验收：

- 用户输入后页面能生成新的推荐状态。
- 库存变化能影响购物清单 mock 结果。
- 三餐卡片和营养概览同步更新。

### Milestone 3：后端 API 与数据持久化

目标：替换前端 mock 数据。

任务：

- 建立 Node.js 或 Python 后端。
- 实现 profile、inventory、meal-plan、shopping-list API。
- 使用 MySQL、MongoDB 或 SQLite 存储 MVP 数据。
- 接入 AI 模型，要求输出结构化 JSON。

验收：

- 刷新页面后用户数据不丢失。
- API 返回结构与前端类型一致。
- AI 生成失败时有降级结果和错误提示。

### Milestone 4：AI 推荐质量优化

目标：提升推荐可信度和稳定性。

任务：

- 增加营养数据校验。
- 增加食材分类和单位归一。
- 增加提示词版本管理。
- 增加推荐结果 JSON schema 校验。

验收：

- AI 返回缺字段时系统能修复或降级。
- 推荐结果不会出现明显不合理组合。
- 购物清单不会重复加入库存充足食材。

## 12. 验收标准

首版 MVP 完成标准：

- 用户可以通过 AI 输入生成今日三餐。
- 每餐都有营养数据和 AI 建议。
- 用户可以管理基础库存。
- 系统能根据餐单生成购物清单。
- 系统能展示目标值和实际推荐值差异。
- 核心页面在桌面端布局清晰、可读、可操作。

暂不验收：

- 图像识别准确率。
- 每周计划完整算法。
- 多端适配。
- 长期历史数据分析。

## 13. 推荐技术栈

若目标是快速做出可演示 MVP：

- 前端：React + TypeScript + Vite
- 样式：Tailwind CSS 或 CSS Modules
- 图标：lucide-react
- 后端：Node.js + Express 或 Fastify
- 数据库：SQLite 起步，后续迁移 MySQL / PostgreSQL
- AI：结构化 JSON 输出 + schema 校验

首版可以先使用本地 mock 数据完成视觉和交互，再接后端。

## 14. 下一步开发任务

建议下一步直接进入前端原型：

1. 初始化 React + TypeScript + Vite 项目。
2. 建立 mock 数据文件。
3. 实现 `AppShell` 和三栏首页。
4. 实现 AI 对话区和今日三餐卡片。
5. 实现库存摘要和购物清单。
6. 用浏览器截图验证 1440px 桌面布局。
