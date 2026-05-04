# SmartMeal 核心数据模型

## 1. 文档目的

本文件定义 SmartMeal MVP 第一版的核心后端实体、字段和关系。目标不是一次性做成完整营养平台，而是先固化当前前端原型已经依赖的数据边界，减少后续接后端时的结构返工。

## 2. 建模原则

- 对前端展示保持兼容：优先覆盖 `src/types/smartmeal.ts` 已存在字段。
- 对后端计算保留规范化字段：尤其是数量、状态、来源关系和时间戳。
- 区分“实体数据”和“派生快照”：餐单、购物清单、营养摘要都属于带快照属性的业务结果。
- 所有表默认包含 `id`、`createdAt`、`updatedAt`。

## 3. 统一枚举

### 3.1 MealType

| 值 | 说明 |
| --- | --- |
| `breakfast` | 早餐 |
| `lunch` | 午餐 |
| `dinner` | 晚餐 |

### 3.2 InventoryCategory

| 值 | 说明 |
| --- | --- |
| `vegetable` | 蔬菜 |
| `meat_egg` | 肉蛋 |
| `staple` | 主食 |
| `seasoning` | 调味料 |
| `dairy` | 乳制品 |
| `fruit` | 水果 |
| `other` | 其他 |

### 3.3 InventoryStatus

| 值 | 说明 |
| --- | --- |
| `fresh` | 新鲜可用 |
| `expiring_soon` | 临期优先使用 |
| `expired` | 已过期，不参与推荐 |
| `need_buy` | 库存不足，建议采购 |

### 3.4 PlanningMode

| 值 | 说明 |
| --- | --- |
| `daily` | 今日执行 |
| `weekly` | 本周执行 |

### 3.5 WeeklyPlanDayStatus

| 值 | 说明 |
| --- | --- |
| `balanced` | 营养平衡 |
| `light` | 轻负担 |
| `needs_attention` | 需要人工关注 |

### 3.6 ConversationRole

| 值 | 说明 |
| --- | --- |
| `user` | 用户消息 |
| `assistant` | AI 消息 |

## 4. 核心实体

### 4.1 UserProfile

当前系统默认每个用户只有一份档案。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `name` | string | 是 | 昵称或展示名 |
| `dailyCalorieTarget` | number | 是 | 每日热量目标 |
| `proteinTarget` | number | 是 | 每日蛋白质目标，单位 g |
| `carbsTarget` | number | 是 | 每日碳水目标，单位 g |
| `fatTarget` | number | 是 | 每日脂肪目标，单位 g |
| `fiberTarget` | number | 是 | 每日膳食纤维目标，单位 g |
| `tastePreferences` | string[] | 是 | 长期口味偏好 |
| `dietaryRestrictions` | string[] | 是 | 饮食限制 |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

### 4.2 InventoryItem

库存项既要服务前端展示，也要支持后端单位归一和推荐逻辑。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `userId` | string | 是 | 归属用户 |
| `name` | string | 是 | 食材名称 |
| `category` | enum | 是 | `InventoryCategory` |
| `quantity` | string | 是 | 展示用数量，例如 `6个` |
| `quantityValue` | number | 否 | 规范化数值，便于计算 |
| `quantityUnit` | string | 否 | 规范化单位，例如 `piece`、`g` |
| `expireDate` | date | 否 | 过期日期 |
| `status` | enum | 是 | `InventoryStatus` |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

建议索引：

- `(userId, status)`
- `(userId, category)`
- `(userId, expireDate)`

### 4.3 NutritionFacts

`NutritionFacts` 不是独立主表，作为嵌入式值对象复用于餐单、营养汇总和统计快照。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `calories` | number | 是 | 热量，单位 kcal |
| `protein` | number | 是 | 蛋白质，单位 g |
| `carbs` | number | 是 | 碳水，单位 g |
| `fat` | number | 是 | 脂肪，单位 g |
| `fiber` | number | 是 | 膳食纤维，单位 g |

### 4.4 MealRecommendation

