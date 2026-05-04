import type {
  ChatMessage,
  InventoryItem,
  MealRecommendation,
  ShoppingListItem,
  UserProfile,
  WeeklyPlanDay,
  WeeklyPlanPreset,
} from "../types/smartmeal";

export const userProfile: UserProfile = {
  id: "user_001",
  name: "家庭饮食计划",
  dailyCalorieTarget: 1900,
  proteinTarget: 95,
  carbsTarget: 250,
  fatTarget: 65,
  fiberTarget: 25,
  tastePreferences: ["清淡", "家常", "高蛋白"],
  dietaryRestrictions: ["少油", "少盐"],
};

export const initialInventory: InventoryItem[] = [
  { id: "inv_001", name: "鸡蛋", category: "meat_egg", quantity: "8 个", expireDate: "2026-05-09", status: "fresh" },
  { id: "inv_002", name: "番茄", category: "vegetable", quantity: "4 个", expireDate: "2026-05-06", status: "expiring_soon" },
  { id: "inv_003", name: "西兰花", category: "vegetable", quantity: "1 颗", expireDate: "2026-05-07", status: "expiring_soon" },
  { id: "inv_004", name: "鸡胸肉", category: "meat_egg", quantity: "300 g", expireDate: "2026-05-08", status: "fresh" },
  { id: "inv_005", name: "牛奶", category: "dairy", quantity: "1 盒", expireDate: "2026-05-05", status: "expiring_soon" },
];

export const initialMeals: MealRecommendation[] = [
  {
    id: "meal_breakfast_1",
    mealType: "breakfast",
    title: "燕麦水果杯 + 水煮蛋",
    description: "用牛奶和水果做轻负担早餐，补足纤维和蛋白质。",
    imageUrl: "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?auto=format&fit=crop&w=720&q=80",
    cookTimeMinutes: 10,
    nutrition: { calories: 352, protein: 22, carbs: 48, fat: 9, fiber: 7 },
    ingredients: [
      { name: "燕麦", amount: "45 g", fromInventory: false, optional: false },
      { name: "牛奶", amount: "200 ml", fromInventory: true, optional: false },
      { name: "鸡蛋", amount: "1 个", fromInventory: true, optional: false },
    ],
    steps: ["燕麦加入牛奶浸泡 5 分钟。", "鸡蛋冷水下锅煮熟。", "加入水果后装杯。"],
    aiTip: "早餐蛋白质达标，牛奶建议优先使用临期库存。",
  },
  {
    id: "meal_lunch_1",
    mealType: "lunch",
    title: "番茄鸡胸肉糙米饭",
    description: "番茄提鲜，鸡胸肉提供优质蛋白，适合工作日午餐。",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=720&q=80",
    cookTimeMinutes: 25,
    nutrition: { calories: 560, protein: 42, carbs: 58, fat: 16, fiber: 6 },
    ingredients: [
      { name: "番茄", amount: "2 个", fromInventory: true, optional: false },
      { name: "鸡胸肉", amount: "180 g", fromInventory: true, optional: false },
      { name: "糙米饭", amount: "1 碗", fromInventory: false, optional: false },
      { name: "西兰花", amount: "半颗", fromInventory: true, optional: true },
    ],
    steps: ["鸡胸肉切片后少油煎熟。", "番茄炒出汁后加入鸡肉。", "搭配糙米饭和焯水西兰花。"],
    aiTip: "相较外卖方案，蛋白质约 +18g，热量约 -120kcal。",
  },
  {
    id: "meal_dinner_1",
    mealType: "dinner",
    title: "番茄豆腐汤 + 清炒时蔬",
    description: "晚餐控制热量，用热汤增加饱腹感。",
    imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=720&q=80",
    cookTimeMinutes: 18,
    nutrition: { calories: 430, protein: 20, carbs: 36, fat: 15, fiber: 5 },
    ingredients: [
      { name: "番茄", amount: "1 个", fromInventory: true, optional: false },
      { name: "豆腐", amount: "200 g", fromInventory: false, optional: false },
      { name: "青菜", amount: "250 g", fromInventory: false, optional: false },
    ],
    steps: ["番茄切块煮出汤底。", "加入豆腐小火煮 8 分钟。", "青菜少油快炒后搭配食用。"],
    aiTip: "晚餐热量较低，适合今天的控油目标。",
  },
];

