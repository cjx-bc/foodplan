import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  adjustWeeklyPlanDay,
  buildInventoryConsumptionPreview,
  createDailyMealPlanFromMeals,
  createWeeklyPlanFromDays,
  deriveShoppingItems,
  generateDailyMealPlan,
  generateWeeklyPlan,
  regenerateMealInPlan,
} from "./planner.js";
import { sendError, sendJson, sendNoContent } from "./responses.js";
import {
  ensureDefaultGuestContext,
  createSession,
  createConversation,
  createConversationMessages,
  createMealPlan,
  createUser,
  createWorkspace,
  createWeeklyPlan,
  listWorkspacesByUserId,
  listConversationMessages,
  listConversations,
  listInventoryItems,
  readConversation,
  readMealPlan,
  readProfile,
  readSessionByToken,
  readShoppingList,
  readShoppingListBySource,
  readUserById,
  readWeeklyPlan,
  readWorkspaceById,
  readWorkspaceState,
  replaceInventoryItems,
  updateConversation,
  updateMealPlan,
  updateProfile,
  updateWeeklyPlan,
  updateWorkspaceState,
  upsertShoppingList,
} from "./store.js";
import type {
  ConversationMessageRecord,
  InventoryConsumptionApplyItem,
  InventoryItemRecord,
  MealPlanRecord,
  MealType,
  ShoppingListRecord,
  StoreScope,
  UserRecord,
  WeeklyPlanRecord,
  WorkspaceStateRecord,
} from "./types.js";
import {
  validateConversationCreate,
  validateConversationMessageCreate,
  validateInventoryConsumptionApply,
  validateInventoryCreate,
  validateInventoryPatch,
  validateMealPlanCreate,
  validateMealRegenerate,
  validateProfilePatch,
  validateShoppingListGenerate,
  validateShoppingListItemPatch,
  validateWeeklyDayPatch,
  validateWeeklyPlanAdopt,
  validateWeeklyPlanCreate,
} from "./validators.js";
import { createId, createRequestId, normalizeQuantityText, normalizeQuantityUnit, nowIso } from "./utils.js";
import { tryAnswerGeneralQuestionWithDeepSeek, tryGenerateDailyMealPlanWithDeepSeek, tryGenerateWeeklyPlanWithDeepSeek } from "./ai/deepseek.js";

const port = Number(process.env.PORT ?? 8787);

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(rawBody);
}

function getPathname(request: IncomingMessage): string {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  return url.pathname;
}

function getUrl(request: IncomingMessage): URL {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
}

function shouldGenerateMealPlanFromMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  const mealIntentPattern = /餐|饭|吃|饮食|食材|库存|营养|热量|蛋白|脂肪|碳水|纤维|清淡|油|盐|早餐|午餐|晚餐|周计划|购物|采购|meal|food|diet|calorie|protein|nutrition|shopping/;
  return mealIntentPattern.test(normalized);
}

function answerSimpleGeneralQuestion(message: string): string | null {
  const arithmetic = message.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/×÷])\s*(-?\d+(?:\.\d+)?)/);
  if (!arithmetic) {
    return null;
  }

  const left = Number(arithmetic[1]);
  const operator = arithmetic[2];
  const right = Number(arithmetic[3]);
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return null;
  }

  if ((operator === "/" || operator === "÷") && right === 0) {
    return "除数不能为 0。";
  }

  const result = operator === "+"
    ? left + right
    : operator === "-"
      ? left - right
      : operator === "*" || operator === "×"
        ? left * right
        : left / right;
  return `${arithmetic[1]}${operator}${arithmetic[3]} = ${Number.isInteger(result) ? result : Number(result.toFixed(6))}`;
}

function parseCookies(request: IncomingMessage) {
  const cookieHeader = request.headers.cookie ?? "";
  return cookieHeader.split(";").reduce<Record<string, string>>((record, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return record;
    }
    record[rawKey] = decodeURIComponent(rawValue.join("="));
    return record;
  }, {});
}

