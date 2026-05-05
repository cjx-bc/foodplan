import AjvImport from "ajv";

import { mealCatalog } from "../catalog.js";
import {
  buildMealSetFromIds,
  createDailyMealPlanFromMeals,
  createWeeklyPlanFromDays,
} from "../planner.js";
import { query } from "../db.js";
import { logAiGenerationEvent } from "../store.js";
import type {
  AiGenerationEventRecord,
  ConversationMessageRecord,
  GenerationMetaRecord,
  InventoryItemRecord,
  MealPlanRecord,
  ProfileRecord,
  WeeklyPlanRecord,
} from "../types.js";
import { createId, nowIso } from "../utils.js";
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
const promptVersion = "2026-05-05.v2";
const deepSeekApiKeySetting = "deepseek.api_key";

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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function normalizeDailyOutputCandidate(value: unknown): unknown {
  const record = asRecord(value);
  return {
    reply: typeof record.reply === "string" ? record.reply : "已根据当前目标生成今日餐单。",
    breakfastId: record.breakfastId,
    lunchId: record.lunchId,
    dinnerId: record.dinnerId,
    suggestions: normalizeStringList(record.suggestions),
  };
}

function normalizeWeeklyOutputCandidate(value: unknown): unknown {
  const record = asRecord(value);
  return {
    title: typeof record.title === "string" ? record.title : "AI 周计划",
    description: typeof record.description === "string" ? record.description : "已根据当前偏好生成本周餐单。",
    tags: normalizeStringList(record.tags),
    insights: normalizeStringList(record.insights),
    days: Array.isArray(record.days) ? record.days : [],
  };
}

async function requestDeepSeek(messages: Array<{ role: "system" | "user"; content: string }>) {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? await readAppSetting(deepSeekApiKeySetting);
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
      promptVersion,
    },
  };
}

async function readAppSetting(settingKey: string): Promise<string | undefined> {
  try {
    const result = await query<{ setting_value: string }>(
      "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
      [settingKey],
    );
    return result.rows[0]?.setting_value;
  } catch {
    return undefined;
  }
}

async function recordEvent(event: Omit<AiGenerationEventRecord, "id" | "createdAt">) {
  try {
    await logAiGenerationEvent({
      id: createId("gen"),
      createdAt: nowIso(),
      ...event,
    });
  } catch {
    // Generation logging should not block the main workflow.
  }
}

function inspectDailyPlanQuality(meals: MealPlanRecord["meals"]): string[] {
  const issues: string[] = [];
  const mealTypes = new Set(meals.map((meal) => meal.mealType));
  (["breakfast", "lunch", "dinner"] as const).forEach((mealType) => {
    if (!mealTypes.has(mealType)) issues.push(`missing ${mealType}`);
  });

  const totalCalories = meals.reduce((sum, meal) => sum + meal.nutrition.calories, 0);
  if (totalCalories < 900 || totalCalories > 2400) {
    issues.push(`daily calories out of range: ${totalCalories}`);
  }

  meals.forEach((meal) => {
    if (meal.nutrition.calories < 150 || meal.nutrition.calories > 1100) {
      issues.push(`${meal.id} calories out of range: ${meal.nutrition.calories}`);
    }
    if (meal.ingredients.length === 0) {
      issues.push(`${meal.id} has no ingredients`);
    }
  });

  return issues;
}