export const mealAlternatives: Record<string, MealRecommendation[]> = {
  breakfast: [
    {
      ...initialMeals[0],
      id: "meal_breakfast_2",
      title: "鸡蛋蔬菜卷 + 无糖豆浆",
      description: "更高蛋白的早餐替代，适合早晨训练日。",
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 12,
      nutrition: { calories: 390, protein: 28, carbs: 35, fat: 13, fiber: 6 },
      aiTip: "蛋白质更高，但脂肪略升，适合需要更强饱腹感时使用。",
    },
  ],
  lunch: [
    {
      ...initialMeals[1],
      id: "meal_lunch_2",
      title: "西兰花虾仁荞麦面",
      description: "用西兰花和虾仁提高蛋白质，午餐更清爽。",
      imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 20,
      nutrition: { calories: 525, protein: 39, carbs: 61, fat: 12, fiber: 8 },
      aiTip: "脂肪更低，纤维更高，适合下午需要轻盈状态。",
    },
  ],
  dinner: [
    {
      ...initialMeals[2],
      id: "meal_dinner_2",
      title: "鸡蛋番茄燕麦粥",
      description: "把库存番茄和鸡蛋用于晚餐，温和且低负担。",
      imageUrl: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 16,
      nutrition: { calories: 410, protein: 24, carbs: 44, fat: 10, fiber: 6 },
      aiTip: "晚餐继续使用库存番茄和鸡蛋，脂肪控制更好。",
    },
  ],
};

export const initialShoppingList: ShoppingListItem[] = [
  { id: "shop_001", name: "豆腐", category: "meat_egg", amount: "1 盒", checked: false, reason: "晚餐番茄豆腐汤缺少" },
  { id: "shop_002", name: "青菜", category: "vegetable", amount: "300 g", checked: false, reason: "补足晚餐蔬菜摄入" },
  { id: "shop_003", name: "燕麦", category: "staple", amount: "1 袋", checked: false, reason: "早餐燕麦水果杯需要" },
  { id: "shop_004", name: "糙米", category: "staple", amount: "1 袋", checked: true, reason: "午餐主食备用" },
];

export const initialMessages: ChatMessage[] = [
  {
    id: "msg_001",
    role: "user",
    content: "今天午餐想吃清淡点，帮我减少油脂、提升蛋白质，并多用目前家里的食材。",
    createdAt: "10:23",
  },
  {
    id: "msg_002",
    role: "assistant",
    content: "好的，我已优化午餐搭配：主菜使用鸡胸肉和番茄，油脂降低约 30%，并优先使用牛奶、鸡蛋、番茄和西兰花。",
    createdAt: "10:24",
  },
];

function cloneMeal(meal: MealRecommendation, overrides?: Partial<MealRecommendation>): MealRecommendation {
  return {
    ...meal,
    ...overrides,
    nutrition: overrides?.nutrition ? { ...overrides.nutrition } : { ...meal.nutrition },
    ingredients: overrides?.ingredients ? overrides.ingredients.map((item) => ({ ...item })) : meal.ingredients.map((item) => ({ ...item })),
    steps: overrides?.steps ? [...overrides.steps] : [...meal.steps],
  };
}

