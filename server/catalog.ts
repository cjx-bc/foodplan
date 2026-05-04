import type { MealRecommendationRecord } from "./types.js";

function cloneMeal(meal: MealRecommendationRecord, overrides?: Partial<MealRecommendationRecord>): MealRecommendationRecord {
  return {
    ...meal,
    ...overrides,
    nutrition: overrides?.nutrition ? { ...overrides.nutrition } : { ...meal.nutrition },
    ingredients: overrides?.ingredients ? overrides.ingredients.map((item) => ({ ...item })) : meal.ingredients.map((item) => ({ ...item })),
    steps: overrides?.steps ? [...overrides.steps] : [...meal.steps],
  };
}

const breakfastBase: MealRecommendationRecord = {
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
};

const lunchBase: MealRecommendationRecord = {
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
};

const dinnerBase: MealRecommendationRecord = {
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
};

export const mealCatalog = {
  breakfast: [
    cloneMeal(breakfastBase),
    cloneMeal(breakfastBase, {
      id: "meal_breakfast_2",
      title: "鸡蛋蔬菜卷 + 无糖豆浆",
      description: "更高蛋白的早餐替代，适合早晨训练日。",
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 12,
      nutrition: { calories: 390, protein: 28, carbs: 35, fat: 13, fiber: 6 },
      aiTip: "蛋白质更高，但脂肪略升，适合需要更强饱腹感时使用。",
    }),
    cloneMeal(breakfastBase, {
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
  ],
  lunch: [
    cloneMeal(lunchBase),
    cloneMeal(lunchBase, {
      id: "meal_lunch_2",
      title: "西兰花虾仁荞麦面",
      description: "用西兰花和虾仁提高蛋白质，午餐更清爽。",
      imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 20,
      nutrition: { calories: 525, protein: 39, carbs: 61, fat: 12, fiber: 8 },
      aiTip: "脂肪更低，纤维更高，适合下午需要轻盈状态。",
    }),
    cloneMeal(lunchBase, {
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
  ],
  dinner: [
    cloneMeal(dinnerBase),
    cloneMeal(dinnerBase, {
      id: "meal_dinner_2",
      title: "鸡蛋番茄燕麦粥",
      description: "把库存番茄和鸡蛋用于晚餐，温和且低负担。",
      imageUrl: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=720&q=80",
      cookTimeMinutes: 16,
      nutrition: { calories: 410, protein: 24, carbs: 44, fat: 10, fiber: 6 },
      ingredients: [
        { name: "番茄", amount: "1 个", fromInventory: true, optional: false },
        { name: "鸡蛋", amount: "2 个", fromInventory: true, optional: false },
        { name: "燕麦", amount: "35 g", fromInventory: false, optional: false },
      ],
      aiTip: "晚餐继续使用库存番茄和鸡蛋，脂肪控制更好。",
    }),
    cloneMeal(dinnerBase, {
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
  ],
} as const;
