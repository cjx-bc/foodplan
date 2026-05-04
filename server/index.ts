import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { generateDailyMealPlan, deriveShoppingItems } from "./planner.js";
import { sendError, sendJson, sendNoContent } from "./responses.js";
import {
  createConversation,
  createConversationMessages,
  createMealPlan,
  listConversationMessages,
  listConversations,
  listInventoryItems,
  readConversation,
  readMealPlan,
  readProfile,
  readShoppingList,
  readShoppingListBySource,
  replaceInventoryItems,
  updateConversation,
  updateProfile,
  upsertShoppingList,
} from "./store.js";
import type { ConversationMessageRecord, ShoppingListRecord } from "./types.js";
import {
  validateConversationCreate,
  validateConversationMessageCreate,
  validateInventoryCreate,
  validateInventoryPatch,
  validateMealPlanCreate,
  validateProfilePatch,
  validateShoppingListGenerate,
  validateShoppingListItemPatch,
} from "./validators.js";
import { createId, createRequestId, nowIso } from "./utils.js";

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

async function handleHealth(response: ServerResponse): Promise<void> {
  sendJson(response, 200, {
    data: {
      status: "ok",
      service: "smartmeal-api",
      version: "0.1.0",
      timestamp: nowIso(),
    },
  });
}

async function handleGetProfile(response: ServerResponse): Promise<void> {
  const profile = await readProfile();
  sendJson(response, 200, { data: profile });
}

async function handlePatchProfile(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const currentProfile = await readProfile();
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

  let items = await listInventoryItems();

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
  const result = validateInventoryCreate(body, nowIso(), createId("inv"));

  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const currentItems = await listInventoryItems();
  const items = await replaceInventoryItems([result.value, ...currentItems]);
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
  const currentItems = await listInventoryItems();
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

  const nextItem = result.value;
  const updatedItems = currentItems.map((item) => (item.id === inventoryItemId ? nextItem : item));
  await replaceInventoryItems(updatedItems);
  sendJson(response, 200, { data: nextItem });
}

async function handleDeleteInventory(response: ServerResponse, requestId: string, inventoryItemId: string): Promise<void> {
  const currentItems = await listInventoryItems();
  const nextItems = currentItems.filter((item) => item.id !== inventoryItemId);

  if (nextItems.length === currentItems.length) {
    sendError(response, 404, requestId, "not_found", "Inventory item not found");
    return;
  }

  await replaceInventoryItems(nextItems);
  sendNoContent(response);
}

async function handleCreateMealPlan(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const result = validateMealPlanCreate(body);
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  if (result.value.conversationId) {
    const conversation = await readConversation(result.value.conversationId);
    if (!conversation) {
      sendError(response, 404, requestId, "not_found", "Conversation not found");
      return;
    }
  }

  const profile = await readProfile();
  const inventory = await listInventoryItems();
  const mealPlan = generateDailyMealPlan(result.value.message, profile, inventory, [], result.value.conversationId);
  await createMealPlan(mealPlan);
  sendJson(response, 201, { data: mealPlan });
}

async function handleGetMealPlan(response: ServerResponse, requestId: string, mealPlanId: string): Promise<void> {
  const mealPlan = await readMealPlan(mealPlanId);
  if (!mealPlan) {
    sendError(response, 404, requestId, "not_found", "Meal plan not found");
    return;
  }
  sendJson(response, 200, { data: mealPlan });
}

async function handleGenerateShoppingList(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const body = await readJsonBody(request);
  const result = validateShoppingListGenerate(body);
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  if (result.value.sourceType !== "meal_plan") {
    sendError(response, 422, requestId, "validation_error", "Only meal_plan source is supported for now");
    return;
  }

  const mealPlan = await readMealPlan(result.value.sourceId);
  if (!mealPlan) {
    sendError(response, 404, requestId, "not_found", "Meal plan not found");
    return;
  }

  const inventory = await listInventoryItems();
  const currentList = await readShoppingListBySource("meal_plan", mealPlan.id);
  const items = deriveShoppingItems(mealPlan.meals, inventory, result.value.preserveCheckedState ? currentList?.items : []);
  const updatedAt = nowIso();
  const shoppingList: ShoppingListRecord = {
    id: currentList?.id ?? createId("shop"),
    sourceType: "meal_plan",
    sourceId: mealPlan.id,
    items,
    createdAt: currentList?.createdAt ?? updatedAt,
    updatedAt,
  };

  await upsertShoppingList(shoppingList);
  sendJson(response, 200, { data: shoppingList });
}