const mealCatalog = {
  oatmealEgg: cloneMeal(initialMeals[0]),
  tomatoChickenRice: cloneMeal(initialMeals[1]),
  tomatoTofuSoup: cloneMeal(initialMeals[2]),
  veggieEggWrap: cloneMeal(mealAlternatives.breakfast[0]),
  shrimpBuckwheat: cloneMeal(mealAlternatives.lunch[0]),
  tomatoEggOat: cloneMeal(mealAlternatives.dinner[0]),
  milkBananaOat: cloneMeal(initialMeals[0], {
    id: "meal_breakfast_3",
    title: "牛奶香蕉燕麦杯",
    description: "用牛奶和香蕉做快手早餐，适合工作日清淡开场。",
    nutrition: { calories: 338, protein: 18, carbs: 50, fat: 8, fiber: 6 },
    ingredients: [
      { name: "燕麦", amount: "45 g", fromInventory: false, optional: false },
      { name: "牛奶", amount: "250 ml", fromInventory: true, optional: false },
      { name: "香蕉", amount: "1 根", fromInventory: false, optional: false },
    ],
    aiTip: "优先消耗牛奶，早餐热量保持轻盈。",
  }),
  boiledEggCorn: cloneMeal(initialMeals[0], {
    id: "meal_breakfast_4",
    title: "水煮蛋 + 玉米杯",
    description: "更朴素的早餐组合，适合周内压一压总热量。",
    nutrition: { calories: 310, protein: 17, carbs: 34, fat: 10, fiber: 5 },
    ingredients: [
      { name: "鸡蛋", amount: "2 个", fromInventory: true, optional: false },
      { name: "玉米", amount: "1 根", fromInventory: false, optional: false },
    ],
    aiTip: "蛋白和主食简单清楚，适合丰盛午餐前搭配。",
  }),
  yogurtNuts: cloneMeal(initialMeals[0], {
    id: "meal_breakfast_5",
    title: "酸奶坚果杯",
    description: "周五稍微放宽一点，但仍然控制总量。",
    nutrition: { calories: 360, protein: 16, carbs: 28, fat: 15, fiber: 5 },
    ingredients: [
      { name: "酸奶", amount: "1 杯", fromInventory: false, optional: false },
      { name: "坚果", amount: "20 g", fromInventory: false, optional: false },
      { name: "水果", amount: "1 份", fromInventory: false, optional: true },
    ],
    aiTip: "周末前的早餐可以稍微丰富，但不必过量。",
  }),
  chickenSaladRice: cloneMeal(initialMeals[1], {
    id: "meal_lunch_3",
    title: "鸡肉沙拉饭",
    description: "鸡肉保留蛋白质，蔬菜让午餐更清爽。",
    nutrition: { calories: 540, protein: 35, carbs: 55, fat: 14, fiber: 7 },
    ingredients: [
      { name: "鸡胸肉", amount: "150 g", fromInventory: true, optional: false },
      { name: "生菜", amount: "150 g", fromInventory: false, optional: false },
      { name: "糙米饭", amount: "1 碗", fromInventory: false, optional: false },
      { name: "番茄", amount: "1 个", fromInventory: true, optional: true },
    ],
    aiTip: "适合中周保持清爽，蛋白也不低。",
  }),
  beefVegRice: cloneMeal(initialMeals[1], {
    id: "meal_lunch_4",
    title: "牛肉时蔬饭",
    description: "热量稍高的午餐，用来平衡工作日体力消耗。",
    nutrition: { calories: 640, protein: 38, carbs: 63, fat: 20, fiber: 6 },
    ingredients: [
      { name: "牛肉", amount: "160 g", fromInventory: false, optional: false },
      { name: "时蔬", amount: "200 g", fromInventory: false, optional: false },
      { name: "米饭", amount: "1 碗", fromInventory: false, optional: false },
    ],
    aiTip: "适合放在较忙的一天，但晚餐最好回轻一些。",
  }),
  tomatoBeefNoodles: cloneMeal(initialMeals[1], {
    id: "meal_lunch_5",
    title: "番茄牛肉面",
    description: "周五给一点满足感，同时保留番茄的清爽。",
    nutrition: { calories: 610, protein: 34, carbs: 66, fat: 18, fiber: 6 },
    ingredients: [
      { name: "番茄", amount: "2 个", fromInventory: true, optional: false },
      { name: "牛肉", amount: "130 g", fromInventory: false, optional: false },
      { name: "挂面", amount: "1 份", fromInventory: false, optional: false },
    ],
    aiTip: "周五可以略丰盛，但整体节奏仍然可控。",
  }),
  veggieTofu: cloneMeal(initialMeals[2], {
    id: "meal_dinner_3",
    title: "清炒时蔬豆腐",
    description: "蔬菜和豆腐为主，脂肪较低的周中晚餐。",
    nutrition: { calories: 398, protein: 21, carbs: 28, fat: 14, fiber: 7 },
    ingredients: [
      { name: "豆腐", amount: "220 g", fromInventory: false, optional: false },
      { name: "时蔬", amount: "300 g", fromInventory: false, optional: false },
      { name: "西兰花", amount: "半颗", fromInventory: true, optional: true },
    ],
    aiTip: "用豆腐顶住蛋白质，晚餐仍保持轻。",
  }),
  tofuGreensSoup: cloneMeal(initialMeals[2], {
    id: "meal_dinner_4",
    title: "豆腐青菜汤",
    description: "把晚餐压轻一点，给整体周节奏回平。",
    nutrition: { calories: 360, protein: 19, carbs: 22, fat: 13, fiber: 5 },
    ingredients: [
      { name: "豆腐", amount: "180 g", fromInventory: false, optional: false },
      { name: "青菜", amount: "250 g", fromInventory: false, optional: false },
    ],
    aiTip: "适合放在热量偏高的一天晚上做调平。",
  }),
  steamedFishVeg: cloneMeal(initialMeals[2], {
    id: "meal_dinner_5",
    title: "清蒸鱼 + 时蔬",
    description: "把鱼类放在周末前，补一点优质蛋白。",
    nutrition: { calories: 455, protein: 31, carbs: 18, fat: 16, fiber: 5 },
    ingredients: [
      { name: "鱼片", amount: "180 g", fromInventory: false, optional: false },
      { name: "时蔬", amount: "250 g", fromInventory: false, optional: false },
    ],
    aiTip: "鱼类提升蛋白质量，晚餐仍然不过重。",
  }),
} as const;

