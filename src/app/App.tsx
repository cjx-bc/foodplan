import {
  Bell,
  BotMessageSquare,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  Download,
  Leaf,
  Lightbulb,
  NotebookTabs,
  PieChart,
  Printer,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Soup,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { IconButton } from "../components/IconButton";
import {
  initialInventory,
  initialMeals,
  initialMessages,
  initialShoppingList,
  mealAlternatives,
  userProfile,
  weeklyPlanPresets,
  weeklyPreferenceOptions,
} from "../data/mockData";
import { ChatPanel } from "../features/chat/ChatPanel";
import { InventoryPanel, type InventoryFormValue } from "../features/inventory/InventoryPanel";
import { TodayMealsPanel } from "../features/meals/TodayMealsPanel";
import { NutritionPanel } from "../features/nutrition/NutritionPanel";
import { ShoppingListPanel } from "../features/shopping/ShoppingListPanel";
import type {
  AiActionSummary,
  ChatMessage,
  DerivedShoppingListItem,
  InventoryItem,
  MealRecommendation,
  MealType,
  PlanningMode,
  ShoppingListItem,
  WeeklyPlanDay,
  WeeklyPlanPreset,
} from "../types/smartmeal";
import { mealTypeLabels } from "../utils/labels";
import {
  buildShoppingSummary,
  deriveActiveMeals,
  deriveShoppingList,
  deriveWeeklyInsights,
  getSelectedWeeklyDay,
  mergeShoppingSelection,
  type PlanningState,
} from "../utils/planning";
import { buildNutritionSummary } from "../utils/nutrition";
import styles from "./App.module.css";

type PageId = "chat" | "today" | "inventory" | "weekly" | "nutrition" | "shopping";

const navItems: Array<{ id: PageId; label: string; icon: typeof BotMessageSquare }> = [
  { id: "chat", label: "AI 对话", icon: BotMessageSquare },
  { id: "today", label: "今日三餐", icon: Soup },
  { id: "inventory", label: "库存管理", icon: NotebookTabs },
  { id: "weekly", label: "每周计划", icon: CalendarDays },
  { id: "nutrition", label: "营养统计", icon: PieChart },
  { id: "shopping", label: "购物清单", icon: ShoppingCart },
];

const pageMeta: Record<PageId, { step: number; title: string; description: string }> = {
  chat: {
    step: 1,
    title: "首页 / AI 对话搭配页",
    description: "从一句饮食需求开始，生成今日三餐、营养反馈和购物清单。",
  },
  today: {
    step: 2,
    title: "今日三餐页",
    description: "查看早餐、午餐、晚餐细节，快速替换餐食并确认今天吃什么。",
  },
  inventory: {
    step: 3,
    title: "库存管理页",
    description: "维护家里的食材、数量和过期日期，让 AI 优先使用库存。",
  },
  weekly: {
    step: 4,
    title: "每周计划页",
    description: "按偏好生成一周三餐草稿，逐日微调并确认采用本周计划。",
  },
  nutrition: {
    step: 5,
    title: "营养统计页",
    description: "对比目标和当前餐单，查看热量、蛋白质、碳水、脂肪和膳食纤维。",
  },
  shopping: {
    step: 6,
    title: "购物清单页",
    description: "按分类查看缺口食材，保留已勾选采购项，并给出采购建议。",
  },
};

const actionReplies: Record<string, string> = {
  推荐食材替换: "可以，我先保留整体营养目标，只对今天的餐单做更适合库存的替换。",
  快捷调整营养目标: "已按轻体力工作日目标微调：总热量控制在 1900 kcal，蛋白质目标 95g。",
  减少油脂: "已减少烹调用油，午餐改为少油煎，晚餐以汤菜为主，预计脂肪减少约 8g。",
  提升蛋白质: "已提高蛋白质优先级，晚餐增加鸡蛋，全天蛋白质更接近目标。",
  控制热量: "已控制热量，午餐和晚餐更轻，全天热量预计更接近目标下沿。",
  多用库存食材: "已优先使用库存中的鸡蛋、番茄、鸡胸肉、西兰花和牛奶，购物清单已按缺口重算。",
  生成购物清单: "已根据当前执行方案重新整理购物清单，并保留已勾选采购项。",
};

const suggestions = [
  "蛋白质略低，建议晚餐加 1 个鸡蛋或增加 80g 豆腐。",
  "蔬菜摄入接近目标，西兰花和青菜可优先安排在午晚餐。",
  "脂肪控制良好，继续保持少油煎和汤菜组合。",
];

const defaultActionSummary: AiActionSummary = {
  title: "已生成今日方案",
  affectedMeals: ["早餐", "午餐", "晚餐"],
  nutritionChanges: ["蛋白质接近目标", "脂肪控制良好"],
  shoppingChanges: ["保留 3 项待买", "排除库存鸡蛋"],
  inventoryUsage: ["鸡蛋", "番茄", "鸡胸肉", "西兰花", "牛奶"],
};

const mealTypeOrder: MealType[] = ["breakfast", "lunch", "dinner"];
const weekDates = ["05/12", "05/13", "05/14", "05/15", "05/16", "05/17", "05/18"];

function getInitialPage(): PageId {
  const page = window.location.hash.replace("#/", "") as PageId;
  return navItems.some((item) => item.id === page) ? page : "chat";
}

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function cloneMeal(meal: MealRecommendation): MealRecommendation {
  return {
    ...meal,
    nutrition: { ...meal.nutrition },
    ingredients: meal.ingredients.map((item) => ({ ...item })),
    steps: [...meal.steps],
  };
}

function cloneMeals(meals: MealRecommendation[]) {
  return meals.map((meal) => cloneMeal(meal));
}

function cloneWeeklyDays(days: WeeklyPlanDay[]) {
  return days.map((day) => ({
    ...day,
    meals: cloneMeals(day.meals),
    inventoryFocus: [...day.inventoryFocus],
    shoppingGap: [...day.shoppingGap],
  }));
}

function getPlanStatusLabel(status: WeeklyPlanDay["status"]) {
  if (status === "balanced") return "均衡";
  if (status === "light") return "轻负担";
  return "需微调";
}

function getBestWeeklyPreset(preferences: string[], currentPresetId: string) {
  const ranked = weeklyPlanPresets
    .map((preset, index) => ({
      preset,
      index,
      score: preferences.filter((item) => preset.tags.includes(item)).length,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const bestScore = ranked[0]?.score ?? 0;
  const tied = ranked.filter((item) => item.score === bestScore);
  return tied.find((item) => item.preset.id !== currentPresetId)?.preset ?? ranked[0]?.preset ?? weeklyPlanPresets[0];
}

function buildAssistantMessage(content: string, meals: MealRecommendation[], shoppingList: DerivedShoppingListItem[]): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: "assistant",
    content,
    createdAt: nowTime(),
    structuredResult: {
      meals,
      nutritionSummary: buildNutritionSummary(meals, userProfile),
      shoppingList: shoppingList.map(({ source, stableKey, ...item }) => item),
      inventoryUsage: unique(meals.flatMap((meal) => meal.ingredients.filter((item) => item.fromInventory).map((item) => item.name))),
      suggestions,
    },
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function createShoppingSelectionRecord(items: ShoppingListItem[]) {
  return items.reduce<Record<string, boolean>>((record, item) => {
    record[`${item.name}|${item.amount}`] = item.checked;
    record[item.name] = item.checked;
    return record;
  }, {});
}

function getDefaultSelectedWeekday() {
  return weeklyPlanPresets[0]?.days[0]?.day ?? "周一";
}

function getMealsForSelectedDay(days: WeeklyPlanDay[], selectedWeekday: string) {
  return cloneMeals(getSelectedWeeklyDay(days, selectedWeekday)?.meals ?? []);
}

function haveSameMealIds(left: MealRecommendation[], right: MealRecommendation[]) {
  if (left.length !== right.length) return false;
  return left.every((meal, index) => meal.id === right[index]?.id);
}

function toCurrency(amount: number) {
  return `¥ ${amount.toFixed(1)}`;
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>(getInitialPage);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionSummary, setActionSummary] = useState<AiActionSummary>(defaultActionSummary);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [dailyPlan, setDailyPlan] = useState<MealRecommendation[]>(cloneMeals(initialMeals));
  const [planningMode, setPlanningMode] = useState<PlanningMode>("daily");
  const [selectedWeekday, setSelectedWeekday] = useState(getDefaultSelectedWeekday);
  const [shoppingSelections, setShoppingSelections] = useState<Record<string, boolean>>(() => createShoppingSelectionRecord(initialShoppingList));
  const [alternativeIndex, setAlternativeIndex] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [selectedWeeklyPreferences, setSelectedWeeklyPreferences] = useState<string[]>(["清淡饮食", "库存优先"]);
  const [weeklyPreset, setWeeklyPreset] = useState<WeeklyPlanPreset>(weeklyPlanPresets[0]);
  const [weeklyPlanDraft, setWeeklyPlanDraft] = useState<WeeklyPlanDay[]>(() => cloneWeeklyDays(weeklyPlanPresets[0].days));
  const [weeklyPlanApplied, setWeeklyPlanApplied] = useState(false);
  const [weeklyUpdatedAt, setWeeklyUpdatedAt] = useState(nowTime());
  const [weeklyDayAdjustments, setWeeklyDayAdjustments] = useState<Record<string, number>>({});

  const planningState: PlanningState = useMemo(() => ({
    planningMode,
    dailyPlan,
    weeklyPlanDraft,
    weeklyPlanApplied,
    selectedWeekday,
    inventory,
  }), [planningMode, dailyPlan, weeklyPlanDraft, weeklyPlanApplied, selectedWeekday, inventory]);

  const activeMeals = useMemo(() => deriveActiveMeals(planningState), [planningState]);
  const rawShoppingItems = useMemo(() => deriveShoppingList(planningState), [planningState]);
  const shoppingItems = useMemo(() => mergeShoppingSelection(rawShoppingItems, shoppingSelections), [rawShoppingItems, shoppingSelections]);
  const shoppingSummary = useMemo(() => buildShoppingSummary(shoppingItems), [shoppingItems]);
  const nutritionSummary = useMemo(() => buildNutritionSummary(activeMeals, userProfile), [activeMeals]);
  const weeklyInsightResult = useMemo(() => deriveWeeklyInsights(planningState, weeklyUpdatedAt), [planningState, weeklyUpdatedAt]);
  const selectedWeeklyDay = useMemo(() => getSelectedWeeklyDay(weeklyPlanDraft, selectedWeekday), [weeklyPlanDraft, selectedWeekday]);
  const weeklyTodayMeals = useMemo(() => cloneMeals(selectedWeeklyDay?.meals ?? []), [selectedWeeklyDay]);

  const expiringItems = inventory.filter((item) => item.status === "expiring_soon");
  const expiringCount = expiringItems.length;
  const isWeeklyMode = planningMode === "weekly" && weeklyPlanApplied;
  const isDailySyncedFromWeekly = weeklyPlanApplied && haveSameMealIds(dailyPlan, weeklyTodayMeals);
  const weeklyMacroAverages = useMemo(() => {
    const days = Math.max(1, weeklyPlanDraft.length);
    const totals = weeklyPlanDraft.reduce(
      (sum, day) => {
        const nutrition = buildNutritionSummary(day.meals, userProfile).actual;
        return {
          protein: sum.protein + nutrition.protein,
          carbs: sum.carbs + nutrition.carbs,
          fat: sum.fat + nutrition.fat,
        };
      },
      { protein: 0, carbs: 0, fat: 0 },
    );

    return {
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fat: Math.round(totals.fat / days),
    };
  }, [weeklyPlanDraft]);
  const todayContextNote = weeklyPlanApplied
    ? isDailySyncedFromWeekly
      ? `当前餐单来自已确认周计划的 ${selectedWeekday} 安排。`
      : `当前餐单基于已确认周计划做了今日本地调整，采购和营养会按今日执行重新计算。`
    : "当前餐单是今日独立草稿，会直接驱动营养统计和采购缺口。";
  const nutritionContextNote = isWeeklyMode
    ? `当前营养统计展示的是 ${selectedWeekday} 的执行餐单，整周采购缺口已另外汇总到购物清单。`
    : "当前营养统计只跟随今日三餐变化。";

  useEffect(() => {
    function syncHashRoute() {
      setActivePage(getInitialPage());
    }

    window.addEventListener("hashchange", syncHashRoute);
    return () => window.removeEventListener("hashchange", syncHashRoute);
  }, []);

  function navigate(page: PageId) {
    window.location.hash = `/${page}`;
    setActivePage(page);
  }

  function appendAssistantMessage(content: string, mealsSnapshot = activeMeals, shoppingSnapshot = shoppingItems) {
    setMessages((current) => [...current, buildAssistantMessage(content, cloneMeals(mealsSnapshot), shoppingSnapshot)]);
  }

  function pushUserAndAssistant(message: string, reply: string, mealsSnapshot = activeMeals, shoppingSnapshot = shoppingItems) {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: message,
      createdAt: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    setIsGenerating(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, buildAssistantMessage(reply, cloneMeals(mealsSnapshot), shoppingSnapshot)]);
      setIsGenerating(false);
    }, 650);
  }

  function handleSend(message: string) {
    const reply = message.includes("番茄") || message.includes("鸡蛋")
      ? "收到，我会优先使用库存中的番茄和鸡蛋，并把今天的午餐做成高蛋白、晚餐控制热量的组合。"
      : "收到，我会先围绕今天的执行餐单给出建议，并同步刷新营养概览与购物清单。";

    setPlanningMode("daily");
    setActionSummary({
      title: "已按输入生成方案",
      affectedMeals: ["午餐", "晚餐"],
      nutritionChanges: ["蛋白质 +9g", "晚餐热量降低"],
      shoppingChanges: ["已切回今日采购", "购物缺口按当前执行方案重算"],
      inventoryUsage: message.includes("番茄") || message.includes("鸡蛋") ? ["番茄", "鸡蛋", "鸡胸肉"] : defaultActionSummary.inventoryUsage,
    });
    pushUserAndAssistant(message, reply);
  }

  function handleQuickAction(action: string) {
    let nextDailyPlan = cloneMeals(dailyPlan);

    if (action === "提升蛋白质") {
      nextDailyPlan = nextDailyPlan.map((meal) =>
        meal.mealType === "dinner"
          ? {
              ...meal,
              title: "番茄豆腐鸡蛋汤 + 清炒时蔬",
              nutrition: { ...meal.nutrition, calories: meal.nutrition.calories + 70, protein: meal.nutrition.protein + 9, fat: meal.nutrition.fat + 4 },
              ingredients: [...meal.ingredients, { name: "鸡蛋", amount: "1 个", fromInventory: true, optional: false }],
              aiTip: "已加入库存鸡蛋，蛋白质提升约 9g。",
            }
          : meal,
      );
    }

    if (action === "减少油脂" || action === "控制热量") {
      nextDailyPlan = nextDailyPlan.map((meal) =>
        meal.mealType === "lunch"
          ? {
              ...meal,
              nutrition: { ...meal.nutrition, calories: Math.max(0, meal.nutrition.calories - 80), fat: Math.max(0, meal.nutrition.fat - 6) },
              aiTip: "已将午餐改为少油烹饪，热量和脂肪同步下降。",
            }
          : meal,
      );
    }

    setPlanningMode("daily");
    setDailyPlan(nextDailyPlan);
    setActionSummary({
      title: action,
      affectedMeals: action === "提升蛋白质" ? ["早餐", "晚餐"] : action === "多用库存食材" ? ["午餐", "晚餐"] : ["午餐"],
      nutritionChanges: action === "减少油脂" || action === "控制热量" ? ["热量 -80kcal", "脂肪 -6g"] : action === "提升蛋白质" ? ["蛋白质 +9g"] : ["目标已同步"],
      shoppingChanges: action === "生成购物清单" ? ["按今日执行方案重算", "保留已勾选采购项"] : ["购物清单已复核"],
      inventoryUsage: ["鸡蛋", "番茄", "鸡胸肉", "西兰花"],
    });
    pushUserAndAssistant(action, actionReplies[action] ?? "已应用该快捷操作，并同步更新今日方案。", nextDailyPlan, shoppingItems);
  }

  function handleSwapMeal(mealType: MealType) {
    const alternatives = mealAlternatives[mealType];
    const nextIndex = (alternativeIndex[mealType] + 1) % alternatives.length;
    const nextMeal = cloneMeal(alternatives[nextIndex]);
    const nextDailyPlan = dailyPlan.map((meal) => (meal.mealType === mealType ? nextMeal : cloneMeal(meal)));

    setAlternativeIndex((current) => ({ ...current, [mealType]: nextIndex }));
    setPlanningMode("daily");
    setDailyPlan(nextDailyPlan);
    setMessages((current) => [
      ...current,
      buildAssistantMessage(`已替换${mealTypeLabels[mealType]}为「${nextMeal.title}」。这次修改只影响今天的执行餐单，不会改写整周草稿。`, nextDailyPlan, shoppingItems),
    ]);
    setActionSummary({
      title: `已替换${mealTypeLabels[mealType]}`,
      affectedMeals: [mealTypeLabels[mealType]],
      nutritionChanges: [`热量 ${nextMeal.nutrition.calories}kcal`, `蛋白质 ${nextMeal.nutrition.protein}g`],
      shoppingChanges: ["已切回今日采购视图", "按新食材复核缺口"],
      inventoryUsage: nextMeal.ingredients.filter((item) => item.fromInventory).map((item) => item.name),
    });
  }

  function deriveInventoryStatus(expireDate: string): InventoryItem["status"] {
    const today = new Date("2026-05-04T00:00:00");
    const expiry = new Date(`${expireDate}T00:00:00`);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) return "expired";
    if (daysLeft <= 3) return "expiring_soon";
    return "fresh";
  }

  function handleAddInventory(value: InventoryFormValue) {
    const nextItem: InventoryItem = {
      id: `inv_${Date.now()}`,
      name: value.name,
      category: value.category,
      quantity: value.quantity,
      expireDate: value.expireDate,
      status: deriveInventoryStatus(value.expireDate),
    };

    setInventory((current) => [nextItem, ...current]);
    setActionSummary({
      title: "库存已更新",
      affectedMeals: ["后续推荐"],
      nutritionChanges: ["营养目标不变"],
      shoppingChanges: ["购物缺口会按新库存重新判断"],
      inventoryUsage: [value.name],
    });
    appendAssistantMessage(`已新增库存「${value.name}」，当前采购缺口会自动按最新库存重算。`);
  }

  function handleToggleShopping(id: string) {
    const target = shoppingItems.find((item) => item.id === id);
    if (!target) return;
    setShoppingSelections((current) => ({
      ...current,
      [target.stableKey]: !(current[target.stableKey] ?? target.checked),
      [target.name]: !(current[target.stableKey] ?? target.checked),
    }));
  }

  function handleToggleWeeklyPreference(preference: string) {
    setSelectedWeeklyPreferences((current) => {
      if (current.includes(preference)) {
        return current.length === 1 ? current : current.filter((item) => item !== preference);
      }
      return [...current, preference];
    });
    setWeeklyPlanApplied(false);
  }

  function handleGenerateWeeklyPlan() {
    const nextPreset = getBestWeeklyPreset(selectedWeeklyPreferences, weeklyPreset.id);
    const nextDays = cloneWeeklyDays(nextPreset.days);

    setWeeklyPreset(nextPreset);
    setWeeklyPlanDraft(nextDays);
    setWeeklyPlanApplied(false);
    setWeeklyUpdatedAt(nowTime());
    setWeeklyDayAdjustments({});
    setSelectedWeekday(nextDays[0]?.day ?? selectedWeekday);
    appendAssistantMessage(`已生成「${nextPreset.title}」，当前仍是周计划草稿；确认采用后，总览和采购会切到本周执行视图。`);
  }

  function handleAdjustWeeklyDay(dayName: string) {
    const dayIndex = weeklyPlanDraft.findIndex((day) => day.day === dayName);
    if (dayIndex < 0) return;

    const nextIndex = ((weeklyDayAdjustments[dayName] ?? weeklyPlanPresets.findIndex((preset) => preset.id === weeklyPreset.id)) + 1) % weeklyPlanPresets.length;
    const replacement = cloneWeeklyDays([weeklyPlanPresets[nextIndex].days[dayIndex]])[0];
    const nextWeeklyPlan = weeklyPlanDraft.map((day, index) => (index === dayIndex ? replacement : day));

    setWeeklyPlanDraft(nextWeeklyPlan);
    setWeeklyDayAdjustments((current) => ({ ...current, [dayName]: nextIndex }));
    setWeeklyPlanApplied(false);
    setWeeklyUpdatedAt(nowTime());
    if (dayName === selectedWeekday && weeklyPlanApplied) {
      setDailyPlan(cloneMeals(replacement.meals));
    }
    appendAssistantMessage(`已微调${dayName}，新的晚餐重点是「${replacement.dinner}」，相关采购缺口和周洞察已同步重算。`);
  }

  function handleConfirmWeeklyPlan() {
    const nextDailyMeals = getMealsForSelectedDay(weeklyPlanDraft, selectedWeekday);
    setWeeklyPlanApplied(true);
    setPlanningMode("weekly");
    setDailyPlan(nextDailyMeals);
    setWeeklyUpdatedAt(nowTime());
    setActionSummary({
      title: "已采用本周计划",
      affectedMeals: [selectedWeekday],
      nutritionChanges: [`平均热量 ${weeklyInsightResult.averageCalories} kcal`, `${weeklyInsightResult.attentionCount} 天需继续微调`],
      shoppingChanges: ["购物清单已切到本周采购", "已勾选食材状态保留"],
      inventoryUsage: weeklyInsightResult.inventoryItems,
    });
    appendAssistantMessage(`本周计划已确认采用，今日三餐已切换为 ${selectedWeekday} 的安排，购物清单会按整周缺口整理。`, nextDailyMeals, shoppingItems);
  }

  function renderChatPage() {
    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.chat.step} title={pageMeta.chat.title} description={pageMeta.chat.description} />
        <div className={styles.chatGrid}>
          <ChatPanel messages={messages} isGenerating={isGenerating} onSend={handleSend} onQuickAction={handleQuickAction} />
          <div className={styles.chatRail}>
            <SurfaceCard title="今日三餐总览">
              <div className={styles.miniMealList}>
                {activeMeals.map((meal) => (
                  <MiniMealRow key={meal.id} image={meal.imageUrl} title={meal.title} meta={`${mealTypeLabels[meal.mealType]}`} value={`${meal.nutrition.calories} kcal`} />
                ))}
              </div>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("today")}>查看今日三餐详情</button>
            </SurfaceCard>
            <SurfaceCard title="营养完成度" emphasis={`${nutritionSummary.score} 分`}>
              <div className={styles.compactProgressList}>
                <CompactProgressRow label="热量" value={`${nutritionSummary.actual.calories} / ${nutritionSummary.target.calories} kcal`} percent={Math.round((nutritionSummary.actual.calories / nutritionSummary.target.calories) * 100)} />
                <CompactProgressRow label="蛋白质" value={`${nutritionSummary.actual.protein} / ${nutritionSummary.target.protein} g`} percent={Math.round((nutritionSummary.actual.protein / nutritionSummary.target.protein) * 100)} />
                <CompactProgressRow label="碳水" value={`${nutritionSummary.actual.carbs} / ${nutritionSummary.target.carbs} g`} percent={Math.round((nutritionSummary.actual.carbs / nutritionSummary.target.carbs) * 100)} />
                <CompactProgressRow label="脂肪" value={`${nutritionSummary.actual.fat} / ${nutritionSummary.target.fat} g`} percent={Math.round((nutritionSummary.actual.fat / nutritionSummary.target.fat) * 100)} />
                <CompactProgressRow label="膳食纤维" value={`${nutritionSummary.actual.fiber} / ${nutritionSummary.target.fiber} g`} percent={Math.round((nutritionSummary.actual.fiber / nutritionSummary.target.fiber) * 100)} />
              </div>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("nutrition")}>查看营养统计</button>
            </SurfaceCard>
          </div>
          <div className={styles.chatRail}>
            <SurfaceCard title="库存提醒" emphasis={`${expiringCount} 个临期`}>
              <p className={styles.cardDetail}>番茄、西兰花、牛奶建议优先使用。</p>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("inventory")}>查看库存管理</button>
            </SurfaceCard>
            <SurfaceCard title="购物清单" emphasis={`${shoppingSummary.remainingCount} 项待买`}>
              <p className={styles.cardDetail}>{shoppingSummary.firstItems.join("、") || "当前无待买项目。"}，可按分类快速勾选。</p>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("shopping")}>查看购物清单</button>
            </SurfaceCard>
          </div>
        </div>
        <div className={styles.bottomShortcutBar}>
          <span>智能快捷操作</span>
          <div className={styles.shortcutButtons}>
            {["推荐食材替换", "提升蛋白质", "控制热量", "多用库存食材", "快捷调整营养目标"].map((label) => (
              <button key={label} type="button" onClick={() => handleQuickAction(label)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderTodayPage() {
    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.today.step} title={pageMeta.today.title} description={pageMeta.today.description} />
        <div className={styles.contentSplit}>
          <TodayMealsPanel meals={activeMeals} contextNote={todayContextNote} onSwapMeal={handleSwapMeal} />
          <div className={styles.sideStack}>
            <NutritionPanel summary={nutritionSummary} suggestions={suggestions} contextNote={nutritionContextNote} />
            <SurfaceCard title="AI 个性化建议">
              <p className={styles.cardDetail}>当前方案已接近目标值，蛋白质和蔬菜覆盖最稳定。确认方案后，购物清单会直接作为执行入口。</p>
              <button className={styles.primaryBlockAction} type="button" onClick={() => navigate("shopping")}>生成明日方案</button>
            </SurfaceCard>
          </div>
        </div>
      </section>
    );
  }

  function renderInventoryPage() {
    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.inventory.step} title={pageMeta.inventory.title} description={pageMeta.inventory.description} />
        <InventoryPanel inventory={inventory} onAddInventory={handleAddInventory} />
      </section>
    );
  }

  function renderWeeklyPage() {
    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.weekly.step} title={pageMeta.weekly.title} description={pageMeta.weekly.description} />
        <div className={styles.weeklyBoard}>
          <aside className={styles.weeklySidebar}>
            <SurfaceCard title="计划偏好">
              <div className={styles.preferenceList}>
                {weeklyPreferenceOptions.map((preference) => (
                  <button
                    key={preference}
                    type="button"
                    className={selectedWeeklyPreferences.includes(preference) ? styles.preferenceActive : ""}
                    onClick={() => handleToggleWeeklyPreference(preference)}
                  >
                    {preference}
                  </button>
                ))}
              </div>
              <button className={styles.inlineAction} type="button" onClick={handleGenerateWeeklyPlan}>更多偏好设置</button>
            </SurfaceCard>
          </aside>
          <div className={styles.weeklyMainBoard}>
            <div className={styles.weeklyTopbar}>
              <div className={styles.weekRange}>
                <strong>本周计划</strong>
                <span>2026/05/12 - 2026/05/18</span>
              </div>
              <div className={styles.weeklyActions}>
                <button type="button" onClick={handleGenerateWeeklyPlan}>
                  <ClipboardCheck size={16} />
                  生成本周计划
                </button>
                <button type="button" className={styles.primaryMiniAction} onClick={handleConfirmWeeklyPlan}>确认采用</button>
              </div>
            </div>
            <div className={styles.weekPlanner}>
              <div className={styles.weekPlannerHeader}>
                <span>计划阶段</span>
                {weeklyPlanDraft.map((day, index) => (
                  <button
                    key={day.day}
                    type="button"
                    className={day.day === selectedWeekday ? styles.dayPillActive : styles.dayPill}
                    onClick={() => setSelectedWeekday(day.day)}
                  >
                    <strong>{day.day}</strong>
                    <small>{weekDates[index] ?? "--/--"}</small>
                  </button>
                ))}
              </div>
              {mealTypeOrder.map((mealType) => (
                <div key={mealType} className={styles.weekPlannerRow}>
                  <span className={styles.mealAxisLabel}>{mealTypeLabels[mealType]}</span>
                  {weeklyPlanDraft.map((day, dayIndex) => {
                    const meal = day.meals.find((item) => item.mealType === mealType) ?? day.meals[0];
                    const image = mealAlternatives[mealType][dayIndex % mealAlternatives[mealType].length]?.imageUrl ?? meal.imageUrl;
                    return (
                      <button
                        key={`${day.day}-${mealType}`}
                        type="button"
                        className={styles.weekMealCell}
                        onClick={() => setSelectedWeekday(day.day)}
                      >
                        <img src={image} alt={meal.title} />
                        <strong>{meal.title}</strong>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.weeklyFooterCards}>
              <SurfaceCard title="本周营养预估" emphasis={`${weeklyInsightResult.averageCalories} kcal`}>
                <div className={styles.footerMetricGrid}>
                  <MetricTile label="日均热量" value={`${weeklyInsightResult.averageCalories} kcal`} />
                  <MetricTile label="日均蛋白质" value={`${weeklyMacroAverages.protein} g`} />
                  <MetricTile label="脂肪均值" value={`${weeklyMacroAverages.fat} g`} />
                  <MetricTile label="碳水均值" value={`${weeklyMacroAverages.carbs} g`} />
                </div>
              </SurfaceCard>
              <SurfaceCard title="AI 反馈">
                <p className={styles.cardDetail}>{weeklyInsightResult.items[1]?.detail ?? "本周计划已经根据热量和库存覆盖率做过一次初步平衡。"}</p>
                <button className={styles.inlineAction} type="button" onClick={() => handleAdjustWeeklyDay(selectedWeekday)}>查看营养分析</button>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderNutritionPage() {
    const trendValues = weeklyPlanDraft.map((day) => day.calories);
    const chartTarget = userProfile.dailyCalorieTarget;
    const chartActual = Math.round(trendValues.reduce((sum, value) => sum + value, 0) / Math.max(1, trendValues.length));
    const macroSegments = [
      { label: "碳水", value: nutritionSummary.actual.carbs, color: "#2f8f58" },
      { label: "蛋白", value: nutritionSummary.actual.protein, color: "#ffd36a" },
      { label: "脂肪", value: nutritionSummary.actual.fat, color: "#f08f45" },
    ];

    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.nutrition.step} title={pageMeta.nutrition.title} description={pageMeta.nutrition.description} />
        <div className={styles.nutritionDashboard}>
          <div className={styles.nutritionTopbar}>
            <div className={styles.filterPills}>
              <button type="button" className={styles.filterActive}>今日</button>
              <button type="button">近 7 天</button>
              <button type="button">近 30 天</button>
              <button type="button">自定义</button>
            </div>
            <div className={styles.dateRange}>2026/05/06 - 2026/05/12</div>
          </div>
          <div className={styles.metricStrip}>
            <MetricTile label="总热量（日均）" value={`${chartActual} kcal`} />
            <MetricTile label="蛋白质（日均）" value={`${Math.round(nutritionSummary.actual.protein)} g`} />
            <MetricTile label="碳水（日均）" value={`${Math.round(nutritionSummary.actual.carbs)} g`} />
            <MetricTile label="脂肪（日均）" value={`${Math.round(nutritionSummary.actual.fat)} g`} />
            <MetricTile label="膳食纤维（日均）" value={`${Math.round(nutritionSummary.actual.fiber)} g`} />
          </div>
          <div className={styles.nutritionCharts}>
            <SurfaceCard title="热量趋势">
              <LineChartCard values={trendValues} target={chartTarget} />
            </SurfaceCard>
            <SurfaceCard title="营养素占比">
              <DonutChartCard segments={macroSegments} />
            </SurfaceCard>
          </div>
          <div className={styles.nutritionBottom}>
            <NutritionPanel summary={nutritionSummary} suggestions={suggestions} contextNote={nutritionContextNote} />
            <SurfaceCard title="AI 解读">
              <p className={styles.cardDetail}>近 7 天整体营养摄入良好，热量略低于目标，有助于体重管理；蛋白质基本达标，建议在运动日增加豆腐或鸡蛋摄入；碳水来源以全麦更为稳妥。</p>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("today")}>查看详细分析</button>
            </SurfaceCard>
          </div>
        </div>
      </section>
    );
  }

  function renderShoppingPage() {
    const estimatedBudget = shoppingItems.reduce((sum, item, index) => sum + (index + 2) * 1.6, 0);
    const optimizedBudget = Math.max(estimatedBudget - 15.2, 0);
    const categories = Array.from(new Set(shoppingItems.map((item) => item.category))).length;

    return (
      <section className={styles.pageFrame}>
        <PageTitle step={pageMeta.shopping.step} title={pageMeta.shopping.title} description={pageMeta.shopping.description} />
        <div className={styles.shoppingLayout}>
          <div className={styles.shoppingMain}>
            <div className={styles.shoppingStats}>
              <MetricTile label="待买项目" value={`${shoppingSummary.remainingCount} 项`} />
              <MetricTile label="预计花费" value={toCurrency(estimatedBudget)} />
              <MetricTile label="覆盖餐次" value={`${categories} 类食材`} />
            </div>
            <ShoppingListPanel items={shoppingItems} modeLabel={isWeeklyMode ? "本周采购" : "今日采购"} onToggle={handleToggleShopping} />
          </div>
          <aside className={styles.shoppingAside}>
            <div className={styles.asideActions}>
              <button type="button">
                <Printer size={16} />
                打印购物单
              </button>
              <button type="button">
                <Download size={16} />
                导出清单
              </button>
            </div>
            <SurfaceCard title="AI 购物建议">
              <ul className={styles.suggestionList}>
                <li>优先采购叶菜和豆腐，已为晚餐组合做过联动优化。</li>
                <li>预算里约 9 成是高频消耗类食材，可一次性补足。</li>
                <li>预计可节省约 {toCurrency(15.2)}，避免重复购买库存食材。</li>
              </ul>
              <button className={styles.primaryBlockAction} type="button">更新生成清单</button>
            </SurfaceCard>
            <SurfaceCard title="常买清单" emphasis={toCurrency(optimizedBudget)}>
              <p className={styles.cardDetail}>豆腐、青菜、燕麦、牛奶是当前阶段最稳定的缺口食材，可直接复用到下一次生成。</p>
              <button className={styles.inlineAction} type="button" onClick={() => navigate("inventory")}>管理常买食材</button>
            </SurfaceCard>
          </aside>
        </div>
      </section>
    );
  }

  function renderPage() {
    if (activePage === "chat") return renderChatPage();
    if (activePage === "today") return renderTodayPage();
    if (activePage === "inventory") return renderInventoryPage();
    if (activePage === "weekly") return renderWeeklyPage();
    if (activePage === "nutrition") return renderNutritionPage();
    return renderShoppingPage();
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.brand} type="button" onClick={() => navigate("chat")}>
          <span><Leaf size={18} /></span>
          <strong>SmartMeal <small>助手 MVP</small></strong>
        </button>

        <nav className={styles.nav} aria-label="主导航">
          {navItems.map(({ id, label }) => (
            <button
              className={activePage === id ? styles.activeNav : ""}
              type="button"
              key={id}
              onClick={() => navigate(id)}
              aria-current={activePage === id ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <button className={styles.headerCta} type="button" onClick={() => navigate("chat")}>立即和 AI 聊聊</button>
          <button className={styles.utilityButton} type="button" aria-label="消息提醒">
            <Bell size={16} />
          </button>
          <button className={styles.utilityButton} type="button" aria-label="用户中心">
            <CircleUserRound size={16} />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {renderPage()}
      </main>
    </div>
  );
}

function PageTitle({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className={styles.pageTitle}>
      <h2>{step} {title}</h2>
      <p>{description}</p>
    </div>
  );
}

function SurfaceCard({ title, emphasis, children }: { title: string; emphasis?: string; children: ReactNode }) {
  return (
    <section className={styles.surfaceCard}>
      <div className={styles.surfaceHeader}>
        <span>{title}</span>
        {emphasis ? <strong>{emphasis}</strong> : null}
      </div>
      {children}
    </section>
  );
}

function MiniMealRow({ image, title, meta, value }: { image: string; title: string; meta: string; value: string }) {
  return (
    <article className={styles.miniMealRow}>
      <img src={image} alt={title} />
      <div>
        <span>{meta}</span>
        <strong>{title}</strong>
      </div>
      <em>{value}</em>
    </article>
  );
}

function CompactProgressRow({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className={styles.compactProgressRow}>
      <div>
        <span>{label}</span>
        <small>{value}</small>
      </div>
      <div className={styles.progressTrack}>
        <i style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <em>{percent}%</em>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.metricTile}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function LineChartCard({ values, target }: { values: number[]; target: number }) {
  const width = 460;
  const height = 220;
  const padding = 24;
  const maxValue = Math.max(target, ...values) + 160;
  const minValue = Math.min(...values) - 120;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + (innerWidth * index) / Math.max(values.length - 1, 1);
    const ratio = (value - minValue) / Math.max(maxValue - minValue, 1);
    const y = height - padding - ratio * innerHeight;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const targetY = height - padding - ((target - minValue) / Math.max(maxValue - minValue, 1)) * innerHeight;

  return (
    <div className={styles.chartCard}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="热量趋势图">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(47,143,88,0.28)" />
            <stop offset="100%" stopColor="rgba(47,143,88,0.04)" />
          </linearGradient>
        </defs>
        <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} className={styles.chartTargetLine} />
        <polygon points={areaPoints} className={styles.chartArea} />
        <polyline points={points} className={styles.chartLine} />
      </svg>
      <div className={styles.chartLegend}>
        <span><i className={styles.actualLegend} />实际摄入</span>
        <span><i className={styles.targetLegend} />目标值</span>
      </div>
    </div>
  );
}

function DonutChartCard({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let offset = 0;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 180 180" className={styles.donutChart} role="img" aria-label="营养素占比图">
        <circle cx="90" cy="90" r="54" className={styles.donutBase} />
        {segments.map((segment) => {
          const circumference = 2 * Math.PI * 54;
          const slice = total === 0 ? 0 : (segment.value / total) * circumference;
          const currentOffset = offset;
          offset += slice;
          return (
            <circle
              key={segment.label}
              cx="90"
              cy="90"
              r="54"
              fill="none"
              stroke={segment.color}
              strokeWidth="24"
              strokeDasharray={`${slice} ${circumference}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 90 90)"
            />
          );
        })}
      </svg>
      <div className={styles.donutLegend}>
        {segments.map((segment) => (
          <div key={segment.label}>
            <span><i style={{ background: segment.color }} />{segment.label}</span>
            <strong>{total === 0 ? 0 : Math.round((segment.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