async function handleGetCurrentShoppingList(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const url = getUrl(request);
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

  const shoppingList = await readShoppingListBySource(sourceType, sourceId);
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
  const currentList = await readShoppingList(shoppingListId);
  if (!currentList) {
    sendError(response, 404, requestId, "not_found", "Shopping list not found");
    return;
  }

  const body = await readJsonBody(request);
  const result = validateShoppingListItemPatch(body, currentList, itemId);
  if (!result.value) {
    const notFound = result.errors.some((item) => item.field === "itemId");
    sendError(response, notFound ? 404 : 422, requestId, notFound ? "not_found" : "validation_error", notFound ? "Shopping list item not found" : "Request validation failed", notFound ? undefined : result.errors);
    return;
  }

  const updated = {
    ...result.value,
    updatedAt: nowIso(),
  };
  await upsertShoppingList(updated);
  sendJson(response, 200, { data: updated });
}

async function handleCreateConversation(request: IncomingMessage, response: ServerResponse, requestId: string): Promise<void> {
  const result = validateConversationCreate(await readJsonBody(request), nowIso(), createId("conv"));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }
  await createConversation(result.value);
  sendJson(response, 201, { data: result.value });
}

async function handleListConversations(response: ServerResponse): Promise<void> {
  const conversations = await listConversations();
  sendJson(response, 200, { data: conversations, meta: { total: conversations.length } });
}

async function handleListConversationMessages(response: ServerResponse, requestId: string, conversationId: string): Promise<void> {
  const conversation = await readConversation(conversationId);
  if (!conversation) {
    sendError(response, 404, requestId, "not_found", "Conversation not found");
    return;
  }
  const messages = await listConversationMessages(conversationId);
  const payload = messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    structuredResult: message.mealPlanId ? { mealPlanId: message.mealPlanId } : null,
  }));
  sendJson(response, 200, { data: payload, meta: { total: payload.length } });
}

async function handleCreateConversationMessage(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await readConversation(conversationId);
  if (!conversation) {
    sendError(response, 404, requestId, "not_found", "Conversation not found");
    return;
  }

  const result = validateConversationMessageCreate(await readJsonBody(request));
  if (!result.value) {
    sendError(response, 422, requestId, "validation_error", "Request validation failed", result.errors);
    return;
  }

  const createdAt = nowIso();
  const userMessage: ConversationMessageRecord = {
    id: createId("msg"),
    conversationId,
    role: "user",
    content: result.value.content,
    createdAt,
  };

  const inventory = await listInventoryItems();
  const profile = await readProfile();
  const mealPlan = result.value.triggerPlanGeneration
    ? generateDailyMealPlan(result.value.content, profile, inventory, [], conversationId)
    : undefined;

  if (mealPlan) {
    await createMealPlan(mealPlan);
  }

  const assistantMessage: ConversationMessageRecord = {
    id: createId("msg"),
    conversationId,
    role: "assistant",
    content: mealPlan?.reply ?? "我已经记录这条偏好，稍后可以继续生成餐单。",
    mealPlanId: mealPlan?.id,
    createdAt: nowIso(),
  };

  await createConversationMessages([userMessage, assistantMessage]);
  await updateConversation({
    ...conversation,
    lastMessageAt: assistantMessage.createdAt,
    updatedAt: assistantMessage.createdAt,
  });

  if (mealPlan) {
    await upsertShoppingList({
      id: createId("shop"),
      sourceType: "meal_plan",
      sourceId: mealPlan.id,
      items: mealPlan.shoppingList,
      createdAt: assistantMessage.createdAt,
      updatedAt: assistantMessage.createdAt,
    });
  }

  sendJson(response, 201, {
    data: {
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
        structuredResult: mealPlan ? { mealPlanId: mealPlan.id } : null,
      },
      mealPlan: mealPlan ?? null,
    },
  });
}

const server = createServer(async (request, response) => {
  const requestId = createRequestId();
  response.setHeader("X-Request-Id", requestId);
  response.setHeader("Access-Control-Allow-Origin", "*");
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

    if (pathname === "/api/v1/profile") {
      if (request.method === "GET") {
        await handleGetProfile(response);
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
        await handleDeleteInventory(response, requestId, inventoryItemId);
        return;
      }
    }

    if (pathname === "/api/v1/meal-plans") {
      if (request.method === "POST") {
        await handleCreateMealPlan(request, response, requestId);
        return;
      }
    }

    const mealPlanMatch = pathname.match(/^\/api\/v1\/meal-plans\/([^/]+)$/);
    if (mealPlanMatch && request.method === "GET") {
      await handleGetMealPlan(response, requestId, mealPlanMatch[1]);
      return;
    }

    if (pathname === "/api/v1/shopping-lists/generate" && request.method === "POST") {
      await handleGenerateShoppingList(request, response, requestId);
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
        await handleListConversations(response);
        return;
      }
    }

    const conversationMessagesMatch = pathname.match(/^\/api\/v1\/conversations\/([^/]+)\/messages$/);
    if (conversationMessagesMatch) {
      if (request.method === "GET") {
        await handleListConversationMessages(response, requestId, conversationMessagesMatch[1]);
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
