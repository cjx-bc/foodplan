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
  quantityValue?: number;
  quantityUnit?: string;
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

export type InventoryConsumptionPreview = {
  inventoryItemId?: string;
  name: string;
  plannedAmountText: string;
  plannedValue?: number;
  plannedUnit?: string;
  matched: boolean;
  autoApplicable: boolean;
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
  stableKey?: string;
  name: string;
  category: InventoryCategory;
  amount: string;
  checked: boolean;
  reason: string;
};

export type PlanningMode = "daily" | "weekly";
export type GenerationSource = "ai" | "fallback";

export type GenerationMeta = {
  source: GenerationSource;
  model?: string;
  requestId?: string;
  promptVersion?: string;
};

export type DerivedShoppingListItem = ShoppingListItem & {
  source: PlanningMode;
  stableKey: string;
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

export type MealPlan = MealPlanResult & {
  id: string;
  mode: PlanningMode;
  reply: string;
  conversationId?: string;
  sourceMessage: string;
  inventoryConsumptionPreview: InventoryConsumptionPreview[];
  generationMeta?: GenerationMeta;
  createdAt: string;
  updatedAt: string;
};

export type ShoppingList = {
  id: string;
  sourceType: "meal_plan" | "weekly_plan";
  sourceId: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
};

export type WeeklyPlan = {
  id: string;
  conversationId?: string;
  title: string;
  description: string;
  tags: string[];
  days: WeeklyPlanDay[];
  insights: string[];
  adopted: boolean;
  generationMeta?: GenerationMeta;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  userId: string;
  workspaceId?: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceState = {
  userId: string;
  workspaceId?: string;
  currentConversationId?: string;
  currentMealPlanId?: string;
  currentWeeklyPlanId?: string;
  currentShoppingListId?: string;
  planningMode: PlanningMode;
  selectedWeekday?: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessageRef = {
  mealPlanId?: string;
  shoppingListId?: string;
  weeklyPlanId?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  structuredResult?: ConversationMessageRef | null;
};

export type InventoryConsumptionApplyMode = "manual" | "auto";

export type InventoryConsumptionApplyItem = {
  inventoryItemId: string;
  consumeValue: number;
  consumeUnit: string;
  consumeText: string;
};

export type AiActionSummary = {
  title: string;
  affectedMeals: string[];
  nutritionChanges: string[];
  shoppingChanges: string[];
  inventoryUsage: string[];
};

export type WeeklyPlanDay = {
  date?: string;
  day: string;
  meals: MealRecommendation[];
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

export type ApiRequestState = "idle" | "loading" | "success" | "error";
