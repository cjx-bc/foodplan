const baseUrl = process.env.SMARTMEAL_API_URL ?? "http://localhost:8787/api/v1";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

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
    const body = text ? (JSON.parse(text) as { data?: JsonValue; error?: JsonValue }) : {};
    return { response, body };
  }
}

async function main() {
  const clientA = new CookieClient();
  const clientB = new CookieClient();

  const authA = await clientA.request("/auth/guest", { method: "POST", body: "{}" });
  const authB = await clientB.request("/auth/guest", { method: "POST", body: "{}" });
  assert(authA.response.status === 201, "client A auth failed");
  assert(authB.response.status === 201, "client B auth failed");

  const sessionA = authA.body.data as { workspaceId: string; userId: string };
  const sessionB = authB.body.data as { workspaceId: string; userId: string };
  assert(sessionA.workspaceId !== sessionB.workspaceId, "guest sessions should not share the same workspace");
  assert(sessionA.userId !== sessionB.userId, "guest sessions should not share the same user");

  const conversationA = await clientA.request("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Workspace A" }),
  });
  assert(conversationA.response.status === 201, "client A conversation creation failed");
  const conversationId = (conversationA.body.data as { id: string }).id;

  const readByB = await clientB.request(`/conversations/${conversationId}/messages`);
  assert(readByB.response.status === 404, "workspace B should not read workspace A conversation");

  const chatA = await clientA.request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "今天清淡，多用鸡蛋和番茄。",
      mode: "daily",
      triggerPlanGeneration: true,
    }),
  });
  assert(chatA.response.status === 201, "client A chat generation failed");
  const chatData = chatA.body.data as {
    mealPlan: { id: string } | null;
    shoppingList: { id: string } | null;
  };
  assert(chatData.mealPlan?.id, "client A meal plan missing");
  assert(chatData.shoppingList?.id, "client A shopping list missing");

  const mealPlanByB = await clientB.request(`/meal-plans/${chatData.mealPlan.id}`);
  assert(mealPlanByB.response.status === 404, "workspace B should not read workspace A meal plan");

  const shoppingByB = await clientB.request(`/shopping-lists/current?sourceType=meal_plan&sourceId=${chatData.mealPlan.id}`);
  assert(shoppingByB.response.status === 404, "workspace B should not read workspace A shopping list by source");

  const inventoryA = await clientA.request("/inventory-items", {
    method: "POST",
    body: JSON.stringify({
      name: "测试鸡蛋",
      category: "meat_egg",
      quantity: "6 piece",
      quantityValue: 6,
      quantityUnit: "piece",
      expireDate: "2026-05-09",
    }),
  });
  assert(inventoryA.response.status === 201, "client A inventory creation failed");

  const inventoryListB = await clientB.request("/inventory-items");
  const itemsB = (inventoryListB.body.data as Array<{ name: string }>) ?? [];
  assert(itemsB.every((item) => item.name !== "测试鸡蛋"), "workspace B should not see workspace A inventory");

  const weeklyA = await clientA.request("/weekly-plans", {
    method: "POST",
    body: JSON.stringify({
      message: "本周清淡，高蛋白。",
      preferenceTags: ["light", "high_protein"],
      startDate: "2026-05-04",
      days: 7,
      conversationId,
    }),
  });
  assert(weeklyA.response.status === 201, "client A weekly plan creation failed");
  const weeklyPlan = weeklyA.body.data as { id: string; days: Array<{ date: string }> };
  assert(weeklyPlan.id, "client A weekly plan id missing");
  assert(weeklyPlan.days[0]?.date, "client A weekly plan day missing");

  const weeklyByB = await clientB.request(`/weekly-plans/${weeklyPlan.id}`);
  assert(weeklyByB.response.status === 404, "workspace B should not read workspace A weekly plan");

  const weeklyPatchByB = await clientB.request(`/weekly-plans/${weeklyPlan.id}/days/${weeklyPlan.days[0].date}`, {
    method: "PATCH",
    body: JSON.stringify({ message: "跨 workspace 微调", replaceMeals: ["dinner"] }),
  });
  assert(weeklyPatchByB.response.status === 404, "workspace B should not patch workspace A weekly day");

  const weeklyAdoptByB = await clientB.request(`/weekly-plans/${weeklyPlan.id}/adopt`, {
    method: "POST",
    body: JSON.stringify({ selectedDate: weeklyPlan.days[0].date }),
  });
  assert(weeklyAdoptByB.response.status === 404, "workspace B should not adopt workspace A weekly plan");

  console.log("SmartMeal workspace isolation smoke test passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