function buildWeeklyDay(day: string, meals: [MealRecommendation, MealRecommendation, MealRecommendation], status: WeeklyPlanDay["status"], note: string): WeeklyPlanDay {
  const inventoryFocus = Array.from(new Set(meals.flatMap((meal) => meal.ingredients.filter((item) => item.fromInventory).map((item) => item.name))));
  const shoppingGap = Array.from(new Set(meals.flatMap((meal) => meal.ingredients.filter((item) => !item.fromInventory).map((item) => item.name))));
  const calories = meals.reduce((total, meal) => total + meal.nutrition.calories, 0);

  return {
    day,
    meals: meals.map((meal) => cloneMeal(meal)),
    breakfast: meals[0].title,
    lunch: meals[1].title,
    dinner: meals[2].title,
    calories,
    status,
    note,
    inventoryFocus,
    shoppingGap,
  };
}

export const weeklyPreferenceOptions = [
  "清淡饮食",
  "高蛋白",
  "低脂减油",
  "控糖控盐",
  "库存优先",
];

export const weeklyPlanPresets: WeeklyPlanPreset[] = [
  {
    id: "balanced_stock",
    title: "库存优先均衡周",
    description: "优先消耗鸡蛋、番茄、西兰花和牛奶，工作日保持稳定热量。",
    tags: ["清淡饮食", "库存优先"],
    days: [
      buildWeeklyDay("周一", [mealCatalog.oatmealEgg, mealCatalog.tomatoChickenRice, mealCatalog.tomatoTofuSoup], "balanced", "先消耗番茄和牛奶，开周保持清淡。"),
      buildWeeklyDay("周二", [mealCatalog.veggieEggWrap, mealCatalog.shrimpBuckwheat, mealCatalog.veggieTofu], "light", "午餐减油，给周中留出热量空间。"),
      buildWeeklyDay("周三", [mealCatalog.milkBananaOat, mealCatalog.chickenSaladRice, mealCatalog.tomatoEggOat], "balanced", "用库存鸡蛋做晚餐，减少额外采购。"),
      buildWeeklyDay("周四", [mealCatalog.boiledEggCorn, mealCatalog.beefVegRice, mealCatalog.tofuGreensSoup], "needs_attention", "周四偏丰盛，建议晚餐控制主食。"),
      buildWeeklyDay("周五", [mealCatalog.yogurtNuts, mealCatalog.tomatoBeefNoodles, mealCatalog.steamedFishVeg], "balanced", "周五适度放宽，但总热量仍可控。"),
    ],
  },
  {
    id: "protein_focus",
    title: "高蛋白训练周",
    description: "把蛋白质达标放在优先级前面，三餐更强调鸡蛋、鸡胸肉和鱼虾。",
    tags: ["高蛋白", "低脂减油"],
    days: [
      buildWeeklyDay("周一", [mealCatalog.veggieEggWrap, mealCatalog.tomatoChickenRice, mealCatalog.tomatoTofuSoup], "balanced", "训练日版本，早餐和午餐蛋白质拉高。"),
      buildWeeklyDay("周二", [mealCatalog.yogurtNuts, mealCatalog.shrimpBuckwheat, mealCatalog.steamedFishVeg], "balanced", "鱼类安排在周二，提升脂肪质量。"),
      buildWeeklyDay("周三", [mealCatalog.oatmealEgg, mealCatalog.tomatoBeefNoodles, mealCatalog.tomatoEggOat], "balanced", "中周蛋白继续保持，避免下午乏力。"),
      buildWeeklyDay("周四", [mealCatalog.milkBananaOat, mealCatalog.chickenSaladRice, mealCatalog.veggieTofu], "light", "周四做轻一点，给周五留弹性。"),
      buildWeeklyDay("周五", [mealCatalog.boiledEggCorn, mealCatalog.beefVegRice, mealCatalog.steamedFishVeg], "needs_attention", "周五蛋白充足，但晚餐盐分要控。"),
    ],
  },
  {
    id: "light_reset",
    title: "轻负担恢复周",
    description: "控制热量和盐油，适合工作繁忙、希望饮食更轻的时候。",
    tags: ["清淡饮食", "控糖控盐", "低脂减油"],
    days: [
      buildWeeklyDay("周一", [mealCatalog.milkBananaOat, mealCatalog.chickenSaladRice, mealCatalog.tomatoTofuSoup], "light", "周一先压热量，帮助恢复节奏。"),
      buildWeeklyDay("周二", [mealCatalog.boiledEggCorn, mealCatalog.tomatoChickenRice, mealCatalog.tofuGreensSoup], "light", "晚餐更温和，适合压力较大的工作日。"),
      buildWeeklyDay("周三", [mealCatalog.oatmealEgg, mealCatalog.shrimpBuckwheat, mealCatalog.veggieTofu], "balanced", "利用库存番茄和西兰花，减少浪费。"),
      buildWeeklyDay("周四", [mealCatalog.veggieEggWrap, mealCatalog.chickenSaladRice, mealCatalog.tomatoEggOat], "light", "周四继续低负担，便于坚持。"),
      buildWeeklyDay("周五", [mealCatalog.milkBananaOat, mealCatalog.tomatoBeefNoodles, mealCatalog.tomatoTofuSoup], "balanced", "周五稍微回升热量，避免过度饥饿。"),
    ],
  },
];
