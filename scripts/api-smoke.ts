const baseUrl = process.env.SMARTMEAL_API_URL ?? "http://localhost:8787/api/v1";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

class CookieClient {
  private cookie = "";

  async request(path: string, init?: RequestInit) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      this.cookie = setCookie.split(";")[0] ?? this.cookie;
    }

    const text = await response.text();
    const body = text ? (JSON.parse(text) as JsonValue) : null;

    if (!response.ok) {
      throw new Error(`Request failed ${response.status} ${path}: ${JSON.stringify(body)}`);
    }

    return body as { data: JsonValue; meta?: JsonValue };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const client = new CookieClient();
  await client.request("/auth/guest", {
    method: "POST",
    body: JSON.stringify({}),
  });

  const conversation = await client.request("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "API Smoke Test" }),
  });
  const conversationId = (conversation.data as { id: string }).id;
  assert(conversationId, "conversationId missing");

  const chatResult = await client.request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "今天清淡，多用鸡蛋和番茄。",
      mode: "daily",
      triggerPlanGeneration: true,
    }),
  });

  const mealPlan = (chatResult.data as { mealPlan: { id: string } | null }).mealPlan;
  assert(mealPlan?.id, "meal plan not created from chat");

  const shoppingList = (chatResult.data as { shoppingList: { id: string } | null }).shoppingList;
  assert(shoppingList?.id, "shopping list not returned from chat");

  const mealPlanDetail = await client.request(`/meal-plans/${mealPlan.id}`);
  assert((mealPlanDetail.data as { id: string }).id === mealPlan.id, "meal plan detail mismatch");

  const regenerated = await client.request(`/meal-plans/${mealPlan.id}/meals/lunch/regenerate`, {
    method: "POST",
    body: JSON.stringify({
      reason: "提升蛋白质",
      message: "午餐换一个",
    }),
  });
  assert((regenerated.data as { mealPlan: { id: string } }).mealPlan.id === mealPlan.id, "meal regenerate did not preserve meal plan id");

  const currentShopping = await client.request(`/shopping-lists/current?sourceType=meal_plan&sourceId=${mealPlan.id}`);
  const currentShoppingData = currentShopping.data as { id: string; items: Array<{ id: string; checked: boolean }> };
  assert(currentShoppingData.items.length > 0, "shopping list is empty");

  await client.request(`/shopping-lists/${currentShoppingData.id}/items/${currentShoppingData.items[0].id}`, {
    method: "PATCH",
    body: JSON.stringify({ checked: !currentShoppingData.items[0].checked }),
  });

  const weekly = await client.request("/weekly-plans", {
    method: "POST",
    body: JSON.stringify({
      message: "本周尽量清淡，高蛋白。",
      preferenceTags: ["light", "high_protein"],
      startDate: "2026-05-04",
      days: 7,
      conversationId,
    }),
  });
  const weeklyPlan = weekly.data as { id: string; days: Array<{ date: string }> };
  assert(weeklyPlan.id, "weekly plan not created");
  assert(weeklyPlan.days.length === 7, "weekly plan should contain 7 days");

  const adjusted = await client.request(`/weekly-plans/${weeklyPlan.id}/days/${weeklyPlan.days[0].date}`, {
    method: "PATCH",
    body: JSON.stringify({
      message: "微调第一天晚餐",
      replaceMeals: ["dinner"],
    }),
  });
  assert((adjusted.data as { id: string }).id === weeklyPlan.id, "weekly patch returned wrong plan");

  const adopted = await client.request(`/weekly-plans/${weeklyPlan.id}/adopt`, {
    method: "POST",
    body: JSON.stringify({ selectedDate: weeklyPlan.days[0].date }),
  });
  const adoptData = adopted.data as { adopted: boolean; syncedMealPlanId: string; shoppingListId: string | null };
  assert(adoptData.adopted, "weekly plan was not adopted");
  assert(adoptData.syncedMealPlanId, "synced meal plan id missing after adopt");
  assert(adoptData.shoppingListId, "weekly shopping list id missing after adopt");

  await client.request(`/shopping-lists/current?sourceType=weekly_plan&sourceId=${weeklyPlan.id}`);
  await client.request(`/meal-plans/${adoptData.syncedMealPlanId}`);

  console.log("SmartMeal API smoke test passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
