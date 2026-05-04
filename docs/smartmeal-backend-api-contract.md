# SmartMeal 后端 API 合约

## 1. 文档目的

本文件用于冻结 SmartMeal MVP 第一版后端接口边界，服务当前 Web 前端原型，并为后续 Node.js / Python 服务实现提供统一契约。

设计目标：

- 保持与当前前端领域类型 `src/types/smartmeal.ts` 一致。
- 让“用户档案 -> 库存 -> 餐单 -> 周计划 -> 购物清单 -> 对话记录”形成可持续扩展的数据闭环。
- 在 MVP 阶段优先保证接口稳定和结构清晰，不提前引入复杂多租户、支付或家庭协作模型。

## 2. 基础约定

### 2.1 基础信息

| 项目 | 约定 |
| --- | --- |
| Base URL | `/api/v1` |
| 数据格式 | `application/json; charset=utf-8` |
| 时间格式 | ISO 8601 UTC，例如 `2026-05-04T09:30:00Z` |
| ID | 服务端生成的字符串 ID，推荐 `ulid` 或 `uuid` |
| 数字单位 | 营养统一使用 `kcal` / `g`；时间统一使用分钟 |
| 当前用户 | MVP 默认单用户；所有资源默认归属“当前登录用户” |

### 2.2 认证边界

- MVP 联调阶段可先由服务端注入固定测试用户。
- 正式实现时统一升级为 `Authorization: Bearer <token>`。
- 前端不直接传 `userId` 作为资源归属依据，避免后续接入认证时返工。

### 2.3 响应包裹格式

成功响应：

```json
{
  "data": {}
}
```

列表响应：

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