function inspectWeeklyPlanQuality(days: Array<{ date: string; meals: MealPlanRecord["meals"] }>, expectedDays: number, startDate: string): string[] {
  const issues: string[] = [];
  if (days.length !== expectedDays) {
    issues.push(`expected ${expectedDays} days, got ${days.length}`);
  }

  const startAt = new Date(`${startDate}T00:00:00.000Z`);
  days.forEach((day, index) => {
    const expected = new Date(startAt);
    expected.setUTCDate(startAt.getUTCDate() + index);
    const expectedDate = expected.toISOString().slice(0, 10);
    if (day.date !== expectedDate) {
      issues.push(`day ${index + 1} date expected ${expectedDate}, got ${day.date}`);
    }
    issues.push(...inspectDailyPlanQuality(day.meals).map((issue) => `${day.date}: ${issue}`));
  });

  return issues;
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
  const messages = [
    {
      role: "system" as const,
      content: [
        `Prompt Version: ${promptVersion}`,
        buildMealCatalogPrompt(),
        "输出严格 JSON，字段必须为：reply, breakfastId, lunchId, dinnerId, suggestions。",
        "reply 用简短中文描述本次规划重点。",
      ].join("\n\n"),
    },
    {
      role: "user" as const,
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
  ];

  let result;
  try {
    result = await requestDeepSeek(messages);
  } catch (error) {
    await recordEvent({
      workspaceId: input.profile.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "request_error",
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, conversationId: input.conversationId ?? null },
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  if (!result) {
    await recordEvent({
      workspaceId: input.profile.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "fallback",
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, conversationId: input.conversationId ?? null, reason: "missing_api_key" },
      errorMessage: "DEEPSEEK_API_KEY is not configured; used rule fallback.",
    });
    return null;
  }

  const parsed = normalizeDailyOutputCandidate(parseJsonContent(result.content));
  if (!validateDailyPlan(parsed)) {
    await recordEvent({
      workspaceId: input.profile.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "schema_invalid",
      model: result.meta.model,
      requestId: result.meta.requestId,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, conversationId: input.conversationId ?? null },
      rawOutput: result.content,
      errorMessage: ajv.errorsText(validateDailyPlan.errors),
    });
    throw new Error(`DeepSeek daily schema invalid: ${ajv.errorsText(validateDailyPlan.errors)}`);
  }

  const output = parsed as DeepSeekDailyPlanOutput;
  const meals = buildMealSetFromIds(output);
  if (!meals) {
    await recordEvent({
      workspaceId: input.profile.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "schema_invalid",
      model: result.meta.model,
      requestId: result.meta.requestId,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, conversationId: input.conversationId ?? null },
      rawOutput: result.content,
      errorMessage: "DeepSeek returned invalid meal ids",
    });
    throw new Error("DeepSeek returned invalid meal ids");
  }

  const qualityIssues = inspectDailyPlanQuality(meals);
  if (qualityIssues.length > 0) {
    await recordEvent({
      workspaceId: input.profile.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "schema_invalid",
      model: result.meta.model,
      requestId: result.meta.requestId,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, conversationId: input.conversationId ?? null, qualityIssues },
      rawOutput: result.content,
      errorMessage: `DeepSeek daily quality invalid: ${qualityIssues.join("; ")}`,
    });
    throw new Error(`DeepSeek daily quality invalid: ${qualityIssues.join("; ")}`);
  }

  await recordEvent({
    workspaceId: input.profile.workspaceId,
    userId: input.userId,
    kind: "daily_plan",
    status: "success",
    model: result.meta.model,
    requestId: result.meta.requestId,
    promptVersion,
    sourceMessage: input.message,
    inputPayload: { message: input.message, conversationId: input.conversationId ?? null },
    rawOutput: result.content,
  });

  return createDailyMealPlanFromMeals(
    meals,
    input.profile,
    input.inventory,
    input.previousShoppingList ?? [],
    input.userId,
    input.conversationId,
    input.profile.workspaceId,
    input.message,
    output.reply,
    output.suggestions,
    result.meta,
  );
}

export async function tryAnswerGeneralQuestionWithDeepSeek(input: {
  message: string;
  userId: string;
  workspaceId: string;
}): Promise<string | null> {
  let result;
  try {
    result = await requestDeepSeek([
      {
        role: "system",
        content: [
          `Prompt Version: ${promptVersion}`,
          "你是 SmartMeal 的普通对话助手。",
          "如果用户问的是数学、常识或产品使用问题，直接简短回答。",
          "不要在普通问答里编造餐单、购物清单或营养方案。",
        ].join("\n"),
      },
      {
        role: "user",
        content: input.message,
      },
    ]);
  } catch (error) {
    await recordEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      kind: "daily_plan",
      status: "request_error",
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, intent: "general_chat" },
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (!result) {
    return null;
  }

  return result.content.trim();
}

