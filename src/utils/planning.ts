import type {
  DerivedShoppingListItem,
  InsightMetric,
  InventoryCategory,
  InventoryItem,
  MealIngredient,
  MealRecommendation,
  PlanningMode,
  WeeklyPlanDay,
} from "../types/smartmeal";
import { categoryLabels } from "./labels";
import { sumNutrition } from "./nutrition";

export type PlanningState = {
  planningMode: PlanningMode;
  dailyPlan: MealRecommendation[];
  weeklyPlanDraft: WeeklyPlanDay[];
  weeklyPlanApplied: boolean;
  selectedWeekday: string;
  inventory: InventoryItem[];
};

type OverviewMetrics = {
  modeLabel: string;
  modeDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  shoppingValue: string;
  shoppingDetail: string;
  inventoryValue: string;
  inventoryDetail: string;
};

type WeeklyInsightResult = {
  averageCalories: number;
  attentionCount: number;
  balancedCount: number;
  coverageRate: number;
  inventoryItems: string[];
  shoppingGaps: string[];
  items: InsightMetric[];
};

const ingredientCategoryHints: Record<string, InventoryCategory> = {
  鸡蛋: "meat_egg",
  鸡胸肉: "meat_egg",
  牛肉: "meat_egg",
  虾仁: "meat_egg",
  鱼片: "meat_egg",
  豆腐: "meat_egg",
  牛奶: "dairy",
  酸奶: "dairy",
  番茄: "vegetable",
  西兰花: "vegetable",
  青菜: "vegetable",
  生菜: "vegetable",
  时蔬: "vegetable",
  玉米: "vegetable",
  香蕉: "fruit",
  水果: "fruit",
  燕麦: "staple",
  糙米饭: "staple",
  糙米: "staple",
  米饭: "staple",
  挂面: "staple",
  坚果: "other",
};

