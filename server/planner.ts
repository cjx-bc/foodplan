import { mealCatalog } from "./catalog.js";
import type {
  InventoryCategory,
  InventoryItemRecord,
  MealPlanRecord,
  MealRecommendationRecord,
  NutritionFacts,
  NutritionSummaryRecord,
  ProfileRecord,
  ShoppingListItemRecord,
} from "./types.js";
import { createId, nowIso } from "./utils.js";

const ingredientCategoryHints: Record<string, InventoryCategory> = {
  鸡蛋: "meat_egg",
  鸡胸肉: "meat_egg",
  虾仁: "meat_egg",
  豆腐: "meat_egg",
  牛奶: "dairy",
  番茄: "vegetable",
  西兰花: "vegetable",
  青菜: "vegetable",
  生菜: "vegetable",
  时蔬: "vegetable",
  香蕉: "fruit",
  燕麦: "staple",
  糙米饭: "staple",
};

function cloneMeal(meal: MealRecommendationRecord): MealRecommendationRecord {
  return {
    ...meal,
    nutrition: { ...meal.nutrition },
    ingredients: meal.ingredients.map((item) => ({ ...item })),
    steps: [...meal.steps],
  };
}

function sumNutrition(meals: MealRecommendationRecord[]): NutritionFacts {
  return meals.reduce<NutritionFacts>(
    (total, meal) => ({
      calories: total.calories + meal.nutrition.calories,
      protein: total.protein + meal.nutrition.protein,
      carbs: total.carbs + meal.nutrition.carbs,
      fat: total.fat + meal.nutrition.fat,
      fiber: total.fiber + meal.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

function buildNutritionSummary(meals: MealRecommendationRecord[], profile: ProfileRecord): NutritionSummaryRecord {
  const actual = sumNutrition(meals);
  const target: NutritionFacts = {
    calories: profile.dailyCalorieTarget,
    protein: profile.proteinTarget,
    carbs: profile.carbsTarget,
    fat: profile.fatTarget,
    fiber: profile.fiberTarget,
  };
  const deltas: NutritionFacts = {
    calories: actual.calories - target.calories,
    protein: actual.protein - target.protein,
    carbs: actual.carbs - target.carbs,
    fat: actual.fat - target.fat,
    fiber: actual.fiber - target.fiber,
  };
  const proteinScore = Math.min(actual.protein / target.protein, 1);
  const calorieScore = Math.max(0, 1 - Math.abs(actual.calories - target.calories) / target.calories);
  const fiberScore = Math.min(actual.fiber / target.fiber, 1);

  return {
    actual,
    target,
    deltas,
    score: Math.round((proteinScore * 0.35 + calorieScore * 0.4 + fiberScore * 0.25) * 100),
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function shoppingStableKey(name: string, amount: string): string {
  return `${name}|${amount}`;
}

function inferCategory(name: string, inventory: InventoryItemRecord[]): InventoryCategory {
  return inventory.find((item) => item.name === name)?.category ?? ingredientCategoryHints[name] ?? "other";
}

function inventoryHasIngredient(name: string, inventory: InventoryItemRecord[]): boolean {
  return inventory.some((item) => item.name === name && item.status !== "expired");
}

export function deriveShoppingItems(
  meals: MealRecommendationRecord[],
  inventory: InventoryItemRecord[],
  previousItems: ShoppingListItemRecord[] = [],
): ShoppingListItemRecord[] {
  const previousChecked = previousItems.reduce<Record<string, boolean>>((record, item) => {
    record[item.stableKey] = item.checked;
    return record;
  }, {});

  const buckets = new Map<string, ShoppingListItemRecord>();

  meals.forEach((meal) => {
    meal.ingredients.forEach((ingredient) => {
      const covered = ingredient.fromInventory && inventoryHasIngredient(ingredient.name, inventory);
      if (covered) {
        return;
      }

      const stableKey = shoppingStableKey(ingredient.name, ingredient.amount);
      if (!buckets.has(stableKey)) {
        buckets.set(stableKey, {
          id: createId("shop_item"),
          stableKey,
          name: ingredient.name,
          category: inferCategory(ingredient.name, inventory),
          amount: ingredient.amount,
          checked: previousChecked[stableKey] ?? false,
          reason: `今日餐单中的「${meal.title}」需要`,
        });
      }
    });
  });

  return Array.from(buckets.values());
}

function buildSuggestions(summary: NutritionSummaryRecord, shoppingList: ShoppingListItemRecord[]): string[] {
  const suggestions: string[] = [];
  if (summary.deltas.protein < 0) suggestions.push("蛋白质略低，建议加 1 个鸡蛋或增加 80g 豆腐。");
  if (summary.deltas.calories < -120) suggestions.push("总热量偏低，如晚间易饿可补无糖酸奶或水果。");
  if (summary.deltas.fiber < 0) suggestions.push("膳食纤维不足，建议补一份绿叶菜或西兰花。");
  if (shoppingList.length > 0) suggestions.push(`当前仍有 ${shoppingList.length} 项缺口食材，建议一次性补齐。`);
  return suggestions.slice(0, 3);
}

function chooseMeal(kind: "breakfast" | "lunch" | "dinner", message: string, inventory: InventoryItemRecord[]): MealRecommendationRecord {
  const lower = message.toLowerCase();
  const options = mealCatalog[kind];
  const inventoryNames = new Set(inventory.filter((item) => item.status !== "expired").map((item) => item.name));

  const scored = options.map((meal, index) => {
    let score = 0;
    if (lower.includes("高蛋白") || lower.includes("蛋白")) score += meal.nutrition.protein;
    if (lower.includes("控制热量") || lower.includes("低卡") || lower.includes("清淡")) score -= meal.nutrition.calories / 20;
    if (lower.includes("番茄") && meal.ingredients.some((item) => item.name === "番茄")) score += 30;
    if (lower.includes("鸡蛋") && meal.ingredients.some((item) => item.name === "鸡蛋")) score += 30;
    if (lower.includes("多用库存") || lower.includes("库存")) {
      score += meal.ingredients.filter((item) => inventoryNames.has(item.name)).length * 15;
    }
    return { meal, score, index };
  });

  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  return cloneMeal(scored[0]?.meal ?? options[0]);
}

function buildReply(message: string, inventoryUsage: string[], shoppingList: ShoppingListItemRecord[]): string {
  const parts: string[] = [];
  if (message.includes("清淡")) parts.push("我把整体口味收敛到更清淡的范围");
  if (message.includes("蛋白")) parts.push("优先保证了蛋白质");
  if (inventoryUsage.length > 0) parts.push(`并优先使用了 ${inventoryUsage.join("、")}`);
  if (shoppingList.length > 0) parts.push(`还整理了 ${shoppingList.length} 项采购缺口`);
  return `${parts.join("，")}。`;
}

export function generateDailyMealPlan(
  message: string,
  profile: ProfileRecord,
  inventory: InventoryItemRecord[],
  previousShoppingList: ShoppingListItemRecord[] = [],
  conversationId?: string,
): MealPlanRecord {
  const meals = [
    chooseMeal("breakfast", message, inventory),
    chooseMeal("lunch", message, inventory),
    chooseMeal("dinner", message, inventory),
  ];
  const shoppingList = deriveShoppingItems(meals, inventory, previousShoppingList);
  const nutritionSummary = buildNutritionSummary(meals, profile);
  const inventoryUsage = unique(
    meals.flatMap((meal) => meal.ingredients.filter((item) => item.fromInventory && inventoryHasIngredient(item.name, inventory)).map((item) => item.name)),
  );
  const suggestions = buildSuggestions(nutritionSummary, shoppingList);
  const createdAt = nowIso();

  return {
    id: createId("plan"),
    conversationId,
    mode: "daily",
    sourceMessage: message,
    reply: buildReply(message, inventoryUsage, shoppingList),
    meals,
    nutritionSummary,
    shoppingList,
    inventoryUsage,
    suggestions,
    createdAt,
    updatedAt: createdAt,
  };
}