export async function tryGenerateWeeklyPlanWithDeepSeek(input: {
  message: string;
  preferenceTags: string[];
  startDate: string;
  days: number;
  inventory: InventoryItemRecord[];
  userId: string;
  conversationId?: string;
  workspaceId?: string;
}): Promise<WeeklyPlanRecord | null> {
  const workspaceId = input.workspaceId ?? "workspace_guest_default";
  const messages = [
    {
      role: "system" as const,
      content: [
        `Prompt Version: ${promptVersion}`,
        buildMealCatalogPrompt(),
        "输出严格 JSON，字段必须为：title, description, tags, insights, days。",
        "days 里的每一项字段必须为：date, breakfastId, lunchId, dinnerId。",
        "date 需要从用户给定 startDate 开始连续生成。",
      ].join("\n\n"),
    },
    {
      role: "user" as const,
      content: [
        `生成 ${input.days} 天周计划，开始日期 ${input.startDate}。`,
        `用户要求: ${input.message}`,
        `周偏好: ${input.preferenceTags.join("、") || "无"}`,
        `家庭库存:\n${buildInventoryPrompt(input.inventory)}`,
      ].join("\n\n"),
    },
  ];

  let result;
  try {
    result = await requestDeepSeek(messages);
  } catch (error) {
    await recordEvent({
      workspaceId: workspaceId,
      userId: input.userId,
      kind: "weekly_plan",
      status: "request_error",
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, startDate: input.startDate, days: input.days },
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  if (!result) {
    await recordEvent({
      workspaceId: workspaceId,
      userId: input.userId,
      kind: "weekly_plan",
      status: "fallback",
      model: process.env.DEEPSEEK_MODEL ?? defaultModel,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, startDate: input.startDate, days: input.days, reason: "missing_api_key" },
      errorMessage: "DEEPSEEK_API_KEY is not configured; used rule fallback.",
    });
    return null;
  }

  const parsed = normalizeWeeklyOutputCandidate(parseJsonContent(result.content));
  if (!validateWeeklyPlan(parsed)) {
    await recordEvent({
      workspaceId: workspaceId,
      userId: input.userId,
      kind: "weekly_plan",
      status: "schema_invalid",
      model: result.meta.model,
      requestId: result.meta.requestId,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, startDate: input.startDate, days: input.days },
      rawOutput: result.content,
      errorMessage: ajv.errorsText(validateWeeklyPlan.errors),
    });
    throw new Error(`DeepSeek weekly schema invalid: ${ajv.errorsText(validateWeeklyPlan.errors)}`);
  }

  const output = parsed as DeepSeekWeeklyPlanOutput;
  const days = output.days.slice(0, input.days).map((day) => {
    const meals = buildMealSetFromIds(day);
    if (!meals) {
      void recordEvent({
        workspaceId: workspaceId,
        userId: input.userId,
        kind: "weekly_plan",
        status: "schema_invalid",
        model: result.meta.model,
        requestId: result.meta.requestId,
        promptVersion,
        sourceMessage: input.message,
        inputPayload: { message: input.message, startDate: input.startDate, days: input.days },
        rawOutput: result.content,
        errorMessage: `DeepSeek weekly day ${day.date} returned invalid meal ids`,
      });
      throw new Error(`DeepSeek weekly day ${day.date} returned invalid meal ids`);
    }

    return {
      date: day.date,
      meals,
    };
  });

  const weeklyQualityIssues = inspectWeeklyPlanQuality(days, input.days, input.startDate);
  if (weeklyQualityIssues.length > 0) {
    await recordEvent({
      workspaceId: workspaceId,
      userId: input.userId,
      kind: "weekly_plan",
      status: "schema_invalid",
      model: result.meta.model,
      requestId: result.meta.requestId,
      promptVersion,
      sourceMessage: input.message,
      inputPayload: { message: input.message, startDate: input.startDate, days: input.days, qualityIssues: weeklyQualityIssues },
      rawOutput: result.content,
      errorMessage: `DeepSeek weekly quality invalid: ${weeklyQualityIssues.join("; ")}`,
    });
    throw new Error(`DeepSeek weekly quality invalid: ${weeklyQualityIssues.join("; ")}`);
  }

  await recordEvent({
    workspaceId: workspaceId,
    userId: input.userId,
    kind: "weekly_plan",
    status: "success",
    model: result.meta.model,
    requestId: result.meta.requestId,
    promptVersion,
    sourceMessage: input.message,
    inputPayload: { message: input.message, startDate: input.startDate, days: input.days },
    rawOutput: result.content,
  });

  return createWeeklyPlanFromDays({
    title: output.title,
    description: output.description,
    tags: output.tags.length > 0 ? output.tags : input.preferenceTags,
    days,
    inventory: input.inventory,
    userId: input.userId,
    conversationId: input.conversationId,
    workspaceId,
    generationMeta: result.meta satisfies GenerationMetaRecord,
  });
}