function shoppingStableKey(name: string, amount: string) {
  return `${name}|${amount}`;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function inferCategory(name: string, inventory: InventoryItem[]) {
  return inventory.find((item) => item.name === name)?.category ?? ingredientCategoryHints[name] ?? "other";
}

function inventoryHasIngredient(name: string, inventory: InventoryItem[]) {
  return inventory.some((item) => item.name === name && item.status !== "expired");
}

function flattenWeeklyMeals(days: WeeklyPlanDay[]) {
  return days.flatMap((day) => day.meals);
}

export function getSelectedWeeklyDay(days: WeeklyPlanDay[], selectedWeekday: string) {
  return days.find((day) => day.day === selectedWeekday) ?? days[0];
}

export function deriveActiveMeals(state: PlanningState) {
  if (!state.dailyPlan.length) {
    return getSelectedWeeklyDay(state.weeklyPlanDraft, state.selectedWeekday)?.meals ?? [];
  }
  return state.dailyPlan;
}

export function mergeShoppingSelection(items: DerivedShoppingListItem[], previousSelection: Record<string, boolean>) {
  return items.map((item) => ({
    ...item,
    checked: previousSelection[item.stableKey] ?? previousSelection[item.name] ?? item.checked,
  }));
}

function buildShoppingReason(ingredient: MealIngredient, mode: PlanningMode, meal: MealRecommendation) {
  if (!ingredient.fromInventory) {
    return mode === "weekly" ? `本周计划中的「${meal.title}」需要` : `今日餐单中的「${meal.title}」需要`;
  }
  return mode === "weekly" ? `本周计划预计会用完库存，建议补货` : `库存不足，补齐今日餐单`;
}

export function deriveShoppingList(state: PlanningState) {
  const sourceMode: PlanningMode = state.planningMode === "weekly" && state.weeklyPlanApplied ? "weekly" : "daily";
  const sourceMeals = sourceMode === "weekly" ? flattenWeeklyMeals(state.weeklyPlanDraft) : deriveActiveMeals(state);
  const buckets = new Map<string, DerivedShoppingListItem>();

  sourceMeals.forEach((meal) => {
    meal.ingredients.forEach((ingredient) => {
      const covered = ingredient.fromInventory && inventoryHasIngredient(ingredient.name, state.inventory);
      if (covered) return;

      const stableKey = shoppingStableKey(ingredient.name, ingredient.amount);
      const existing = buckets.get(stableKey);

      if (existing) {
        const count = Number.parseInt(existing.id.split("_").pop() ?? "1", 10) + 1;
        buckets.set(stableKey, {
          ...existing,
          amount: count > 1 ? `${count} x ${ingredient.amount}` : existing.amount,
          id: `${stableKey}_${count}`,
          reason: sourceMode === "weekly" ? "本周多餐会用到，建议一次性备齐。" : existing.reason,
        });
        return;
      }

      buckets.set(stableKey, {
        id: `${stableKey}_1`,
        stableKey,
        source: sourceMode,
        name: ingredient.name,
        category: inferCategory(ingredient.name, state.inventory),
        amount: ingredient.amount,
        checked: false,
        reason: buildShoppingReason(ingredient, sourceMode, meal),
      });
    });
  });

  return Array.from(buckets.values());
}

export function deriveOverviewMetrics(state: PlanningState, shoppingItems: DerivedShoppingListItem[]): OverviewMetrics {
  const activeMeals = deriveActiveMeals(state);
  const nutrition = sumNutrition(activeMeals);
  const expiringItems = state.inventory.filter((item) => item.status === "expiring_soon").map((item) => item.name);
  const coveredIngredients = unique(activeMeals.flatMap((meal) => meal.ingredients.filter((item) => item.fromInventory && inventoryHasIngredient(item.name, state.inventory)).map((item) => item.name)));
  const modeLabel = state.planningMode === "weekly" && state.weeklyPlanApplied ? "本周执行" : "今日执行";
  const selectedDay = getSelectedWeeklyDay(state.weeklyPlanDraft, state.selectedWeekday);

  if (state.planningMode === "weekly" && state.weeklyPlanApplied) {
    const weeklyCalories = state.weeklyPlanDraft.reduce((total, day) => total + day.calories, 0);
    return {
      modeLabel,
      modeDescription: `当前聚焦 ${selectedDay?.day ?? state.selectedWeekday} 的执行餐单，总览和采购按整周缺口汇总。`,
      heroEyebrow: "本周饮食状态",
      heroTitle: `${selectedDay?.day ?? "本周"}计划已进入执行`,
      heroDescription: `本周共 ${state.weeklyPlanDraft.length} 天草稿，平均每日约 ${Math.round(weeklyCalories / Math.max(1, state.weeklyPlanDraft.length))} kcal，采购重点已同步到清单。`,
      shoppingValue: `${shoppingItems.filter((item) => !item.checked).length} 项待买`,
      shoppingDetail: shoppingItems.slice(0, 3).map((item) => item.name).join("、") || "本周主要缺口已整理。",
      inventoryValue: `${coveredIngredients.length} 项覆盖`,
      inventoryDetail: coveredIngredients.join("、") || "本周主要餐单尚未绑定库存。",
    };
  }

  return {
    modeLabel,
    modeDescription: "总览、营养和购物清单都围绕今日三餐计算，适合即时调整。",
    heroEyebrow: "今日饮食状态",
    heroTitle: "清淡高蛋白方案已准备好",
    heroDescription: `三餐预计 ${nutrition.calories} kcal，已优先使用 ${coveredIngredients.join("、") || "现有库存"}。`,
    shoppingValue: `${shoppingItems.filter((item) => !item.checked).length} 项待买`,
    shoppingDetail: shoppingItems.slice(0, 3).map((item) => item.name).join("、") || "今日缺口食材已分类。",
    inventoryValue: `${expiringItems.length} 个临期`,
    inventoryDetail: expiringItems.join("、") || "当前库存状态稳定。",
  };
}

export function deriveWeeklyInsights(state: PlanningState, updatedAt: string): WeeklyInsightResult {
  const averageCalories = Math.round(state.weeklyPlanDraft.reduce((total, day) => total + day.calories, 0) / Math.max(1, state.weeklyPlanDraft.length));
  const attentionCount = state.weeklyPlanDraft.filter((day) => day.status === "needs_attention").length;
  const balancedCount = state.weeklyPlanDraft.filter((day) => day.status !== "needs_attention").length;
  const inventoryItems = unique(state.weeklyPlanDraft.flatMap((day) => day.inventoryFocus));
  const shoppingGaps = unique(state.weeklyPlanDraft.flatMap((day) => day.shoppingGap));
  const coverageRate = Math.round((inventoryItems.length / Math.max(1, state.inventory.length)) * 100);

  return {
    averageCalories,
    attentionCount,
    balancedCount,
    coverageRate,
    inventoryItems,
    shoppingGaps,
    items: [
      { label: "计划状态", value: state.weeklyPlanApplied ? "已采用" : "草稿中", detail: `最近更新 ${updatedAt}，当前按 ${state.selectedWeekday} 作为今日执行映射。` },
      { label: "平均热量", value: `${averageCalories} kcal`, detail: attentionCount > 0 ? `${attentionCount} 天还需要继续微调。` : "本周热量节奏较稳定。" },
      { label: "库存覆盖", value: `${coverageRate}%`, detail: inventoryItems.join("、") || "当前周计划未使用库存。" },
      { label: "采购重点", value: `${shoppingGaps.length} 项`, detail: shoppingGaps.slice(0, 4).join("、") || "本周采购缺口较少。" },
    ],
  };
}

export function buildShoppingSummary(items: DerivedShoppingListItem[]) {
  const remaining = items.filter((item) => !item.checked);
  const completed = items.filter((item) => item.checked);
  const focusCategories = unique(remaining.map((item) => categoryLabels[item.category]));

  return {
    remainingCount: remaining.length,
    completedCount: completed.length,
    focusLabel: focusCategories.slice(0, 2).join(" / ") || "缺口已补齐",
    firstItems: remaining.slice(0, 4).map((item) => item.name),
  };
}
