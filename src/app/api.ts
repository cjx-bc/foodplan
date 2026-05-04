import type {
  Conversation,
  ChatMessage,
  InventoryCategory,
  InventoryItem,
  MealPlan,
  MealType,
  ShoppingList,
  WeeklyPlan,
} from "../types/smartmeal";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

type ApiEnvelope<T> = {
  data: T;
};

type ApiListEnvelope<T> = {
  data: T[];
  meta: {
    total: number;
  };
};

type ApiError = {
  error?: {
    message?: string;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(errorBody.error?.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function parseQuantity(value: string) {
  const matched = value.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)$/);
  if (!matched) {
    return {
      quantity: value,
      quantityValue: 1,
      quantityUnit: "portion",
    };
  }

  return {
    quantity: value,
    quantityValue: Number(matched[1]),
    quantityUnit: matched[2].trim(),
  };
}

export async function getProfile() {
  const response = await request<ApiEnvelope<{
    id: string;
    name: string;
    dailyCalorieTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
    fiberTarget: number;
    tastePreferences: string[];
    dietaryRestrictions: string[];
  }>>("/profile");
  return response.data;
}

export async function getInventoryItems() {
  const response = await request<ApiListEnvelope<InventoryItem>>("/inventory-items");
  return response.data;
}

export async function createInventoryItem(value: {
  name: string;
  category: InventoryCategory;
  quantity: string;
  expireDate: string;
}) {
  const parsedQuantity = parseQuantity(value.quantity);
  const response = await request<ApiEnvelope<InventoryItem>>("/inventory-items", {
    method: "POST",
    body: JSON.stringify({
      ...value,
      quantity: parsedQuantity.quantity,
      quantityValue: parsedQuantity.quantityValue,
      quantityUnit: parsedQuantity.quantityUnit,
    }),
  });
  return response.data;
}

export async function createConversation(title: string) {
  const response = await request<ApiEnvelope<Conversation>>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return response.data;
}

export async function getConversationMessages(conversationId: string) {
  const response = await request<ApiListEnvelope<ChatMessage>>(`/conversations/${conversationId}/messages`);
  return response.data;
}

export async function sendConversationMessage(
  conversationId: string,
  content: string,
  mode: "daily" | "weekly" = "daily",
) {
  const response = await request<ApiEnvelope<{
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    mealPlan: MealPlan | null;
    shoppingList: ShoppingList | null;
  }>>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      mode,
      triggerPlanGeneration: true,
    }),
  });
  return response.data;
}

export async function getMealPlan(mealPlanId: string) {
  const response = await request<ApiEnvelope<MealPlan>>(`/meal-plans/${mealPlanId}`);
  return response.data;
}

export async function regenerateMeal(mealPlanId: string, mealType: MealType, reason: string) {
  const response = await request<ApiEnvelope<{
    mealPlan: MealPlan;
    shoppingListResource: ShoppingList | null;
  }>>(`/meal-plans/${mealPlanId}/meals/${mealType}/regenerate`, {
    method: "POST",
    body: JSON.stringify({
      reason,
      message: `${mealType} 换一个`,
    }),
  });
  return response.data;
}

export async function generateShoppingList(sourceType: "meal_plan" | "weekly_plan", sourceId: string) {
  const response = await request<ApiEnvelope<ShoppingList>>("/shopping-lists/generate", {
    method: "POST",
    body: JSON.stringify({
      sourceType,
      sourceId,
      preserveCheckedState: true,
    }),
  });
  return response.data;
}

export async function getCurrentShoppingList(sourceType: "meal_plan" | "weekly_plan", sourceId: string) {
  const params = new URLSearchParams({ sourceType, sourceId });
  const response = await request<ApiEnvelope<ShoppingList>>(`/shopping-lists/current?${params.toString()}`);
  return response.data;
}

export async function toggleShoppingItem(shoppingListId: string, itemId: string, checked: boolean) {
  const response = await request<ApiEnvelope<ShoppingList>>(`/shopping-lists/${shoppingListId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ checked }),
  });
  return response.data;
}

export async function createWeeklyPlan(payload: {
  message: string;
  preferenceTags: string[];
  startDate: string;
  days: number;
  conversationId?: string;
}) {
  const response = await request<ApiEnvelope<WeeklyPlan>>("/weekly-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function getWeeklyPlan(weeklyPlanId: string) {
  const response = await request<ApiEnvelope<WeeklyPlan>>(`/weekly-plans/${weeklyPlanId}`);
  return response.data;
}

export async function patchWeeklyPlanDay(weeklyPlanId: string, date: string, replaceMeals: MealType[]) {
  const response = await request<ApiEnvelope<WeeklyPlan>>(`/weekly-plans/${weeklyPlanId}/days/${date}`, {
    method: "PATCH",
    body: JSON.stringify({
      message: "微调这一天",
      replaceMeals,
    }),
  });
  return response.data;
}

export async function adoptWeeklyPlan(weeklyPlanId: string, selectedDate?: string) {
  const response = await request<ApiEnvelope<{
    weeklyPlanId: string;
    adopted: boolean;
    syncedMealPlanId: string;
    shoppingListId: string | null;
  }>>(`/weekly-plans/${weeklyPlanId}/adopt`, {
    method: "POST",
    body: JSON.stringify(selectedDate ? { selectedDate } : {}),
  });
  return response.data;
}