function setSessionCookie(response: ServerResponse, token: string) {
  response.setHeader("Set-Cookie", `smartmeal_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
}

type RequestContext = {
  user: UserRecord;
  scope: StoreScope;
  workspaceId: string;
};

async function resolveRequestContext(request: IncomingMessage): Promise<RequestContext> {
  const cookies = parseCookies(request);
  const sessionToken = cookies.smartmeal_session;
  const defaultContext = await ensureDefaultGuestContext(nowIso());

  if (!sessionToken) {
    return {
      user: defaultContext.user,
      workspaceId: defaultContext.workspace.id,
      scope: defaultContext.scope,
    };
  }

  const session = await readSessionByToken(sessionToken);
  if (!session) {
    return {
      user: defaultContext.user,
      workspaceId: defaultContext.workspace.id,
      scope: defaultContext.scope,
    };
  }

  const user = (await readUserById(session.userId)) ?? defaultContext.user;
  const workspace = (await readWorkspaceById(session.workspaceId))
    ?? (await listWorkspacesByUserId(user.id))[0]
    ?? defaultContext.workspace;

  return {
    user,
    workspaceId: workspace.id,
    scope: {
      userId: user.id,
      workspaceId: workspace.id,
    },
  };
}

async function resolveSessionFromRequest(request: IncomingMessage) {
  const cookies = parseCookies(request);
  const sessionToken = cookies.smartmeal_session;
  if (!sessionToken) {
    return undefined;
  }
  return readSessionByToken(sessionToken);
}

function weekdayFromDate(date: string) {
  const currentDate = new Date(`${date}T00:00:00.000Z`);
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][currentDate.getUTCDay()] ?? "周一";
}

function mapConversationMessage(message: ConversationMessageRecord) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    structuredResult: message.mealPlanId || message.shoppingListId || message.weeklyPlanId
      ? {
          mealPlanId: message.mealPlanId,
          shoppingListId: message.shoppingListId,
          weeklyPlanId: message.weeklyPlanId,
        }
      : null,
  };
}

async function buildShoppingListFromSource(
  sourceType: "meal_plan" | "weekly_plan",
  sourceId: string,
  preserveCheckedState: boolean,
  scope: StoreScope,
): Promise<ShoppingListRecord | null> {
  const inventory = await listInventoryItems(scope);
  const currentList = await readShoppingListBySource(scope, sourceType, sourceId);
  let items = currentList?.items ?? [];

  if (sourceType === "meal_plan") {
    const mealPlan = await readMealPlan(scope, sourceId);
    if (!mealPlan) return null;
    items = deriveShoppingItems(mealPlan.meals, inventory, preserveCheckedState ? currentList?.items : []);
  } else {
    const weeklyPlan = await readWeeklyPlan(scope, sourceId);
    if (!weeklyPlan) return null;
    items = deriveShoppingItems(
      weeklyPlan.days.flatMap((day) => day.meals),
      inventory,
      preserveCheckedState ? currentList?.items : [],
    );
  }

  const updatedAt = nowIso();
  const shoppingList: ShoppingListRecord = {
    id: currentList?.id ?? createId("shop"),
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    sourceType,
    sourceId,
    items,
    createdAt: currentList?.createdAt ?? updatedAt,
    updatedAt,
  };

  await upsertShoppingList(shoppingList);
  return shoppingList;
}

async function refreshMealPlanPreview(mealPlan: MealPlanRecord, inventory: InventoryItemRecord[]) {
  const updatedMealPlan = {
    ...mealPlan,
    inventoryConsumptionPreview: buildInventoryConsumptionPreview(mealPlan.meals, inventory),
    updatedAt: nowIso(),
  };
  await updateMealPlan(updatedMealPlan);
  return updatedMealPlan;
}

function buildConsumptionResponseItem(item: InventoryItemRecord, consumeItem: InventoryConsumptionApplyItem) {
  return {
    inventoryItemId: item.id,
    name: item.name,
    consumeValue: consumeItem.consumeValue,
    consumeUnit: consumeItem.consumeUnit,
    consumeText: consumeItem.consumeText,
    remainingQuantity: normalizeQuantityText(item.quantity, item.quantityValue, item.quantityUnit),
  };
}

function applyInventoryConsumptionItems(
  inventory: InventoryItemRecord[],
  items: InventoryConsumptionApplyItem[],
  mode: "manual" | "auto",
) {
  const inventoryById = new Map(inventory.map((item) => [item.id, item]));
  const nextInventory = inventory.map((item) => ({ ...item }));
  const nextInventoryById = new Map(nextInventory.map((item) => [item.id, item]));
  const appliedItems: Array<ReturnType<typeof buildConsumptionResponseItem>> = [];
  const skippedItems: Array<{ inventoryItemId: string; name?: string; consumeText: string; reason: string }> = [];

  for (const consumeItem of items) {
    const originalItem = inventoryById.get(consumeItem.inventoryItemId);
    const targetItem = nextInventoryById.get(consumeItem.inventoryItemId);
    if (!originalItem || !targetItem) {
      skippedItems.push({
        inventoryItemId: consumeItem.inventoryItemId,
        consumeText: consumeItem.consumeText,
        reason: "库存食材不存在",
      });
      continue;
    }

    const normalizedItemUnit = normalizeQuantityUnit(targetItem.quantityUnit);
    const normalizedConsumeUnit = normalizeQuantityUnit(consumeItem.consumeUnit);
    if (!targetItem.quantityValue || !normalizedItemUnit || !normalizedConsumeUnit || normalizedItemUnit !== normalizedConsumeUnit) {
      skippedItems.push({
        inventoryItemId: targetItem.id,
        name: targetItem.name,
        consumeText: consumeItem.consumeText,
        reason: mode === "auto" ? "单位不兼容，已跳过自动扣减" : "单位不兼容，无法扣减",
      });
      continue;
    }

    if (targetItem.quantityValue < consumeItem.consumeValue) {
      skippedItems.push({
        inventoryItemId: targetItem.id,
        name: targetItem.name,
        consumeText: consumeItem.consumeText,
        reason: "库存数量不足",
      });
      continue;
    }

    const nextValue = Number((targetItem.quantityValue - consumeItem.consumeValue).toFixed(2));
    targetItem.quantityValue = nextValue;
    targetItem.quantity = normalizeQuantityText(targetItem.quantity, nextValue, targetItem.quantityUnit);
    targetItem.updatedAt = nowIso();
    appliedItems.push(buildConsumptionResponseItem(targetItem, consumeItem));
  }

  return { nextInventory, appliedItems, skippedItems };
}

async function handleHealth(response: ServerResponse): Promise<void> {
  sendJson(response, 200, {
    data: {
      status: "ok",
      service: "smartmeal-api",
      version: "0.2.0",
      timestamp: nowIso(),
    },
  });
}

async function handleAuthGuest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const currentSession = await resolveSessionFromRequest(request);
  if (currentSession) {
    const user = await readUserById(currentSession.userId);
    setSessionCookie(response, currentSession.token);
    sendJson(response, 200, {
      data: {
        id: currentSession.id,
        userId: currentSession.userId,
        displayName: user?.displayName ?? "Guest",
        createdAt: currentSession.createdAt,
        updatedAt: currentSession.updatedAt,
      },
    });
    return;
  }

  const now = nowIso();
  const guestUser = await createUser({
    id: createId("user"),
    displayName: "Guest",
    kind: "guest",
    createdAt: now,
    updatedAt: now,
  });
  const guestWorkspace = await createWorkspace({
    id: createId("workspace"),
    ownerUserId: guestUser.id,
    name: "Guest Workspace",
    kind: "guest",
    createdAt: now,
    updatedAt: now,
  });
  const session = await createSession({
    id: createId("sess"),
    userId: guestUser.id,
    workspaceId: guestWorkspace.id,
    token: createId("token"),
    createdAt: now,
    updatedAt: now,
  });

  setSessionCookie(response, session.token);
  sendJson(response, 201, {
    data: {
      id: session.id,
      userId: guestUser.id,
      workspaceId: guestWorkspace.id,
      displayName: guestUser.displayName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
}

async function handleGetSession(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const session = await resolveSessionFromRequest(request);
  if (!session) {
    sendError(response, 401, requestId, "unauthorized", "Session not found");
    return;
  }

  const user = await readUserById(session.userId);
  if (!user) {
    sendError(response, 401, requestId, "unauthorized", "User not found");
    return;
  }

  sendJson(response, 200, {
    data: {
      id: session.id,
      userId: session.userId,
      workspaceId: session.workspaceId,
      displayName: user.displayName,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
}

async function handleGetWorkspaceState(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const context = await resolveRequestContext(request);
  const workspaceState = await readWorkspaceState(context.scope);
  sendJson(response, 200, {
    data: {
      ...workspaceState,
      userId: workspaceState.userId ?? context.user.id,
      workspaceId: workspaceState.workspaceId ?? context.workspaceId,
    },
  });
}

async function handlePatchWorkspaceState(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", [{ field: "body", message: "Must be a JSON object" }]);
    return;
  }

  const context = await resolveRequestContext(request);
  const currentState = await readWorkspaceState(context.scope);
  const payload = body as Partial<WorkspaceStateRecord>;
  const nextState: WorkspaceStateRecord = {
    ...currentState,
    userId: context.user.id,
    workspaceId: context.workspaceId,
    currentConversationId: payload.currentConversationId === null ? undefined : typeof payload.currentConversationId === "string" ? payload.currentConversationId : currentState.currentConversationId,
    currentMealPlanId: payload.currentMealPlanId === null ? undefined : typeof payload.currentMealPlanId === "string" ? payload.currentMealPlanId : currentState.currentMealPlanId,
    currentWeeklyPlanId: payload.currentWeeklyPlanId === null ? undefined : typeof payload.currentWeeklyPlanId === "string" ? payload.currentWeeklyPlanId : currentState.currentWeeklyPlanId,
    currentShoppingListId: payload.currentShoppingListId === null ? undefined : typeof payload.currentShoppingListId === "string" ? payload.currentShoppingListId : currentState.currentShoppingListId,
    planningMode: payload.planningMode === "weekly" ? "weekly" : payload.planningMode === "daily" ? "daily" : currentState.planningMode,
    selectedWeekday: typeof payload.selectedWeekday === "string" ? payload.selectedWeekday : currentState.selectedWeekday,
    updatedAt: nowIso(),
  };

  const saved = await updateWorkspaceState(nextState);
  sendJson(response, 200, { data: saved });
}

async function handleGetProfile(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const context = await resolveRequestContext(request);
  const profile = await readProfile(context.scope);
  sendJson(response, 200, { data: profile });
}

async function handlePatchProfile(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const context = await resolveRequestContext(request);
  const currentProfile = await readProfile(context.scope);
  const result = validateProfilePatch(body, currentProfile, nowIso());

  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const profile = await updateProfile(result.value);
  sendJson(response, 200, { data: profile });
}

async function handleListInventory(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = getUrl(request);
  const context = await resolveRequestContext(request);
  const statusFilters = new Set(
    (url.searchParams.get("status") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const categoryFilters = new Set(
    (url.searchParams.get("category") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const sortBy = url.searchParams.get("sort");

  let items = await listInventoryItems(context.scope);

  if (statusFilters.size > 0) {
    items = items.filter((item) => statusFilters.has(item.status));
  }

  if (categoryFilters.size > 0) {
    items = items.filter((item) => categoryFilters.has(item.category));
  }

  if (sortBy === "expireDate") {
    items = [...items].sort((left, right) => (left.expireDate ?? "9999-12-31").localeCompare(right.expireDate ?? "9999-12-31"));
  } else {
    items = [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  sendJson(response, 200, {
    data: items,
    meta: {
      total: items.length,
    },
  });
}

async function handleCreateInventory(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const context = await resolveRequestContext(request);
  const result = validateInventoryCreate(body, nowIso(), createId("inv"), context.user.id, context.workspaceId);

  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const currentItems = await listInventoryItems(context.scope);
  const items = await replaceInventoryItems(context.scope, [result.value, ...currentItems]);
  const createdItem = items.find((item) => item.id === result.value?.id) ?? result.value;

  response.setHeader("Location", `/api/v1/inventory-items/${createdItem.id}`);
  sendJson(response, 201, { data: createdItem });
}

async function handlePatchInventory(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  inventoryItemId: string,
): Promise<void> {
  const body = await readJsonBody(request);
  const context = await resolveRequestContext(request);
  const currentItems = await listInventoryItems(context.scope);
  const currentItem = currentItems.find((item) => item.id === inventoryItemId);

  if (!currentItem) {
    sendError(response, 404, requestId, "not_found", "Inventory item not found");
    return;
  }

  const result = validateInventoryPatch(body, currentItem, nowIso());
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const updatedItems = currentItems.map((item) => (item.id === inventoryItemId ? result.value! : item));
  await replaceInventoryItems(context.scope, updatedItems);
  sendJson(response, 200, { data: result.value });
}

async function handleDeleteInventory(request: IncomingMessage, response: ServerResponse, requestId: string, inventoryItemId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const currentItems = await listInventoryItems(context.scope);
  const nextItems = currentItems.filter((item) => item.id !== inventoryItemId);

  if (nextItems.length === currentItems.length) {
    sendError(response, 404, requestId, "not_found", "Inventory item not found");
    return;
  }

  await replaceInventoryItems(context.scope, nextItems);
  sendNoContent(response);
}

async function handleCreateMealPlan(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const context = await resolveRequestContext(request);
  const result = validateMealPlanCreate(body);
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  if (result.value.conversationId) {
    const conversation = await readConversation(context.scope, result.value.conversationId);
    if (!conversation) {
      sendError(response, 404, requestId, "not_found", "Conversation not found");
      return;
    }
  }

  const profile = await readProfile(context.scope);
  const inventory = await listInventoryItems(context.scope);
  let mealPlan: MealPlanRecord;
  try {
    mealPlan = (await tryGenerateDailyMealPlanWithDeepSeek({
      message: result.value.message,
      profile,
      inventory,
      previousShoppingList: [],
      conversationId: result.value.conversationId,
      userId: context.user.id,
    })) ?? generateDailyMealPlan(result.value.message, profile, inventory, [], context.user.id, result.value.conversationId, context.workspaceId);
  } catch {
    mealPlan = generateDailyMealPlan(result.value.message, profile, inventory, [], context.user.id, result.value.conversationId, context.workspaceId);
    mealPlan.generationMeta = { source: "fallback", model: "rule_planner" };
    mealPlan.reply = `${mealPlan.reply} 本次改用基础规则生成，结果仍可继续调整。`;
  }
  mealPlan.workspaceId = context.workspaceId;
  await createMealPlan(mealPlan);
  sendJson(response, 201, { data: mealPlan });
}

async function handleGetMealPlan(request: IncomingMessage, response: ServerResponse, requestId: string, mealPlanId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const mealPlan = await readMealPlan(context.scope, mealPlanId);
  if (!mealPlan) {
    sendError(response, 404, requestId, "not_found", "Meal plan not found");
    return;
  }
  const inventory = await listInventoryItems(context.scope);
  const refreshedMealPlan = await refreshMealPlanPreview(mealPlan, inventory);
  sendJson(response, 200, { data: refreshedMealPlan });
}

async function handleRegenerateMeal(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  mealPlanId: string,
  mealType: MealType,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const mealPlan = await readMealPlan(context.scope, mealPlanId);
  if (!mealPlan) {
    sendError(response, 404, requestId, "not_found", "Meal plan not found");
    return;
  }

  const result = validateMealRegenerate(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const inventory = await listInventoryItems(context.scope);
  const profile = await readProfile(context.scope);
  const currentList = await readShoppingListBySource(context.scope, "meal_plan", mealPlan.id);
  const updatedPlan = regenerateMealInPlan(mealPlan, mealType, result.value.reason, profile, inventory, currentList?.items ?? []);
  await updateMealPlan(updatedPlan);
  const shoppingList = await buildShoppingListFromSource("meal_plan", updatedPlan.id, true, context.scope);

  sendJson(response, 200, {
    data: {
      meal: updatedPlan.meals.find((item) => item.mealType === mealType) ?? updatedPlan.meals[0],
      nutritionSummary: updatedPlan.nutritionSummary,
      shoppingList: shoppingList?.items ?? updatedPlan.shoppingList,
      inventoryUsage: updatedPlan.inventoryUsage,
      suggestions: updatedPlan.suggestions,
      mealPlan: updatedPlan,
      shoppingListResource: shoppingList,
    },
  });
}

async function handleAdoptMealPlan(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  mealPlanId: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const mealPlan = await readMealPlan(context.scope, mealPlanId);
  if (!mealPlan) {
    sendError(response, 404, requestId, "not_found", "Meal plan not found");
    return;
  }

  const inventory = await listInventoryItems(context.scope);
  const refreshedMealPlan = await refreshMealPlanPreview(mealPlan, inventory);
  const shoppingList = await buildShoppingListFromSource("meal_plan", refreshedMealPlan.id, true, context.scope);
  const workspaceState = await readWorkspaceState(context.scope);
  const nextWorkspaceState = await updateWorkspaceState({
    ...workspaceState,
    workspaceId: context.workspaceId,
    currentConversationId: refreshedMealPlan.conversationId ?? workspaceState.currentConversationId,
    currentMealPlanId: refreshedMealPlan.id,
    currentShoppingListId: shoppingList?.id,
    planningMode: "daily",
    updatedAt: nowIso(),
  });

  sendJson(response, 200, {
    data: {
      mealPlanId: refreshedMealPlan.id,
      shoppingListId: shoppingList?.id ?? null,
      workspaceState: nextWorkspaceState,
    },
  });
}

async function handleGenerateShoppingList(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const context = await resolveRequestContext(request);
  const result = validateShoppingListGenerate(body);
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const shoppingList = await buildShoppingListFromSource(
    result.value.sourceType,
    result.value.sourceId,
    result.value.preserveCheckedState,
    context.scope,
  );

  if (!shoppingList) {
    sendError(response, 404, requestId, "not_found", result.value.sourceType === "meal_plan" ? "Meal plan not found" : "Weekly plan not found");
    return;
  }

  const workspaceState = await readWorkspaceState(context.scope);
  await updateWorkspaceState({
    ...workspaceState,
    workspaceId: context.workspaceId,
    currentShoppingListId: shoppingList.id,
    currentMealPlanId: result.value.sourceType === "meal_plan" ? result.value.sourceId : workspaceState.currentMealPlanId,
    currentWeeklyPlanId: result.value.sourceType === "weekly_plan" ? result.value.sourceId : workspaceState.currentWeeklyPlanId,
    planningMode: result.value.sourceType === "weekly_plan" ? "weekly" : workspaceState.planningMode,
    updatedAt: nowIso(),
  });

  sendJson(response, 200, { data: shoppingList });
}

async function handleGetCurrentShoppingList(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const url = getUrl(request);
  const context = await resolveRequestContext(request);
  const sourceType = url.searchParams.get("sourceType");
  const sourceId = url.searchParams.get("sourceId");

  if (sourceType !== "meal_plan" && sourceType !== "weekly_plan") {
    sendError(response, 422, requestId, "validation_error", "Source type is invalid");
    return;
  }
  if (!sourceId) {
    sendError(response, 422, requestId, "validation_error", "Source ID is required");
    return;
  }

  const shoppingList = await readShoppingListBySource(context.scope, sourceType, sourceId);
  if (!shoppingList) {
    sendError(response, 404, requestId, "not_found", "Shopping list not found");
    return;
  }

  sendJson(response, 200, { data: shoppingList });
}

async function handlePatchShoppingListItem(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  shoppingListId: string,
  itemId: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const currentList = await readShoppingList(context.scope, shoppingListId);
  if (!currentList) {
    sendError(response, 404, requestId, "not_found", "Shopping list not found");
    return;
  }

  const body = await readJsonBody(request);
  const result = validateShoppingListItemPatch(body, currentList, itemId);
  if (!result.value) {
    const notFound = result.errors.some((item) => item.field === "itemId");
    sendError(
      response,
      notFound ? 404 : 422,
      requestId,
      notFound ? "not_found" : "validation_error",
      notFound ? "Shopping list item not found" : "Request validation failed",
      notFound ? undefined : result.errors,
    );
    return;
  }

  const updated = {
    ...result.value,
    updatedAt: nowIso(),
  };
  await upsertShoppingList(updated);
  sendJson(response, 200, { data: updated });
}

async function handleApplyInventoryConsumption(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const result = validateInventoryConsumptionApply(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const currentInventory = await listInventoryItems(context.scope);
  const { nextInventory, appliedItems, skippedItems } = applyInventoryConsumptionItems(
    currentInventory,
    result.value.items,
    result.value.mode,
  );
  await replaceInventoryItems(context.scope, nextInventory);

  const workspaceState = await readWorkspaceState(context.scope);
  const mealPlanToRefreshId = result.value.sourceType === "meal_plan"
    ? result.value.sourceId
    : workspaceState.currentMealPlanId;

  let refreshedMealPlan: MealPlanRecord | undefined;
  if (mealPlanToRefreshId) {
    const mealPlan = await readMealPlan(context.scope, mealPlanToRefreshId);
    if (mealPlan) {
      refreshedMealPlan = await refreshMealPlanPreview(mealPlan, nextInventory);
    }
  }

  const shoppingList = await buildShoppingListFromSource(
    result.value.sourceType,
    result.value.sourceId,
    true,
    context.scope,
  );

  sendJson(response, 200, {
    data: {
      updatedInventoryItems: nextInventory,
      appliedItems,
      skippedItems,
      shoppingList,
      mealPlan: refreshedMealPlan ?? null,
    },
  });
}

async function handleCreateWeeklyPlan(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const result = validateWeeklyPlanCreate(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  if (result.value.conversationId) {
    const conversation = await readConversation(context.scope, result.value.conversationId);
    if (!conversation) {
      sendError(response, 404, requestId, "not_found", "Conversation not found");
      return;
    }
  }

  const inventory = await listInventoryItems(context.scope);
  let weeklyPlan: WeeklyPlanRecord;
  try {
    weeklyPlan = (await tryGenerateWeeklyPlanWithDeepSeek({
      message: result.value.message,
      preferenceTags: result.value.preferenceTags,
      startDate: result.value.startDate,
      days: result.value.days,
      inventory,
      userId: context.user.id,
      conversationId: result.value.conversationId,
      workspaceId: context.workspaceId,
    })) ?? generateWeeklyPlan(
      result.value.message,
      result.value.preferenceTags,
      result.value.startDate,
      result.value.days,
      inventory,
      context.user.id,
      result.value.conversationId,
      context.workspaceId,
    );
  } catch {
    weeklyPlan = generateWeeklyPlan(
      result.value.message,
      result.value.preferenceTags,
      result.value.startDate,
      result.value.days,
      inventory,
      context.user.id,
      result.value.conversationId,
      context.workspaceId,
    );
    weeklyPlan.generationMeta = { source: "fallback", model: "rule_planner" };
    weeklyPlan.description = `${weeklyPlan.description} 本次改用基础规则生成，结果仍可继续调整。`;
  }
  weeklyPlan.workspaceId = context.workspaceId;
  await createWeeklyPlan(weeklyPlan);
  sendJson(response, 201, { data: weeklyPlan });
}

async function handleGetWeeklyPlan(request: IncomingMessage, response: ServerResponse, requestId: string, weeklyPlanId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const weeklyPlan = await readWeeklyPlan(context.scope, weeklyPlanId);
  if (!weeklyPlan) {
    sendError(response, 404, requestId, "not_found", "Weekly plan not found");
    return;
  }
  sendJson(response, 200, { data: weeklyPlan });
}

async function handlePatchWeeklyPlanDay(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  weeklyPlanId: string,
  date: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const weeklyPlan = await readWeeklyPlan(context.scope, weeklyPlanId);
  if (!weeklyPlan) {
    sendError(response, 404, requestId, "not_found", "Weekly plan not found");
    return;
  }
  const day = weeklyPlan.days.find((item) => item.date === date);
  if (!day) {
    sendError(response, 404, requestId, "not_found", "Weekly plan day not found");
    return;
  }

  const result = validateWeeklyDayPatch(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const inventory = await listInventoryItems(context.scope);
  const updatedWeeklyPlan = adjustWeeklyPlanDay(weeklyPlan, date, result.value.replaceMeals, inventory);
  await updateWeeklyPlan(updatedWeeklyPlan);

  const workspaceState = await readWorkspaceState(context.scope);
  if (workspaceState.currentWeeklyPlanId === updatedWeeklyPlan.id && workspaceState.planningMode === "weekly") {
    await buildShoppingListFromSource("weekly_plan", updatedWeeklyPlan.id, true, context.scope);
  }

  sendJson(response, 200, { data: updatedWeeklyPlan });
}

async function handleAdoptWeeklyPlan(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  weeklyPlanId: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const weeklyPlan = await readWeeklyPlan(context.scope, weeklyPlanId);
  if (!weeklyPlan) {
    sendError(response, 404, requestId, "not_found", "Weekly plan not found");
    return;
  }

  const result = validateWeeklyPlanAdopt(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const adoptValue = result.value;
  const selectedDay = weeklyPlan.days.find((item) => item.date === adoptValue.selectedDate)
    ?? weeklyPlan.days.find((item) => item.day === weekdayFromDate(adoptValue.selectedDate ?? weeklyPlan.days[0]?.date ?? "2026-05-04"))
    ?? weeklyPlan.days[0];

  const profile = await readProfile(context.scope);
  const inventory = await listInventoryItems(context.scope);
  const syncedMealPlan = createDailyMealPlanFromMeals(
    (selectedDay?.meals ?? []).map((meal) => ({
      ...meal,
      nutrition: { ...meal.nutrition },
      ingredients: meal.ingredients.map((item) => ({ ...item })),
      steps: [...meal.steps],
    })),
    profile,
    inventory,
    [],
    weeklyPlan.userId,
    weeklyPlan.conversationId,
    weeklyPlan.workspaceId,
    `Adopt weekly plan ${weeklyPlan.id}`,
    `已采用本周计划，并把 ${selectedDay?.day ?? "今天"} 的三餐同步到今日执行。`,
    weeklyPlan.insights,
  );
  await createMealPlan(syncedMealPlan);

  const updatedWeeklyPlan: WeeklyPlanRecord = {
    ...weeklyPlan,
    adopted: true,
    updatedAt: nowIso(),
  };
  await updateWeeklyPlan(updatedWeeklyPlan);

  const shoppingList = await buildShoppingListFromSource("weekly_plan", updatedWeeklyPlan.id, true, context.scope);
  const workspaceState = await readWorkspaceState(context.scope);
  await updateWorkspaceState({
    ...workspaceState,
    workspaceId: context.workspaceId,
    currentWeeklyPlanId: updatedWeeklyPlan.id,
    currentMealPlanId: syncedMealPlan.id,
    currentShoppingListId: shoppingList?.id,
    planningMode: "weekly",
    selectedWeekday: selectedDay?.day ?? updatedWeeklyPlan.days[0]?.day,
    updatedAt: nowIso(),
  });

  sendJson(response, 200, {
    data: {
      weeklyPlanId: updatedWeeklyPlan.id,
      adopted: true,
      syncedMealPlanId: syncedMealPlan.id,
      shoppingListId: shoppingList?.id ?? null,
    },
  });
}

async function handleCreateConversation(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const result = validateConversationCreate(await readJsonBody(request), nowIso(), createId("conv"), context.user.id, context.workspaceId);
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }
  await createConversation(result.value);
  const workspaceState = await readWorkspaceState(context.scope);
  await updateWorkspaceState({
    ...workspaceState,
    workspaceId: context.workspaceId,
    currentConversationId: result.value.id,
    updatedAt: nowIso(),
  });
  sendJson(response, 201, { data: result.value });
}

async function handleListConversations(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const context = await resolveRequestContext(request);
  const conversations = await listConversations(context.scope);
  sendJson(response, 200, { data: conversations, meta: { total: conversations.length } });
}

async function handleListConversationMessages(request: IncomingMessage, response: ServerResponse, requestId: string, conversationId: string): Promise<void> {
  const context = await resolveRequestContext(request);
  const conversation = await readConversation(context.scope, conversationId);
  if (!conversation) {
    sendError(response, 404, requestId, "not_found", "Conversation not found");
    return;
  }
  const messages = await listConversationMessages(context.scope, conversationId);
  sendJson(response, 200, { data: messages.map(mapConversationMessage), meta: { total: messages.length } });
}

async function handleCreateConversationMessage(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  conversationId: string,
): Promise<void> {
  const context = await resolveRequestContext(request);
  const conversation = await readConversation(context.scope, conversationId);
  if (!conversation) {
    sendError(response, 404, requestId, "not_found", "Conversation not found");
    return;
  }

  const result = validateConversationMessageCreate(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const userCreatedAt = nowIso();
  const userMessage: ConversationMessageRecord = {
    id: createId("msg"),
    userId: context.user.id,
    workspaceId: context.workspaceId,
    conversationId,
    role: "user",
    content: result.value.content,
    createdAt: userCreatedAt,
  };

  const inventory = await listInventoryItems(context.scope);
  const profile = await readProfile(context.scope);
  let mealPlan: MealPlanRecord | undefined;
  let weeklyPlan: WeeklyPlanRecord | undefined;
  const shouldGenerateMealPlan = result.value.triggerPlanGeneration && shouldGenerateMealPlanFromMessage(result.value.content);
  let generalReply: string | null = null;
  if (shouldGenerateMealPlan) {
    if (result.value.mode === "weekly") {
      try {
        weeklyPlan = (await tryGenerateWeeklyPlanWithDeepSeek({
          message: result.value.content,
          preferenceTags: [],
          startDate: nowIso().slice(0, 10),
          days: 7,
          inventory,
          userId: context.user.id,
          conversationId,
          workspaceId: context.workspaceId,
        })) ?? generateWeeklyPlan(
          result.value.content,
          [],
          nowIso().slice(0, 10),
          7,
          inventory,
          context.user.id,
          conversationId,
          context.workspaceId,
        );
      } catch {
        weeklyPlan = generateWeeklyPlan(
          result.value.content,
          [],
          nowIso().slice(0, 10),
          7,
          inventory,
          context.user.id,
          conversationId,
          context.workspaceId,
        );
        weeklyPlan.generationMeta = { source: "fallback", model: "rule_planner" };
        weeklyPlan.description = `${weeklyPlan.description} 本次改用基础规则生成，结果仍可继续调整。`;
      }
    } else {
      try {
        mealPlan = (await tryGenerateDailyMealPlanWithDeepSeek({
          message: result.value.content,
          profile,
          inventory,
          previousShoppingList: [],
          conversationId,
          userId: context.user.id,
          conversationMessages: await listConversationMessages(context.scope, conversationId),
        })) ?? generateDailyMealPlan(result.value.content, profile, inventory, [], context.user.id, conversationId, context.workspaceId);
      } catch {
        mealPlan = generateDailyMealPlan(result.value.content, profile, inventory, [], context.user.id, conversationId, context.workspaceId);
        mealPlan.generationMeta = { source: "fallback", model: "rule_planner" };
        mealPlan.reply = `${mealPlan.reply} 本次改用基础规则生成，结果仍可继续调整。`;
      }
    }
  } else {
    generalReply = answerSimpleGeneralQuestion(result.value.content)
      ?? await tryAnswerGeneralQuestionWithDeepSeek({
        message: result.value.content,
        userId: context.user.id,
        workspaceId: context.workspaceId,
      });
  }

  let shoppingList: ShoppingListRecord | null = null;
  if (mealPlan) {
    await createMealPlan(mealPlan);
    mealPlan.workspaceId = context.workspaceId;
    shoppingList = await buildShoppingListFromSource("meal_plan", mealPlan.id, true, context.scope);
  }
  if (weeklyPlan) {
    await createWeeklyPlan(weeklyPlan);
    weeklyPlan.workspaceId = context.workspaceId;
  }

  const assistantCreatedAt = nowIso();
  const assistantMessage: ConversationMessageRecord = {
    id: createId("msg"),
    userId: context.user.id,
    workspaceId: context.workspaceId,
    conversationId,
    role: "assistant",
    content: mealPlan?.reply
      ?? (weeklyPlan ? `我已经整理出一份本周候选计划「${weeklyPlan.title}」，你确认采用后，今日三餐、营养和购物清单才会正式切换。` : null)
      ?? generalReply
      ?? "我可以回答普通问题；如果你想生成餐单，请告诉我口味、营养目标或库存食材。",
    mealPlanId: mealPlan?.id,
    shoppingListId: shoppingList?.id,
    weeklyPlanId: weeklyPlan?.id,
    createdAt: assistantCreatedAt,
  };

  await createConversationMessages([userMessage, assistantMessage]);
  await updateConversation({
    ...conversation,
    lastMessageAt: assistantCreatedAt,
    updatedAt: assistantCreatedAt,
  });

  const workspaceState = await readWorkspaceState(context.scope);
  await updateWorkspaceState({
    ...workspaceState,
    workspaceId: context.workspaceId,
    currentConversationId: conversationId,
    updatedAt: nowIso(),
  });

  sendJson(response, 201, {
    data: {
      userMessage: mapConversationMessage(userMessage),
      assistantMessage: mapConversationMessage(assistantMessage),
      mealPlan: mealPlan ?? null,
      shoppingList,
      weeklyPlan: weeklyPlan ?? null,
    },
  });
}

const server = createServer(async (request, response) => {
  const requestId = createRequestId();
  response.setHeader("X-Request-Id", requestId);
  response.setHeader("Access-Control-Allow-Origin", request.headers.origin ?? "*");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const pathname = getPathname(request);

    if (request.method === "GET" && pathname === "/api/v1/health") {
      await handleHealth(response);
      return;
    }

    if (pathname === "/api/v1/auth/guest" && request.method === "POST") {
      await handleAuthGuest(request, response);
      return;
    }

    if (pathname === "/api/v1/session" && request.method === "GET") {
      await handleGetSession(request, response, requestId);
      return;
    }

    if (pathname === "/api/v1/workspace-state") {
      if (request.method === "GET") {
        await handleGetWorkspaceState(request, response);
        return;
      }
      if (request.method === "PATCH") {
        await handlePatchWorkspaceState(request, response, requestId);
        return;
      }
    }

    if (pathname === "/api/v1/profile") {
      if (request.method === "GET") {
        await handleGetProfile(request, response);
        return;
      }

      if (request.method === "PATCH") {
        await handlePatchProfile(request, response, requestId);
        return;
      }
    }

    if (pathname === "/api/v1/inventory-items") {
      if (request.method === "GET") {
        await handleListInventory(request, response);
        return;
      }

      if (request.method === "POST") {
        await handleCreateInventory(request, response, requestId);
        return;
      }
    }

    const inventoryItemMatch = pathname.match(/^\/api\/v1\/inventory-items\/([^/]+)$/);
    if (inventoryItemMatch) {
      const inventoryItemId = inventoryItemMatch[1];

      if (request.method === "PATCH") {
        await handlePatchInventory(request, response, requestId, inventoryItemId);
        return;
      }

      if (request.method === "DELETE") {
        await handleDeleteInventory(request, response, requestId, inventoryItemId);
        return;
      }
    }

    if (pathname === "/api/v1/meal-plans" && request.method === "POST") {
      await handleCreateMealPlan(request, response, requestId);
      return;
    }

    const regenerateMealMatch = pathname.match(/^\/api\/v1\/meal-plans\/([^/]+)\/meals\/(breakfast|lunch|dinner)\/regenerate$/);
    if (regenerateMealMatch && request.method === "POST") {
      await handleRegenerateMeal(request, response, requestId, regenerateMealMatch[1], regenerateMealMatch[2] as MealType);
      return;
    }

    const mealPlanAdoptMatch = pathname.match(/^\/api\/v1\/meal-plans\/([^/]+)\/adopt$/);
    if (mealPlanAdoptMatch && request.method === "POST") {
      await handleAdoptMealPlan(request, response, requestId, mealPlanAdoptMatch[1]);
      return;
    }

    const mealPlanMatch = pathname.match(/^\/api\/v1\/meal-plans\/([^/]+)$/);
    if (mealPlanMatch && request.method === "GET") {
      await handleGetMealPlan(request, response, requestId, mealPlanMatch[1]);
      return;
    }

    if (pathname === "/api/v1/weekly-plans" && request.method === "POST") {
      await handleCreateWeeklyPlan(request, response, requestId);
      return;
    }

    const weeklyDayMatch = pathname.match(/^\/api\/v1\/weekly-plans\/([^/]+)\/days\/(\d{4}-\d{2}-\d{2})$/);
    if (weeklyDayMatch && request.method === "PATCH") {
      await handlePatchWeeklyPlanDay(request, response, requestId, weeklyDayMatch[1], weeklyDayMatch[2]);
      return;
    }

    const weeklyAdoptMatch = pathname.match(/^\/api\/v1\/weekly-plans\/([^/]+)\/adopt$/);
    if (weeklyAdoptMatch && request.method === "POST") {
      await handleAdoptWeeklyPlan(request, response, requestId, weeklyAdoptMatch[1]);
      return;
    }

    const weeklyPlanMatch = pathname.match(/^\/api\/v1\/weekly-plans\/([^/]+)$/);
    if (weeklyPlanMatch && request.method === "GET") {
      await handleGetWeeklyPlan(request, response, requestId, weeklyPlanMatch[1]);
      return;
    }

    if (pathname === "/api/v1/shopping-lists/generate" && request.method === "POST") {
      await handleGenerateShoppingList(request, response, requestId);
      return;
    }

    if (pathname === "/api/v1/inventory-consumptions/apply" && request.method === "POST") {
      await handleApplyInventoryConsumption(request, response, requestId);
      return;
    }

    if (pathname === "/api/v1/shopping-lists/current" && request.method === "GET") {
      await handleGetCurrentShoppingList(request, response, requestId);
      return;
    }

    const shoppingItemMatch = pathname.match(/^\/api\/v1\/shopping-lists\/([^/]+)\/items\/([^/]+)$/);
    if (shoppingItemMatch && request.method === "PATCH") {
      await handlePatchShoppingListItem(request, response, requestId, shoppingItemMatch[1], shoppingItemMatch[2]);
      return;
    }

    if (pathname === "/api/v1/conversations") {
      if (request.method === "POST") {
        await handleCreateConversation(request, response, requestId);
        return;
      }
      if (request.method === "GET") {
        await handleListConversations(request, response);
        return;
      }
    }

    const conversationMessagesMatch = pathname.match(/^\/api\/v1\/conversations\/([^/]+)\/messages$/);
    if (conversationMessagesMatch) {
      if (request.method === "GET") {
        await handleListConversationMessages(request, response, requestId, conversationMessagesMatch[1]);
        return;
      }
      if (request.method === "POST") {
        await handleCreateConversationMessage(request, response, requestId, conversationMessagesMatch[1]);
        return;
      }
    }

    sendError(response, 404, requestId, "not_found", "Route not found");
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendError(response, 400, requestId, "invalid_json", "Invalid JSON body");
      return;
    }

    console.error(error);
    sendError(response, 500, requestId, "internal_error", "Internal server error");
  }
});

server.listen(port, () => {
  console.log(`SmartMeal API listening on http://localhost:${port}`);
});
