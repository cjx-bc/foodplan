const baseUrl = process.env.SMARTMEAL_API_URL ?? "http://localhost:8787/api/v1";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as JsonValue) : null;
  return { response, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const invalidProfile = await request("/profile", {
    method: "PATCH",
    body: JSON.stringify({ dailyCalorieTarget: -1 }),
  });
  assert(invalidProfile.response.status === 422, "profile validation should return 422");

  const invalidInventory = await request("/inventory-items", {
    method: "POST",
    body: JSON.stringify({ name: "", category: "bad", quantity: "" }),
  });
  assert(invalidInventory.response.status === 422, "inventory validation should return 422");

  const missingConversation = await request("/conversations/not-exist/messages");
  assert(missingConversation.response.status === 404, "missing conversation should return 404");

  const invalidWeekly = await request("/weekly-plans", {
    method: "POST",
    body: JSON.stringify({
      message: "",
      preferenceTags: [],
      startDate: "bad-date",
      days: 99,
    }),
  });
  assert(invalidWeekly.response.status === 422, "invalid weekly plan should return 422");

  const invalidShopping = await request("/shopping-lists/current?sourceType=bad&sourceId=x");
  assert(invalidShopping.response.status === 422, "invalid shopping list query should return 422");

  console.log("SmartMeal API contract test passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