错误响应：

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      {
        "field": "message",
        "message": "Message is required"
      }
    ],
    "requestId": "01HW..."
  }
}
```

### 2.4 通用错误码

| HTTP 状态 | `error.code` | 说明 |
| --- | --- | --- |
| `400` | `invalid_json` | JSON 结构不合法 |
| `401` | `unauthorized` | 未登录或 token 无效 |
| `403` | `forbidden` | 无权限访问资源 |
| `404` | `not_found` | 资源不存在 |
| `409` | `conflict` | 资源状态冲突 |
| `422` | `validation_error` | 字段校验失败 |
| `429` | `rate_limit_exceeded` | 请求过快 |
| `500` | `internal_error` | 服务异常 |
| `502` | `ai_provider_error` | AI 上游失败 |

## 3. 资源总览

| 资源 | 作用 |
| --- | --- |
| `profile` | 保存用户营养目标、偏好和限制 |
| `inventory-items` | 保存库存食材和状态 |
| `meal-plans` | 保存单日三餐计划与生成结果 |
| `weekly-plans` | 保存一周计划、每日计划和确认状态 |
| `shopping-lists` | 保存按计划推导的购物清单 |
| `conversations` | 保存会话和消息历史 |

## 4. Profile API

### 4.1 获取当前用户档案

`GET /api/v1/profile`

响应：

```json
{
  "data": {
    "id": "profile_01",
    "name": "小陈",
    "dailyCalorieTarget": 1650,
    "proteinTarget": 105,
    "carbsTarget": 180,
    "fatTarget": 55,
    "fiberTarget": 28,
    "tastePreferences": ["清淡", "番茄", "鸡蛋料理"],
    "dietaryRestrictions": ["少油"],
    "createdAt": "2026-05-04T09:00:00Z",
    "updatedAt": "2026-05-04T09:00:00Z"
  }
}
```

### 4.2 更新当前用户档案

`PATCH /api/v1/profile`

请求：

```json
{
  "name": "小陈",
  "dailyCalorieTarget": 1700,
  "proteinTarget": 110,
  "carbsTarget": 185,
  "fatTarget": 52,
  "fiberTarget": 30,
  "tastePreferences": ["清淡", "高蛋白"],
  "dietaryRestrictions": ["少油", "控糖"]
}
```

规则：

- 支持部分更新。
- 任一目标值必须为正数。
- `tastePreferences`、`dietaryRestrictions` 允许为空数组，但不允许 `null`。

## 5. Inventory API

### 5.1 获取库存列表

`GET /api/v1/inventory-items?status=fresh,expiring_soon&category=vegetable&sort=expireDate`

响应：

```json
{
  "data": [
    {
      "id": "inv_01",
      "name": "番茄",
      "category": "vegetable",
      "quantity": "4个",
      "quantityValue": 4,
      "quantityUnit": "piece",
      "expireDate": "2026-05-06",
      "status": "expiring_soon",
      "createdAt": "2026-05-04T09:00:00Z",
      "updatedAt": "2026-05-04T09:00:00Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

约定：

- `quantity` 保持与当前前端兼容。
- `quantityValue`、`quantityUnit` 是后端规范化字段，便于后续做库存扣减和购物缺口计算。
- `status` 可由服务端根据 `expireDate` 自动计算，也可在兜底逻辑中显式返回。

### 5.2 新增库存

`POST /api/v1/inventory-items`

请求：

```json
{
  "name": "鸡蛋",
  "category": "meat_egg",
  "quantity": "8个",
  "quantityValue": 8,
  "quantityUnit": "piece",
  "expireDate": "2026-05-09"
}
```

响应：`201 Created`

### 5.3 更新库存

`PATCH /api/v1/inventory-items/{inventoryItemId}`

允许更新：

- `name`
- `category`
- `quantity`
- `quantityValue`
- `quantityUnit`
- `expireDate`

### 5.4 删除库存

`DELETE /api/v1/inventory-items/{inventoryItemId}`

响应：`204 No Content`

## 6. Meal Plan API

### 6.1 生成今日三餐计划

`POST /api/v1/meal-plans`

请求：

```json
{
  "mode": "daily",
  "message": "今天想吃清淡一点，多用家里的鸡蛋和番茄，晚餐热量低一些。",
  "conversationId": "conv_01",
  "preferences": {
    "prioritizeInventory": true,
    "maxDinnerCalories": 450,
    "focus": ["light", "high_protein"]
  }
}
```

响应：

```json
{
  "data": {
    "id": "plan_01",
    "mode": "daily",
    "reply": "我优先使用了鸡蛋和番茄，并把晚餐控制在较低热量区间。",
    "meals": [
      {
        "id": "meal_01",
        "mealType": "breakfast",
        "title": "番茄鸡蛋燕麦碗",
        "description": "温热、易做、适合轻负担早餐。",
        "imageUrl": "https://example.com/meal.jpg",
        "cookTimeMinutes": 12,
        "nutrition": {
          "calories": 360,
          "protein": 24,
          "carbs": 32,
          "fat": 12,
          "fiber": 6
        },
        "ingredients": [
          {
            "name": "鸡蛋",
            "amount": "2个",
            "fromInventory": true,
            "optional": false
          }
        ],
        "steps": ["鸡蛋炒熟。", "加入番茄。"],
        "aiTip": "早餐先补蛋白质，能减少午前饥饿。"
      }
    ],
    "nutritionSummary": {
      "actual": {
        "calories": 1520,
        "protein": 106,
        "carbs": 171,
        "fat": 48,
        "fiber": 29
      },
      "target": {
        "calories": 1650,
        "protein": 105,
        "carbs": 180,
        "fat": 55,
        "fiber": 28
      },
      "deltas": {
        "calories": -130,
        "protein": 1,
        "carbs": -9,
        "fat": -7,
        "fiber": 1
      },
      "score": 92
    },
    "shoppingList": [],
    "inventoryUsage": ["鸡蛋", "番茄"],
    "suggestions": ["晚餐已经降热量，如加餐建议选择无糖酸奶。"],
    "createdAt": "2026-05-04T09:00:00Z",
    "updatedAt": "2026-05-04T09:00:00Z"
  }
}
```

规则：

- `mode` 当前支持 `daily`。
- 返回结构应直接映射前端 `MealPlanResult`。
- `reply` 用于会话区展示，不替代结构化数据。
- 如果 AI 失败，服务端必须返回 fallback 结果，不能只返回空对象。

### 6.2 获取单个今日计划

`GET /api/v1/meal-plans/{mealPlanId}`

用途：

- 页面刷新后恢复最近一次生成结果。
- 后续可支持查看历史计划。

### 6.3 局部替换单餐

`POST /api/v1/meal-plans/{mealPlanId}/meals/{mealType}/regenerate`

请求：

```json
{
  "reason": "提升蛋白质",
  "message": "午餐换一个，蛋白质更高一些。"
}
```

响应：

```json
{
  "data": {
    "meal": {},
    "nutritionSummary": {},
    "shoppingList": [],
    "inventoryUsage": [],
    "suggestions": []
  }
}
```

用途：

- 保持与前端“换一个”行为一致，只替换当前餐次，不重刷整天全部结果。

## 7. Weekly Plan API

### 7.1 生成每周计划

`POST /api/v1/weekly-plans`

请求：

```json
{
  "message": "本周尽量清淡，高蛋白，工作日做饭时间不要超过30分钟。",
  "preferenceTags": ["light", "high_protein", "quick_cook"],
  "startDate": "2026-05-04",
  "days": 7,
  "conversationId": "conv_01"
}
```

响应：

```json
{
  "data": {
    "id": "week_01",
    "title": "轻负担高蛋白周计划",
    "description": "工作日快手，周末略丰盛。",
    "tags": ["light", "high_protein", "quick_cook"],
    "days": [
      {
        "date": "2026-05-04",
        "day": "周一",
        "meals": [],
        "breakfast": "番茄鸡蛋燕麦碗",
        "lunch": "香煎鸡胸配糙米",
        "dinner": "菌菇豆腐汤面",
        "calories": 1610,
        "status": "balanced",
        "note": "工作日轻负担。",
        "inventoryFocus": ["鸡蛋", "番茄"],
        "shoppingGap": ["西兰花"]
      }
    ],
    "insights": [
      "平均每日蛋白质达标率预计 96%。",
      "周三到周五库存利用率最高。"
    ],
    "adopted": false,
    "createdAt": "2026-05-04T09:00:00Z",
    "updatedAt": "2026-05-04T09:00:00Z"
  }
}
```

说明：

- 每周计划中的单日结构应兼容前端 `WeeklyPlanDay`。
- `date` 为新增后端标准字段，前端可继续使用 `day` 文案。
- `insights` 用于支持周计划页摘要卡。

### 7.2 获取每周计划

`GET /api/v1/weekly-plans/{weeklyPlanId}`

### 7.3 微调某一天

`PATCH /api/v1/weekly-plans/{weeklyPlanId}/days/{date}`

请求：

```json
{
  "message": "周三晚餐换成更清淡的方案。",
  "replaceMeals": ["dinner"]
}
```

### 7.4 确认采用每周计划

`POST /api/v1/weekly-plans/{weeklyPlanId}/adopt`

响应：

```json
{
  "data": {
    "weeklyPlanId": "week_01",
    "adopted": true,
    "syncedMealPlanId": "plan_02",
    "shoppingListId": "shop_02"
  }
}
```

用途：

- 与当前前端“确认采用”行为保持一致。
- 服务端负责把采用后的周计划同步成今日计划和购物清单基线。

## 8. Shopping List API

### 8.1 生成购物清单

`POST /api/v1/shopping-lists/generate`

请求：

```json
{
  "sourceType": "meal_plan",
  "sourceId": "plan_01",
  "preserveCheckedState": true
}
```

`sourceType` 支持：

- `meal_plan`
- `weekly_plan`

响应：

```json
{
  "data": {
    "id": "shop_01",
    "sourceType": "meal_plan",
    "sourceId": "plan_01",
    "items": [
      {
        "id": "shop_item_01",
        "name": "西兰花",
        "category": "vegetable",
        "amount": "1颗",
        "checked": false,
        "reason": "晚餐缺少高纤维配菜"
      }
    ],
    "createdAt": "2026-05-04T09:00:00Z",
    "updatedAt": "2026-05-04T09:00:00Z"
  }
}
```

### 8.2 获取当前购物清单

`GET /api/v1/shopping-lists/current?sourceType=meal_plan&sourceId=plan_01`

### 8.3 更新购物项勾选状态

`PATCH /api/v1/shopping-lists/{shoppingListId}/items/{itemId}`

请求：

```json
{
  "checked": true
}
```

规则：

- 仅允许更新 `checked`。
- 同名同来源项在重新生成时应尽量保留勾选状态。

## 9. Conversation API

### 9.1 创建会话

`POST /api/v1/conversations`

请求：

```json
{
  "title": "清淡高蛋白计划"
}
```

### 9.2 获取会话列表

`GET /api/v1/conversations`

响应按更新时间倒序，供后续“最近对话”能力使用。

### 9.3 获取会话消息

`GET /api/v1/conversations/{conversationId}/messages`

响应：

```json
{
  "data": [
    {
      "id": "msg_01",
      "role": "user",
      "content": "今天清淡一点。",
      "createdAt": "2026-05-04T09:00:00Z",
      "structuredResult": null
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 9.4 发送消息并获取 AI 回复

`POST /api/v1/conversations/{conversationId}/messages`

请求：

```json
{
  "content": "今天想吃清淡一点，多用家里的鸡蛋和番茄。",
  "mode": "daily",
  "triggerPlanGeneration": true
}
```

响应：

```json
{
  "data": {
    "userMessage": {
      "id": "msg_user_01",
      "role": "user",
      "content": "今天想吃清淡一点，多用家里的鸡蛋和番茄。",
      "createdAt": "2026-05-04T09:00:00Z"
    },
    "assistantMessage": {
      "id": "msg_ai_01",
      "role": "assistant",
      "content": "我已经按清淡和库存优先思路生成了今日计划。",
      "createdAt": "2026-05-04T09:00:02Z",
      "structuredResult": {
        "mealPlanId": "plan_01"
      }
    },
    "mealPlan": {}
  }
}
```

说明：

- 会话消息是历史记录资源。
- `mealPlan` 是本次对话触发的结构化结果。
- `assistantMessage.structuredResult` 存最小引用即可，避免消息表重复存整份大对象。

## 10. 前后端边界

### 10.1 前端负责

- 页面路由、界面状态、交互细节和展示文案。
- 当前会话中的本地乐观更新。
- 使用接口返回的结构化结果渲染页面，不直接解析 AI 自由文本。

### 10.2 后端负责

- 用户档案、库存、计划、购物清单、会话记录持久化。
- AI 提示词组装、结构化输出校验、失败降级。
- 营养汇总计算、购物缺口计算、库存优先规则。
- 统一错误码、日志、请求追踪和认证接入。

### 10.3 不放到前端的逻辑

- 营养目标达标评分算法。
- 库存扣减和单位归一。
- 会话历史聚合与上下文裁剪。
- 周计划确认采用后的数据同步。

## 11. 推荐实现顺序

1. `GET/PATCH /profile`
2. `GET/POST/PATCH/DELETE /inventory-items`
3. `POST /meal-plans` + `GET /meal-plans/{id}`
4. `POST /shopping-lists/generate` + `PATCH /shopping-lists/{id}/items/{itemId}`
5. `POST /weekly-plans` + `PATCH /weekly-plans/{id}/days/{date}` + `POST /weekly-plans/{id}/adopt`
6. `POST /conversations/{id}/messages`

## 12. 联调检查项

- 所有响应字段名使用 `camelCase`。
- 所有营养字段与前端 `NutritionFacts` 严格同名。
- 所有时间由服务端返回，前端不自行补默认值。
- AI 返回异常时，接口仍需返回可渲染 fallback 数据。
- 列表接口默认按最近更新时间倒序。
