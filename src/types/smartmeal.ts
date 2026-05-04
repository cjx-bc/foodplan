export type MealType = "breakfast" | "lunch" | "dinner";

export type InventoryCategory =
  | "vegetable"
  | "meat_egg"
  | "staple"
  | "seasoning"
  | "dairy"
  | "fruit"
  | "other";

export type UserProfile = {
  id: string;
  name: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  tastePreferences: string[];
  dietaryRestrictions: string[];
};

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: string;
  expireDate?: string;
  status: "fresh" | "expiring_soon" | "expired" | "need_buy";
};

export type NutritionFacts = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type MealIngredient = {
  name: string;
  amount: string;
  fromInventory: boolean;
  optional: boolean;
};

export type MealRecommendation = {
  id: string;
  mealType: MealType;
  title: string;
  description: string;
  imageUrl: string;
  cookTimeMinutes: number;
  nutrition: NutritionFacts;
  ingredients: MealIngredient[];
  steps: string[];
  aiTip: string;
};

export type ShoppingListItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  amount: string;
  checked: boolean;
  reason: string;
};

export type NutritionSummary = {
  actual: NutritionFacts;
  target: NutritionFacts;
  deltas: NutritionFacts;
  score: number;
};

export type MealPlanResult = {
  meals: MealRecommendation[];
  nutritionSummary: NutritionSummary;
  shoppingList: ShoppingListItem[];
  inventoryUsage: string[];
  suggestions: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  structuredResult?: MealPlanResult;
};

export type AiActionSummary = {
  title: string;
  affectedMeals: string[];
  nutritionChanges: string[];
  shoppingChanges: string[];
  inventoryUsage: string[];
};

export type WeeklyPlanDay = {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  calories: number;
  status: "balanced" | "light" | "needs_attention";
  note: string;
  inventoryFocus: string[];
  shoppingGap: string[];
};

export type WeeklyPlanPreset = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  days: WeeklyPlanDay[];
};

export type InsightMetric = {
  label: string;
  value: string;
  detail: string;
};
