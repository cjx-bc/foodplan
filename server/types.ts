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
export type WeeklyPlanDayStatus = "balanced" | "light" | "needs_attention";
export type GenerationSource = "ai" | "fallback";

export type UserRecord = {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerationMetaRecord = {
  source: GenerationSource;
  model?: string;
  requestId?: string;
};

export type ProfileRecord = {
  id: string;
  userId: string;
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
  userId: string;
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
  userId: string;
  conversationId?: string;
  mode: PlanningMode;
  sourceMessage: string;
  reply: string;
  meals: MealRecommendationRecord[];
  nutritionSummary: NutritionSummaryRecord;
  shoppingList: ShoppingListItemRecord[];
  inventoryUsage: string[];
  suggestions: string[];
  generationMeta?: GenerationMetaRecord;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyPlanDayRecord = {
  date: string;
  day: string;
  meals: MealRecommendationRecord[];
  breakfast: string;
  lunch: string;
  dinner: string;
  calories: number;
  status: WeeklyPlanDayStatus;
  note: string;
  inventoryFocus: string[];
  shoppingGap: string[];
};

export type WeeklyPlanRecord = {
  id: string;
  userId: string;
  conversationId?: string;
  title: string;
  description: string;
  tags: string[];
  days: WeeklyPlanDayRecord[];
  insights: string[];
  adopted: boolean;
  generationMeta?: GenerationMetaRecord;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingListRecord = {
  id: string;
  userId: string;
  sourceType: "meal_plan" | "weekly_plan";
  sourceId: string;
  items: ShoppingListItemRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationRecord = {
  id: string;
  userId: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessageRecord = {
  id: string;
  userId: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  mealPlanId?: string;
  shoppingListId?: string;
  weeklyPlanId?: string;
  createdAt: string;
};

export type WorkspaceStateRecord = {
  userId: string;
  currentConversationId?: string;
  currentMealPlanId?: string;
  currentWeeklyPlanId?: string;
  currentShoppingListId?: string;
  planningMode: PlanningMode;
  selectedWeekday?: string;
  updatedAt: string;
};

export type AppStore = {
  users: UserRecord[];
  sessions: SessionRecord[];
  profile: ProfileRecord;
  inventoryItems: InventoryItemRecord[];
  mealPlans: MealPlanRecord[];
  weeklyPlans: WeeklyPlanRecord[];
  shoppingLists: ShoppingListRecord[];
  conversations: ConversationRecord[];
  conversationMessages: ConversationMessageRecord[];
  workspaceState: WorkspaceStateRecord;
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
