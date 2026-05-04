import type { InventoryCategory, MealType } from "../types/smartmeal";

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
};

export const categoryLabels: Record<InventoryCategory, string> = {
  vegetable: "蔬菜",
  meat_egg: "肉蛋",
  staple: "主食",
  seasoning: "调味料",
  dairy: "乳制品",
  fruit: "水果",
  other: "其他",
};
