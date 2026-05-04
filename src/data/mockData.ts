import type {
  ChatMessage,
  InventoryItem,
  MealRecommendation,
  ShoppingListItem,
  UserProfile,
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
      { day: "周一", breakfast: "燕麦水果杯", lunch: "番茄鸡胸肉饭", dinner: "番茄豆腐汤", calories: 1850, status: "balanced", note: "先消耗番茄和牛奶，开周保持清淡。", inventoryFocus: ["番茄", "牛奶"], shoppingGap: ["豆腐"] },
      { day: "周二", breakfast: "全麦蛋卷", lunch: "虾仁荞麦面", dinner: "清炒时蔬豆腐", calories: 1780, status: "light", note: "午餐减油，给周中留出热量空间。", inventoryFocus: ["鸡蛋", "西兰花"], shoppingGap: ["虾仁"] },
      { day: "周三", breakfast: "牛奶香蕉燕麦", lunch: "鸡肉沙拉饭", dinner: "鸡蛋番茄粥", calories: 1810, status: "balanced", note: "用库存鸡蛋做晚餐，减少额外采购。", inventoryFocus: ["牛奶", "鸡蛋", "番茄"], shoppingGap: ["生菜"] },
      { day: "周四", breakfast: "水煮蛋 + 玉米", lunch: "牛肉时蔬饭", dinner: "豆腐青菜汤", calories: 1920, status: "needs_attention", note: "周四偏丰盛，建议晚餐控制主食。", inventoryFocus: ["鸡蛋"], shoppingGap: ["牛肉", "青菜"] },
      { day: "周五", breakfast: "酸奶坚果杯", lunch: "番茄牛肉面", dinner: "清蒸鱼 + 时蔬", calories: 1880, status: "balanced", note: "周五适度放宽，但总热量仍可控。", inventoryFocus: ["番茄"], shoppingGap: ["鱼片", "酸奶"] },
    ],
  },
  {
    id: "protein_focus",
    title: "高蛋白训练周",
    description: "把蛋白质达标放在优先级前面，三餐更强调鸡蛋、鸡胸肉和鱼虾。",
    tags: ["高蛋白", "低脂减油"],
    days: [
      { day: "周一", breakfast: "鸡蛋蔬菜卷", lunch: "鸡胸肉藜麦饭", dinner: "虾仁豆腐汤", calories: 1910, status: "balanced", note: "训练日版本，早餐和午餐蛋白质拉高。", inventoryFocus: ["鸡蛋", "鸡胸肉"], shoppingGap: ["藜麦", "虾仁"] },
      { day: "周二", breakfast: "无糖酸奶坚果杯", lunch: "三文鱼杂粮饭", dinner: "清炒芦笋鸡蛋", calories: 1860, status: "balanced", note: "鱼类安排在周二，提升脂肪质量。", inventoryFocus: ["鸡蛋"], shoppingGap: ["三文鱼", "芦笋"] },
      { day: "周三", breakfast: "牛奶燕麦 + 水煮蛋", lunch: "番茄牛肉意面", dinner: "鸡丝蔬菜汤", calories: 1890, status: "balanced", note: "中周蛋白继续保持，避免下午乏力。", inventoryFocus: ["牛奶", "鸡蛋", "番茄"], shoppingGap: ["牛肉", "意面"] },
      { day: "周四", breakfast: "豆浆蛋饼", lunch: "虾仁西兰花饭", dinner: "香煎豆腐时蔬", calories: 1760, status: "light", note: "周四做轻一点，给周五留弹性。", inventoryFocus: ["西兰花"], shoppingGap: ["虾仁", "豆浆"] },
      { day: "周五", breakfast: "高蛋白奶昔", lunch: "鸡胸肉全麦卷", dinner: "番茄鱼片锅", calories: 1940, status: "needs_attention", note: "周五蛋白充足，但晚餐盐分要控。", inventoryFocus: ["番茄", "鸡胸肉"], shoppingGap: ["鱼片", "全麦饼"] },
    ],
  },
  {
    id: "light_reset",
    title: "轻负担恢复周",
    description: "控制热量和盐油，适合工作繁忙、希望饮食更轻的时候。",
    tags: ["清淡饮食", "控糖控盐", "低脂减油"],
    days: [
      { day: "周一", breakfast: "牛奶燕麦杯", lunch: "清蒸鸡肉蔬菜饭", dinner: "番茄菌菇汤", calories: 1720, status: "light", note: "周一先压热量，帮助恢复节奏。", inventoryFocus: ["牛奶", "番茄"], shoppingGap: ["菌菇"] },
      { day: "周二", breakfast: "水煮蛋 + 苹果", lunch: "豆腐杂蔬盖饭", dinner: "南瓜小米粥", calories: 1680, status: "light", note: "晚餐更温和，适合压力较大的工作日。", inventoryFocus: ["鸡蛋"], shoppingGap: ["南瓜", "小米"] },
      { day: "周三", breakfast: "酸奶水果碗", lunch: "番茄鸡蛋荞麦面", dinner: "清炒西兰花豆腐", calories: 1740, status: "balanced", note: "利用库存番茄和西兰花，减少浪费。", inventoryFocus: ["番茄", "西兰花"], shoppingGap: ["荞麦面", "酸奶"] },
      { day: "周四", breakfast: "玉米鸡蛋杯", lunch: "鸡胸肉青菜粥", dinner: "凉拌豆腐 + 时蔬", calories: 1700, status: "light", note: "周四继续低负担，便于坚持。", inventoryFocus: ["鸡蛋", "鸡胸肉"], shoppingGap: ["青菜"] },
      { day: "周五", breakfast: "无糖豆浆燕麦", lunch: "清汤牛肉粉", dinner: "番茄鱼片汤", calories: 1830, status: "balanced", note: "周五稍微回升热量，避免过度饥饿。", inventoryFocus: ["番茄"], shoppingGap: ["牛肉", "鱼片"] },
    ],
  },
];