单餐推荐是餐单和周计划中的核心明细对象。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `mealType` | enum | 是 | `MealType` |
| `title` | string | 是 | 菜品名 |
| `description` | string | 是 | 一句话说明 |
| `imageUrl` | string | 是 | 图片地址或占位图地址 |
| `cookTimeMinutes` | number | 是 | 烹饪时间 |
| `nutrition` | `NutritionFacts` | 是 | 营养信息 |
| `ingredients` | `MealIngredient[]` | 是 | 食材明细 |
| `steps` | string[] | 是 | 做法步骤 |
| `aiTip` | string | 是 | AI 针对该餐的建议 |

### 4.5 MealIngredient

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 食材名称 |
| `amount` | string | 是 | 展示用数量 |
| `fromInventory` | boolean | 是 | 是否来自库存 |
| `optional` | boolean | 是 | 是否可选食材 |

### 4.6 MealPlan

`MealPlan` 表示一次“今日三餐”生成结果，是 AI 输出、营养计算和购物缺口的聚合快照。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `userId` | string | 是 | 归属用户 |
| `conversationId` | string | 否 | 来源会话 |
| `mode` | enum | 是 | 固定为 `daily`，与前端 `PlanningMode` 对齐 |
| `sourceMessage` | string | 是 | 触发生成的用户需求 |
| `reply` | string | 是 | AI 回复摘要 |
| `meals` | `MealRecommendation[]` | 是 | 三餐明细 |
| `nutritionSummary` | `NutritionSummary` | 是 | 汇总结果 |
| `shoppingListSnapshot` | `ShoppingListItem[]` | 是 | 本次生成时的购物缺口快照 |
| `inventoryUsage` | string[] | 是 | 实际优先使用的库存食材 |
| `suggestions` | string[] | 是 | 全局建议 |
| `status` | string | 是 | 推荐值：`draft`、`confirmed`、`archived` |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

说明：

- `shoppingListSnapshot` 是结果快照，不等于最终购物清单实体。
- 单餐替换会更新整份 `MealPlan` 的 `updatedAt` 与 `nutritionSummary`。

### 4.7 NutritionSummary

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `actual` | `NutritionFacts` | 是 | 当前计划实际摄入 |
| `target` | `NutritionFacts` | 是 | 用户目标 |
| `deltas` | `NutritionFacts` | 是 | `actual - target` |
| `score` | number | 是 | 达标评分，建议 0-100 |

### 4.8 WeeklyPlan

`WeeklyPlan` 是一周计划的聚合根，包含每日餐单和洞察摘要。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `userId` | string | 是 | 归属用户 |
| `conversationId` | string | 否 | 来源会话 |
| `title` | string | 是 | 周计划标题 |
| `description` | string | 是 | 周计划描述 |
| `tags` | string[] | 是 | 偏好标签 |
| `startDate` | date | 是 | 周计划起始日 |
| `days` | `WeeklyPlanDay[]` | 是 | 7 天计划 |
| `insights` | string[] | 是 | 周级 AI 洞察 |
| `adopted` | boolean | 是 | 是否已确认采用 |
| `adoptedAt` | datetime | 否 | 采用时间 |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

### 4.9 WeeklyPlanDay

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | date | 是 | 标准日期，后端排序依据 |
| `day` | string | 是 | 展示文案，例如 `周一` |
| `meals` | `MealRecommendation[]` | 是 | 当日完整三餐详情 |
| `breakfast` | string | 是 | 早餐标题冗余字段，兼容当前前端 |
| `lunch` | string | 是 | 午餐标题冗余字段 |
| `dinner` | string | 是 | 晚餐标题冗余字段 |
| `calories` | number | 是 | 当日预估热量 |
| `status` | enum | 是 | `balanced` / `light` / `needs_attention` |
| `note` | string | 是 | 当日说明 |
| `inventoryFocus` | string[] | 是 | 优先使用的库存食材 |
| `shoppingGap` | string[] | 是 | 仍缺少的食材 |

### 4.10 ShoppingList

购物清单是可持久化的执行结果，可来源于今日计划或周计划。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `userId` | string | 是 | 归属用户 |
| `sourceType` | string | 是 | `meal_plan` 或 `weekly_plan` |
| `sourceId` | string | 是 | 对应计划 ID |
| `items` | `ShoppingListItem[]` | 是 | 购物项 |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

