import {
  BotMessageSquare,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ArrowRight,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  NotebookTabs,
  PieChart,
  RefreshCw,
  ShoppingCart,
  SlidersHorizontal,
  Soup,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "../components/IconButton";
import { initialInventory, initialMeals, initialMessages, initialShoppingList, mealAlternatives, userProfile, weeklyPlanPresets, weeklyPreferenceOptions } from "../data/mockData";
import { ChatPanel } from "../features/chat/ChatPanel";
import { InventoryPanel, type InventoryFormValue } from "../features/inventory/InventoryPanel";
import { TodayMealsPanel } from "../features/meals/TodayMealsPanel";
import { NutritionPanel } from "../features/nutrition/NutritionPanel";
import { ShoppingListPanel } from "../features/shopping/ShoppingListPanel";
import type { AiActionSummary, ChatMessage, InsightMetric, InventoryItem, MealRecommendation, MealType, ShoppingListItem, WeeklyPlanDay, WeeklyPlanPreset } from "../types/smartmeal";
import { mealTypeLabels } from "../utils/labels";
import { buildNutritionSummary } from "../utils/nutrition";
import styles from "./App.module.css";

type PageId = "overview" | "chat" | "today" | "inventory" | "weekly" | "nutrition" | "shopping";

const navItems: Array<{ id: PageId; label: string; icon: typeof BotMessageSquare }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "chat", label: "AI 对话", icon: BotMessageSquare },
  { id: "today", label: "三餐推荐", icon: Soup },
  { id: "inventory", label: "库存管理", icon: NotebookTabs },
  { id: "weekly", label: "每周视图", icon: CalendarDays },
  { id: "nutrition", label: "营养统计", icon: PieChart },
  { id: "shopping", label: "购物清单", icon: ShoppingCart },
];

const pageMeta: Record<PageId, { title: string; description: string }> = {
  overview: {
    title: "总览",
    description: "快速查看今日饮食计划、营养完成度、库存风险和购物缺口。",
  },
  chat: {
    title: "AI 对话",
    description: "从一句饮食需求开始，生成今日三餐、营养反馈和购物清单。",
  },
  today: {
    title: "今日三餐",
    description: "查看早餐、午餐、晚餐细节，替换单餐并确认今天吃什么。",
  },
  inventory: {
    title: "库存管理",
    description: "维护家里的食材、数量和过期日期，让 AI 优先使用库存。",
  },
  weekly: {
    title: "每周计划",
    description: "按偏好生成一周三餐草稿，逐日微调并确认采用本周计划。",
  },
  nutrition: {
    title: "营养统计",
    description: "对比目标和当前餐单，查看热量、蛋白质、脂肪和膳食纤维。",
  },
  shopping: {
    title: "购物清单",
    description: "按分类查看缺口食材，勾选已购买项目。",
  },
};

const actionReplies: Record<string, string> = {
  推荐食材替换: "可以，把午餐主食从白米饭替换为糙米饭，晚餐豆腐可替换为鸡蛋羹，整体更清淡。",
  快捷调整营养目标: "已按轻体力工作日目标微调：总热量控制在 1900 kcal，蛋白质目标 95g。",
  减少油脂: "已减少烹调用油，午餐改为少油煎，晚餐以汤菜为主，预计脂肪减少约 8g。",
  提升蛋白质: "已提高蛋白质优先级，午餐保留鸡胸肉，早餐增加鸡蛋，全天蛋白质更接近目标。",
  控制热量: "已控制热量，晚餐保持低热量热汤，主食量下调，全天热量预计低于目标 500 kcal 左右。",
  多用库存食材: "已优先使用库存中的鸡蛋、番茄、鸡胸肉、西兰花和牛奶，购物清单只保留缺口食材。",
  生成购物清单: "已根据今日三餐生成购物清单，并排除了库存充足的鸡蛋、番茄和鸡胸肉。",
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

function getInitialPage(): PageId {
  const page = window.location.hash.replace("#/", "") as PageId;
  return navItems.some((item) => item.id === page) ? page : "overview";
}

function nowTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

function buildAssistantMessage(content: string, meals: MealRecommendation[], shoppingList: ShoppingListItem[]): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    role: "assistant",
    content,
    createdAt: nowTime(),
    structuredResult: {
      meals,
      nutritionSummary: buildNutritionSummary(meals, userProfile),
      shoppingList,
      inventoryUsage: ["鸡蛋", "番茄", "鸡胸肉", "西兰花", "牛奶"],
      suggestions,
    },
  };
}

