export type InventoryCategory =
  | "vegetable"
  | "meat_egg"
  | "staple"
  | "seasoning"
  | "dairy"
  | "fruit"
  | "other";

export type InventoryStatus = "fresh" | "expiring_soon" | "expired" | "need_buy";
export type MealType = "breakfast" | "lunch" | "dinner";
export type PlanningMode = "daily" | "weekly";
export type ConversationRole = "user" | "assistant";

export type ProfileRecord = {
  id: string;
  name: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  fiberTarget: number;
  tastePreferences: string[];
  dietaryRestrictions: string[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemRecord = {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: string;
  quantityValue?: number;
  quantityUnit?: string;
  expireDate?: string;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type NutritionFacts = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type MealIngredientRecord = {
  name: string;
  amount: string;
  fromInventory: boolean;
  optional: boolean;
};

export type MealRecommendationRecord = {
  id: string;
  mealType: MealType;
  title: string;
  description: string;
  imageUrl: string;
  cookTimeMinutes: number;
  nutrition: NutritionFacts;
  ingredients: MealIngredientRecord[];
  steps: string[];
  aiTip: string;
};

export type NutritionSummaryRecord = {
  actual: NutritionFacts;
  target: NutritionFacts;
  deltas: NutritionFacts;
  score: number;
};

export type ShoppingListItemRecord = {
  id: string;
  stableKey: string;
  name: string;
  category: InventoryCategory;
  amount: string;
  checked: boolean;
  reason: string;
};

export type MealPlanRecord = {
  id: string;
  conversationId?: string;
  mode: PlanningMode;
  sourceMessage: string;
  reply: string;
  meals: MealRecommendationRecord[];
  nutritionSummary: NutritionSummaryRecord;
  shoppingList: ShoppingListItemRecord[];
  inventoryUsage: string[];
  suggestions: string[];
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListRecord = {
  id: string;
  sourceType: "meal_plan" | "weekly_plan";
  sourceId: string;
  items: ShoppingListItemRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationRecord = {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessageRecord = {
  id: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  mealPlanId?: string;
  createdAt: string;
};

export type AppStore = {
  profile: ProfileRecord;
  inventoryItems: InventoryItemRecord[];
  mealPlans: MealPlanRecord[];
  shoppingLists: ShoppingListRecord[];
  conversations: ConversationRecord[];
  conversationMessages: ConversationMessageRecord[];
};

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: ApiFieldError[];
    requestId: string;
  };
};
