import AjvImport from "ajv";

import { mealCatalog } from "../catalog.js";
import {
  buildMealSetFromIds,
  createDailyMealPlanFromMeals,
  createWeeklyPlanFromDays,
} from "../planner.js";
import type {
  ConversationMessageRecord,
  GenerationMetaRecord,
  InventoryItemRecord,
  MealPlanRecord,
  ProfileRecord,
  WeeklyPlanRecord,
} from "../types.js";
import { dailyPlanSchema, type DeepSeekDailyPlanOutput, type DeepSeekWeeklyPlanOutput, weeklyPlanSchema } from "./schemas.js";

const AjvCtor = AjvImport as unknown as new (options?: Record<string, unknown>) => {
  compile: typeof import("ajv").default.prototype.compile;
  errorsText: typeof import("ajv").default.prototype.errorsText;
};
const ajv = new AjvCtor({ allErrors: true });
const validateDailyPlan = ajv.compile(dailyPlanSchema);
const validateWeeklyPlan = ajv.compile(weeklyPlanSchema);

const defaultBaseUrl = "https://api.deepseek.com";
const defaultModel = "deepseek-v4-flash";

function buildMealCatalogPrompt() {
  const breakfast = mealCatalog.breakfast.map((item) => `${item.id}: ${item.title}`).join("\n");
  const lunch = mealCatalog.lunch.map((item) => `${item.id}: ${item.title}`).join("\n");
  const dinner = mealCatalog.dinner.map((item) => `${item.id}: ${item.title}`).join("\n");

  return [
    "你是 SmartMeal 的结构化餐单生成器。",
    "只能从下面的候选餐单里选择，不要编造新的 mealId。",
    "早餐候选:",
    breakfast,
    "午餐候选:",
    lunch,
    "晚餐候选:",
    dinner,
  ].join("\n");
}

function buildInventoryPrompt(inventory: InventoryItemRecord[]) {
  if (inventory.length === 0) {
    return "当前没有可用库存。";
  }

  return inventory
    .map((item) => `- ${item.name} / ${item.quantity} / 状态:${item.status}`)
    .join("\n");
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) ?? trimmed.match(/```\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw);
}

async function requestDeepSeek(messages: Array<{ role: "system" | "user"; content: string }>) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL ?? defaultBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed: ${response.status}`);
  }

  const requestId = response.headers.get("x-request-id") ?? undefined;
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek response missing content");
  }

  return {
    content,
    meta: {
      source: "ai" as const,
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      requestId,
    },
  };
}

export async function tryGenerateDailyMealPlanWithDeepSeek(input: {
  message: string;
  profile: ProfileRecord;
  inventory: InventoryItemRecord[];
  previousShoppingList?: MealPlanRecord["shoppingList"];
  conversationId?: string;
  userId: string;
  conversationMessages?: ConversationMessageRecord[];
}): Promise<MealPlanRecord | null> {
  const result = await requestDeepSeek([
    {
      role: "system",
      content: [
        buildMealCatalogPrompt(),
        "输出严格 JSON，字段必须为：reply, breakfastId, lunchId, dinnerId, suggestions。",
        "reply 用简短中文描述本次规划重点。",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: [
        `用户需求: ${input.message}`,
        `营养目标: 热量 ${input.profile.dailyCalorieTarget} kcal, 蛋白质 ${input.profile.proteinTarget} g, 碳水 ${input.profile.carbsTarget} g, 脂肪 ${input.profile.fatTarget} g, 纤维 ${input.profile.fiberTarget} g`,
        `口味偏好: ${input.profile.tastePreferences.join("、") || "无"}`,
        `饮食限制: ${input.profile.dietaryRestrictions.join("、") || "无"}`,
        `家庭库存:\n${buildInventoryPrompt(input.inventory)}`,
        input.conversationMessages?.length
          ? `最近对话:\n${input.conversationMessages.slice(-6).map((item) => `${item.role}: ${item.content}`).join("\n")}`
          : "最近对话: 无",
      ].join("\n\n"),
    },
  ]);

  if (!result) {
    return null;
  }

  const parsed = parseJsonContent(result.content);
  if (!validateDailyPlan(parsed)) {
    throw new Error(`DeepSeek daily schema invalid: ${ajv.errorsText(validateDailyPlan.errors)}`);
  }

  const output = parsed as DeepSeekDailyPlanOutput;
  const meals = buildMealSetFromIds(output);
  if (!meals) {
    throw new Error("DeepSeek returned invalid meal ids");
  }

  return createDailyMealPlanFromMeals(
    meals,
    input.profile,
    input.inventory,
    input.previousShoppingList ?? [],
    input.userId,
    input.conversationId,
    input.message,
    output.reply,
    output.suggestions,
    result.meta,
  );
}

export async function tryGenerateWeeklyPlanWithDeepSeek(input: {
  message: string;
  preferenceTags: string[];
  startDate: string;
  days: number;
  inventory: InventoryItemRecord[];
  userId: string;
  conversationId?: string;
}): Promise<WeeklyPlanRecord | null> {
  const result = await requestDeepSeek([
    {
      role: "system",
      content: [
        buildMealCatalogPrompt(),
        "输出严格 JSON，字段必须为：title, description, tags, insights, days。",
        "days 里的每一项字段必须为：date, breakfastId, lunchId, dinnerId。",
        "date 需要从用户给定 startDate 开始连续生成。",
      ].join("\n\n"),
    },
    {
      role: "user",
      content: [
        `生成 ${input.days} 天周计划，开始日期 ${input.startDate}。`,
        `用户要求: ${input.message}`,
        `周偏好: ${input.preferenceTags.join("、") || "无"}`,
        `家庭库存:\n${buildInventoryPrompt(input.inventory)}`,
      ].join("\n\n"),
    },
  ]);

  if (!result) {
    return null;
  }

  const parsed = parseJsonContent(result.content);
  if (!validateWeeklyPlan(parsed)) {
    throw new Error(`DeepSeek weekly schema invalid: ${ajv.errorsText(validateWeeklyPlan.errors)}`);
  }

  const output = parsed as DeepSeekWeeklyPlanOutput;
  const days = output.days.slice(0, input.days).map((day) => {
    const meals = buildMealSetFromIds(day);
    if (!meals) {
      throw new Error(`DeepSeek weekly day ${day.date} returned invalid meal ids`);
    }

    return {
      date: day.date,
      meals,
    };
  });

  return createWeeklyPlanFromDays({
    title: output.title,
    description: output.description,
    tags: output.tags.length > 0 ? output.tags : input.preferenceTags,
    days,
    inventory: input.inventory,
    userId: input.userId,
    conversationId: input.conversationId,
    generationMeta: result.meta satisfies GenerationMetaRecord,
  });
}