### 4.11 ShoppingListItem

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `name` | string | 是 | 食材名称 |
| `category` | enum | 是 | `InventoryCategory` |
| `amount` | string | 是 | 采购数量说明 |
| `checked` | boolean | 是 | 是否已购买 |
| `reason` | string | 是 | 采购原因 |
| `stableKey` | string | 否 | 同名项跨重算保留勾选状态的稳定键 |

说明：

- `stableKey` 对应当前前端 `DerivedShoppingListItem.stableKey` 的设计诉求。
- 后端若统一生成 `stableKey`，可减少重算后的勾选丢失。

### 4.12 Conversation

会话实体用于承载 AI 交互上下文。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `userId` | string | 是 | 归属用户 |
| `title` | string | 是 | 会话标题 |
| `lastMessageAt` | datetime | 是 | 最近消息时间 |
| `createdAt` | datetime | 是 | 创建时间 |
| `updatedAt` | datetime | 是 | 更新时间 |

### 4.13 ConversationMessage

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 主键 |
| `conversationId` | string | 是 | 所属会话 |
| `role` | enum | 是 | `user` 或 `assistant` |
| `content` | string | 是 | 消息内容 |
| `mealPlanId` | string | 否 | 如本条消息触发今日计划，则记录引用 |
| `weeklyPlanId` | string | 否 | 如本条消息触发周计划，则记录引用 |
| `createdAt` | datetime | 是 | 创建时间 |

说明：

- 不建议在消息表直接冗余整份结构化结果，优先保存关联计划 ID。
- 若需要审计 AI 原始 JSON，可增加单独字段 `rawStructuredPayload`，但 MVP 可先不落库。

## 5. 实体关系

```text
UserProfile 1 --- n InventoryItem
UserProfile 1 --- n MealPlan
UserProfile 1 --- n WeeklyPlan
UserProfile 1 --- n ShoppingList
UserProfile 1 --- n Conversation

Conversation 1 --- n ConversationMessage
ConversationMessage 0..1 --- 1 MealPlan
ConversationMessage 0..1 --- 1 WeeklyPlan

MealPlan 1 --- 0..1 ShoppingList
WeeklyPlan 1 --- 0..1 ShoppingList
WeeklyPlan 1 --- n WeeklyPlanDay
```

## 6. 与当前前端类型的映射

| 前端类型 | 后端实体/值对象 | 说明 |
| --- | --- | --- |
| `UserProfile` | `UserProfile` | 直接一一对应 |
| `InventoryItem` | `InventoryItem` | 后端新增 `userId`、`quantityValue`、`quantityUnit`、时间戳 |
| `MealRecommendation` | `MealRecommendation` | 直接复用 |
| `MealPlanResult` | `MealPlan` 聚合输出 DTO | 前端拿到的是聚合视图，不要求逐表拼装 |
| `WeeklyPlanDay` | `WeeklyPlanDay` | 后端新增 `date`，其余兼容 |
| `ShoppingListItem` | `ShoppingListItem` | 后端建议补 `stableKey` |
| `ChatMessage` | `ConversationMessage` DTO | 前端可继续使用 `structuredResult` 字段，后端内部用计划引用维护 |

## 7. 建议数据库落地方式

MVP 推荐使用关系型数据库，优先 `PostgreSQL` 或 `SQLite` 起步。

建议：

- `user_profiles`
- `inventory_items`
- `meal_plans`
- `weekly_plans`
- `shopping_lists`
- `conversations`
- `conversation_messages`

JSON 字段适合先用于：

- `meals`
- `nutritionSummary`
- `shoppingListSnapshot`
- `days`
- `insights`

原因：

- MVP 先保证结构稳定和开发速度。
- 当前前端已经按聚合对象消费，不需要第一版就把每个 meal、ingredient 拆成高度规范化多表。

## 8. 第一版不纳入核心模型的内容

- 家庭成员与多用户共享库存
- 菜谱收藏
- 冰箱图片识别结果
- 下载/打印任务
- 长期营养日报、周报统计仓库
- 食材级精细营养数据库

## 9. 推荐后续实现顺序

1. 先落 `UserProfile`、`InventoryItem`、`Conversation`、`ConversationMessage`
2. 再落 `MealPlan` 和 `ShoppingList`
3. 最后落 `WeeklyPlan`

原因：

- 今日三餐闭环是当前前端主路径。
- 周计划可以复用日计划与购物清单的聚合结构。