function cloneWeeklyDays(days: WeeklyPlanDay[]) {
  return days.map((day) => ({
    ...day,
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

export function App() {
  const [activePage, setActivePage] = useState<PageId>(getInitialPage);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionSummary, setActionSummary] = useState<AiActionSummary>(defaultActionSummary);
  const [meals, setMeals] = useState<MealRecommendation[]>(initialMeals);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(initialShoppingList);
  const [alternativeIndex, setAlternativeIndex] = useState<Record<MealType, number>>({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  });
  const [selectedWeeklyPreferences, setSelectedWeeklyPreferences] = useState<string[]>(["清淡饮食", "库存优先"]);
  const [weeklyPreset, setWeeklyPreset] = useState<WeeklyPlanPreset>(weeklyPlanPresets[0]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanDay[]>(() => cloneWeeklyDays(weeklyPlanPresets[0].days));
  const [weeklyPlanConfirmed, setWeeklyPlanConfirmed] = useState(false);
  const [weeklyUpdatedAt, setWeeklyUpdatedAt] = useState(nowTime());
  const [weeklyDayAdjustments, setWeeklyDayAdjustments] = useState<Record<string, number>>({});

  const nutritionSummary = useMemo(() => buildNutritionSummary(meals, userProfile), [meals]);
  const remainingShoppingCount = shoppingList.filter((item) => !item.checked).length;
  const expiringCount = inventory.filter((item) => item.status === "expiring_soon").length;
  const weeklyAverageCalories = Math.round(weeklyPlan.reduce((total, day) => total + day.calories, 0) / weeklyPlan.length);
  const weeklyAttentionCount = weeklyPlan.filter((day) => day.status === "needs_attention").length;
  const weeklyBalancedCount = weeklyPlan.filter((day) => day.status !== "needs_attention").length;
  const weeklyInventoryItems = Array.from(new Set(weeklyPlan.flatMap((day) => day.inventoryFocus)));
  const weeklyShoppingGaps = Array.from(new Set(weeklyPlan.flatMap((day) => day.shoppingGap)));
  const weeklyCoverageRate = Math.round((weeklyInventoryItems.length / Math.max(1, inventory.length)) * 100);

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

  function pushUserAndAssistant(message: string, reply: string) {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: message,
      createdAt: nowTime(),
    };
    setMessages((current) => [...current, userMessage]);
    setIsGenerating(true);
    window.setTimeout(() => {
      const assistantMessage = buildAssistantMessage(reply, meals, shoppingList);
      setMessages((current) => [...current, assistantMessage]);
      setIsGenerating(false);
    }, 650);
  }

  function handleSend(message: string) {
    const reply = message.includes("番茄") || message.includes("鸡蛋")
      ? "收到，我会优先使用库存中的番茄和鸡蛋，并把午餐做成高蛋白、晚餐控制热量的组合。"
      : "收到，我已根据你的口味和营养目标生成今日三餐，并同步更新营养概览与购物清单。";
    setActionSummary({
      title: "已按输入生成方案",
      affectedMeals: ["午餐", "晚餐"],
      nutritionChanges: ["蛋白质 +9g", "晚餐热量降低"],
      shoppingChanges: ["豆腐、青菜待买", "鸡蛋番茄不重复采购"],
      inventoryUsage: message.includes("番茄") || message.includes("鸡蛋") ? ["番茄", "鸡蛋", "鸡胸肉"] : defaultActionSummary.inventoryUsage,
    });
    pushUserAndAssistant(message, reply);
  }

  function handleQuickAction(action: string) {
    if (action === "提升蛋白质") {
      setMeals((current) =>
        current.map((meal) =>
          meal.mealType === "dinner"
            ? {
                ...meal,
                title: "番茄豆腐鸡蛋汤 + 清炒时蔬",
                nutrition: { ...meal.nutrition, calories: meal.nutrition.calories + 70, protein: meal.nutrition.protein + 9, fat: meal.nutrition.fat + 4 },
                ingredients: [...meal.ingredients, { name: "鸡蛋", amount: "1 个", fromInventory: true, optional: false }],
                aiTip: "已加入库存鸡蛋，蛋白质提升约 9g。",
              }
            : meal,
        ),
      );
    }

    if (action === "减少油脂" || action === "控制热量") {
      setMeals((current) =>
        current.map((meal) =>
          meal.mealType === "lunch"
            ? {
                ...meal,
                nutrition: { ...meal.nutrition, calories: Math.max(0, meal.nutrition.calories - 80), fat: Math.max(0, meal.nutrition.fat - 6) },
                aiTip: "已将午餐改为少油烹饪，热量和脂肪同步下降。",
              }
            : meal,
        ),
      );
    }

    setActionSummary({
      title: action,
      affectedMeals: action === "提升蛋白质" ? ["早餐", "晚餐"] : action === "多用库存食材" ? ["午餐", "晚餐"] : ["午餐"],
      nutritionChanges: action === "减少油脂" || action === "控制热量" ? ["热量 -80kcal", "脂肪 -6g"] : action === "提升蛋白质" ? ["蛋白质 +9g"] : ["目标已同步"],
      shoppingChanges: action === "生成购物清单" ? ["生成缺口清单", "按分类整理"] : ["购物清单已复核"],
      inventoryUsage: ["鸡蛋", "番茄", "鸡胸肉", "西兰花"],
    });
    pushUserAndAssistant(action, actionReplies[action] ?? "已应用该快捷操作，并同步更新今日方案。");
  }

  function handleSwapMeal(mealType: MealType) {
    const alternatives = mealAlternatives[mealType];
    const nextIndex = (alternativeIndex[mealType] + 1) % alternatives.length;
    const nextMeal = alternatives[nextIndex];
    const nextMeals = meals.map((meal) => (meal.mealType === mealType ? nextMeal : meal));

    setAlternativeIndex((current) => ({ ...current, [mealType]: nextIndex }));
    setMeals(nextMeals);
    setMessages((current) => [
      ...current,
      buildAssistantMessage(`已替换${mealTypeLabels[mealType]}为「${nextMeal.title}」。调整原因：${nextMeal.aiTip}`, nextMeals, shoppingList),
    ]);
    setActionSummary({
      title: `已替换${mealTypeLabels[mealType]}`,
      affectedMeals: [mealTypeLabels[mealType]],
      nutritionChanges: [`热量 ${nextMeal.nutrition.calories}kcal`, `蛋白质 ${nextMeal.nutrition.protein}g`],
      shoppingChanges: ["按新食材复核缺口"],
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
    setMessages((current) => [
      ...current,
      buildAssistantMessage(`已新增库存「${value.name}」，后续推荐会优先判断是否可用于今日餐单。`, meals, shoppingList),
    ]);
    setActionSummary({
      title: "库存已更新",
      affectedMeals: ["后续推荐"],
      nutritionChanges: ["营养目标不变"],
      shoppingChanges: ["购物缺口待复核"],
      inventoryUsage: [value.name],
    });
  }

  function handleToggleShopping(id: string) {
    setShoppingList((current) => current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  }

  function handleToggleWeeklyPreference(preference: string) {
    setSelectedWeeklyPreferences((current) => {
      if (current.includes(preference)) {
        return current.length === 1 ? current : current.filter((item) => item !== preference);
      }
      return [...current, preference];
    });
    setWeeklyPlanConfirmed(false);
  }

  function appendAssistantNote(content: string) {
    setMessages((current) => [
      ...current,
      {
        id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        role: "assistant",
        content,
        createdAt: nowTime(),
      },
    ]);
  }

  function handleGenerateWeeklyPlan() {
    const nextPreset = getBestWeeklyPreset(selectedWeeklyPreferences, weeklyPreset.id);
    setWeeklyPreset(nextPreset);
    setWeeklyPlan(cloneWeeklyDays(nextPreset.days));
    setWeeklyPlanConfirmed(false);
    setWeeklyUpdatedAt(nowTime());
    setWeeklyDayAdjustments({});
    appendAssistantNote(`已生成「${nextPreset.title}」，重点是${nextPreset.tags.join("、")}，并优先安排 ${nextPreset.days[0].inventoryFocus.join("、")} 等库存食材。`);
  }

  function handleAdjustWeeklyDay(dayName: string) {
    const dayIndex = weeklyPlan.findIndex((day) => day.day === dayName);
    if (dayIndex < 0) return;

    const nextIndex = ((weeklyDayAdjustments[dayName] ?? weeklyPlanPresets.findIndex((preset) => preset.id === weeklyPreset.id)) + 1) % weeklyPlanPresets.length;
    const replacement = weeklyPlanPresets[nextIndex].days[dayIndex];

    setWeeklyPlan((current) => current.map((day, index) => (index === dayIndex ? { ...replacement, inventoryFocus: [...replacement.inventoryFocus], shoppingGap: [...replacement.shoppingGap] } : day)));
    setWeeklyDayAdjustments((current) => ({ ...current, [dayName]: nextIndex }));
    setWeeklyPlanConfirmed(false);
    setWeeklyUpdatedAt(nowTime());
    appendAssistantNote(`已微调${dayName}，改为「${replacement.lunch} / ${replacement.dinner}」组合，${replacement.note}`);
  }

  function handleConfirmWeeklyPlan() {
    setWeeklyPlanConfirmed(true);
    setWeeklyUpdatedAt(nowTime());
    appendAssistantNote(`本周计划已确认采用，当前方案平均每日约 ${weeklyAverageCalories} kcal，需重点关注 ${weeklyShoppingGaps.slice(0, 2).join("、")} 的采购。`);
  }

  const weeklyInsightItems: InsightMetric[] = [
    { label: "计划状态", value: weeklyPlanConfirmed ? "已采用" : "草稿中", detail: `${weeklyPreset.title}，最近更新 ${weeklyUpdatedAt}` },
    { label: "平均热量", value: `${weeklyAverageCalories} kcal`, detail: weeklyAttentionCount > 0 ? `${weeklyAttentionCount} 天需要继续微调。` : "本周热量节奏较稳定。" },
    { label: "库存覆盖", value: `${weeklyCoverageRate}%`, detail: weeklyInventoryItems.join("、") || "当前周计划未绑定库存。" },
    { label: "采购重点", value: `${weeklyShoppingGaps.length} 项`, detail: weeklyShoppingGaps.slice(0, 4).join("、") || "当前缺口较少。" },
  ];

  function renderPage() {
    if (activePage === "overview") {
      return (
        <div className={styles.overviewPage}>
          <section className={styles.overviewHero}>
            <div>
              <span>今日饮食状态</span>
              <h2>清淡高蛋白方案已准备好</h2>
              <p>三餐已优先使用鸡蛋、番茄、鸡胸肉和西兰花；购物清单保留缺口食材。</p>
            </div>
            <div className={styles.heroActions}>
              <button type="button" onClick={() => navigate("chat")}>
                <BotMessageSquare size={18} />
                和 AI 调整
              </button>
              <button type="button" onClick={() => navigate("today")}>查看今日三餐</button>
            </div>
          </section>

          <section className={styles.overviewMetrics} aria-label="总览指标">
            <SummaryCard title="今日推荐" value={`${meals.length} 餐`} detail={meals.map((meal) => meal.title).join(" / ")} action="查看三餐" onClick={() => navigate("today")} />
            <SummaryCard title="营养完成度" value={`${nutritionSummary.score} 分`} detail={`蛋白质 ${nutritionSummary.actual.protein}/${nutritionSummary.target.protein}g，热量 ${nutritionSummary.actual.calories}/${nutritionSummary.target.calories}kcal`} action="看营养" onClick={() => navigate("nutrition")} />
            <SummaryCard title="库存提醒" value={`${expiringCount} 个临期`} detail="番茄、西兰花和牛奶建议优先使用。" action="管理库存" onClick={() => navigate("inventory")} />
            <SummaryCard title="购物清单" value={`${remainingShoppingCount} 项待买`} detail="豆腐、青菜、燕麦等缺口食材已分类。" action="打开清单" onClick={() => navigate("shopping")} />
          </section>

          <div className={styles.overviewGrid}>
            <section className={styles.todayPreview}>
              <div className={styles.previewHeader}>
                <span>今日三餐</span>
                <button type="button" onClick={() => navigate("today")}>进入三餐页</button>
              </div>
              {meals.map((meal) => (
                <article key={meal.id}>
                  <img src={meal.imageUrl} alt={meal.title} />
                  <div>
                    <strong>{mealTypeLabels[meal.mealType]} · {meal.title}</strong>
                    <p>{meal.nutrition.calories} kcal / 蛋白质 {meal.nutrition.protein}g</p>
                  </div>
                </article>
              ))}
            </section>

            <section className={styles.overviewSide}>
              <InsightPanel
                title="AI 摘要"
                icon={<SparklineIcon />}
                items={[
                  { label: "影响餐次", value: actionSummary.affectedMeals.join(" / "), detail: actionSummary.title },
                  { label: "库存使用", value: `${actionSummary.inventoryUsage.length} 项`, detail: actionSummary.inventoryUsage.join("、") },
                  { label: "购物缺口", value: `${remainingShoppingCount} 项`, detail: "已按分类整理，可直接进入清单。" },
                ]}
              />
            </section>
          </div>
        </div>
      );
    }

    if (activePage === "chat") {
      return (
        <div className={styles.chatWorkspace}>
          <ChatPanel messages={messages} isGenerating={isGenerating} onSend={handleSend} onQuickAction={handleQuickAction} />
          <aside className={styles.chatAside}>
            <InsightPanel
              title="AI 执行结果"
              icon={<Lightbulb size={19} />}
              items={[
                { label: "影响餐次", value: actionSummary.affectedMeals.join(" / "), detail: actionSummary.title },
                { label: "营养变化", value: actionSummary.nutritionChanges.join("，"), detail: "会同步影响营养统计页。" },
                { label: "库存使用", value: `${actionSummary.inventoryUsage.length} 项`, detail: actionSummary.inventoryUsage.join("、") },
              ]}
            />
            <section className={styles.nextActions}>
              <h2>下一步</h2>
              <button type="button" onClick={() => navigate("today")}>
                查看今日三餐
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate("shopping")}>
                打开购物清单
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate("nutrition")}>
                查看营养统计
                <ArrowRight size={16} />
              </button>
            </section>
            <SummaryCard title="当前方案" value={`${meals.length} 餐`} detail={`营养完成度 ${nutritionSummary.score} 分，购物清单 ${remainingShoppingCount} 项待买。`} action="回到总览" onClick={() => navigate("overview")} />
          </aside>
        </div>
      );
    }

    if (activePage === "today") {
      return (
        <div className={styles.twoColumnPage}>
          <TodayMealsPanel meals={meals} onSwapMeal={handleSwapMeal} />
          <div className={styles.sideStack}>
            <NutritionPanel summary={nutritionSummary} suggestions={suggestions} />
            <SummaryCard title="下一步" value="确认今日方案" detail="三餐确认后，购物清单会作为执行入口。" action="去购物清单" onClick={() => navigate("shopping")} />
          </div>
        </div>
      );
    }

    if (activePage === "inventory") {
      return (
        <div className={styles.twoColumnPage}>
          <InventoryPanel inventory={inventory} onAddInventory={handleAddInventory} />
          <InsightPanel
            title="库存洞察"
            icon={<Lightbulb size={19} />}
            items={[
              { label: "临期优先级", value: `${expiringCount} 项`, detail: "番茄、西兰花、牛奶建议 2 天内使用。" },
              { label: "库存覆盖率", value: "67%", detail: "今日三餐主要蛋白和蔬菜已覆盖。" },
              { label: "推荐可做", value: "番茄鸡蛋汤", detail: "可快速消耗番茄和鸡蛋。" },
            ]}
          />
        </div>
      );
    }

    if (activePage === "shopping") {
      return (
        <div className={styles.twoColumnPage}>
          <ShoppingListPanel items={shoppingList} onToggle={handleToggleShopping} />
          <InsightPanel
            title="采购摘要"
            icon={<ShoppingCart size={19} />}
            items={[
              { label: "待买", value: `${remainingShoppingCount} 项`, detail: "优先补齐晚餐豆腐和青菜。" },
              { label: "已完成", value: `${shoppingList.length - remainingShoppingCount} 项`, detail: "已勾选项目会保留完成状态。" },
              { label: "重点分类", value: "蔬菜 / 主食", detail: "缺口集中在蔬菜补充和早餐主食。" },
            ]}
          />
        </div>
      );
    }

    if (activePage === "nutrition") {
      return (
        <div className={styles.twoColumnPage}>
          <NutritionPanel summary={nutritionSummary} suggestions={suggestions} />
          <InsightPanel
            title="营养解读"
            icon={<PieChart size={19} />}
            items={[
              { label: "目标偏差", value: `${nutritionSummary.deltas.calories} kcal`, detail: "当前推荐偏轻，适合轻负担工作日。" },
              { label: "蛋白质差距", value: `${nutritionSummary.deltas.protein} g`, detail: "晚餐可增加豆腐或鸡蛋。" },
              { label: "饮食节奏", value: "清淡", detail: "少油煎和汤菜组合保持得不错。" },
            ]}
          />
        </div>
      );
    }

    return (
      <section className={styles.weeklyPage}>
        <div className={styles.weeklyWorkspace}>
          <div className={styles.weeklyMain}>
            <div className={styles.weeklyHero}>
              <span className={styles.weekStep}><CalendarDays size={22} /></span>
              <div>
                <h2>{weeklyPreset.title}</h2>
                <p>{weeklyPreset.description}</p>
              </div>
              <div className={styles.weeklyHeroActions}>
                <button type="button" onClick={handleGenerateWeeklyPlan}>
                  <ClipboardCheck size={19} />
                  生成本周计划
                </button>
                <button className={styles.secondaryAction} type="button" onClick={handleConfirmWeeklyPlan}>
                  <CheckCircle2 size={18} />
                  {weeklyPlanConfirmed ? "已确认采用" : "确认采用"}
                </button>
              </div>
            </div>

            <section className={styles.weeklyControls}>
              <div className={styles.preferenceHeader}>
                <div>
                  <span>偏好设置</span>
                  <h3>选择这周的饮食方向</h3>
                </div>
                <div className={styles.preferenceMeta}>
                  <SlidersHorizontal size={16} />
                  {selectedWeeklyPreferences.join(" / ")}
                </div>
              </div>
              <div className={styles.preferenceChips}>
                {weeklyPreferenceOptions.map((preference) => (
                  <button
                    key={preference}
                    type="button"
                    className={selectedWeeklyPreferences.includes(preference) ? styles.activePreference : ""}
                    onClick={() => handleToggleWeeklyPreference(preference)}
                    aria-pressed={selectedWeeklyPreferences.includes(preference)}
                  >
                    {preference}
                  </button>
                ))}
              </div>
              <div className={styles.weeklyMetrics}>
                <article>
                  <span>平均热量</span>
                  <strong>{weeklyAverageCalories} kcal</strong>
                  <p>工作日热量波动已收敛到可控区间。</p>
                </article>
                <article>
                  <span>稳定天数</span>
                  <strong>{weeklyBalancedCount} / {weeklyPlan.length} 天</strong>
                  <p>周内大多数天数保持均衡或轻负担。</p>
                </article>
                <article>
                  <span>采购缺口</span>
                  <strong>{weeklyShoppingGaps.length} 项</strong>
                  <p>缺口已聚焦为本周需要补的核心食材。</p>
                </article>
              </div>
            </section>

            <div className={styles.weekCards}>
              {weeklyPlan.map((day) => (
                <article className={styles.weekCard} key={day.day}>
                  <header>
                    <strong>{day.day}</strong>
                    <span className={styles[day.status]}>{getPlanStatusLabel(day.status)}</span>
                  </header>
                  <p><Clock3 size={15} /> 约 {day.calories} kcal</p>
                  <ul>
                    <li><span>早</span>{day.breakfast}</li>
                    <li><span>午</span>{day.lunch}</li>
                    <li><span>晚</span>{day.dinner}</li>
                  </ul>
                  <div className={styles.weekCardNote}>
                    <strong>AI 提示</strong>
                    <p>{day.note}</p>
                  </div>
                  <div className={styles.weekCardMeta}>
                    <div>
                      <span>库存优先</span>
                      <p>{day.inventoryFocus.join("、")}</p>
                    </div>
                    <div>
                      <span>缺口食材</span>
                      <p>{day.shoppingGap.join("、")}</p>
                    </div>
                  </div>
                  <button className={styles.adjustDayButton} type="button" onClick={() => handleAdjustWeeklyDay(day.day)}>
                    <RefreshCw size={15} />
                    微调这一天
                  </button>
                </article>
              ))}
            </div>
          </div>

          <aside className={styles.weeklyAside}>
            <InsightPanel title="计划洞察" icon={<Lightbulb size={19} />} items={weeklyInsightItems} />
            <SummaryCard
              title="本周动作"
              value={weeklyPlanConfirmed ? "进入执行" : "待确认"}
              detail={weeklyPlanConfirmed ? "本周草稿已采用，接下来可以继续回到购物清单执行采购。" : "先确认计划，再把缺口带去购物清单。"}
              action={weeklyPlanConfirmed ? "查看购物清单" : "回到 AI 对话"}
              onClick={() => navigate(weeklyPlanConfirmed ? "shopping" : "chat")}
            />
          </aside>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span><Leaf size={29} /></span>
          <div>
            <h1>SmartMeal 助手 MVP</h1>
            <p>AI 懂你口味、营养目标与家庭库存，智能搭配每日三餐。</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="主导航">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button className={activePage === id ? styles.activeNav : ""} type="button" key={id} onClick={() => navigate(id)} aria-current={activePage === id ? "page" : undefined}>
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <IconButton icon={<BotMessageSquare size={22} />} variant="primary" className={styles.cta} onClick={() => navigate("chat")}>
          和 AI 聊聊
        </IconButton>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <div>
            <span>当前位置</span>
            <h2>{pageMeta[activePage].title}</h2>
            <p>{pageMeta[activePage].description}</p>
          </div>
          <div className={styles.statusPill}>
            <CheckCircle2 size={17} />
            MVP 原型
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  );
}

function SparklineIcon() {
  return <Lightbulb size={19} />;
}

function SummaryCard({ title, value, detail, action, onClick }: { title: string; value: string; detail: string; action: string; onClick: () => void }) {
  return (
    <article className={styles.summaryCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
      <button type="button" onClick={onClick}>{action}</button>
    </article>
  );
}

function InsightPanel({ title, icon, items }: { title: string; icon: React.ReactNode; items: Array<{ label: string; value: string; detail: string }> }) {
  return (
    <section className={styles.insightPanel}>
      <h2>{icon}{title}</h2>
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <p>{item.detail}</p>
        </div>
      ))}
    </section>
  );
}
