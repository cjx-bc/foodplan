import {
  Bell,
  BotMessageSquare,
  CalendarDays,
  CircleUserRound,
  ClipboardCheck,
  Download,
  LayoutDashboard,
  Leaf,
  NotebookTabs,
  PieChart,
  Printer,
  ShoppingCart,
  Soup,
  Utensils,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { IconButton } from "../components/IconButton";
import { weeklyPreferenceOptions } from "./constants";
import { ChatPanel } from "../features/chat/ChatPanel";
import { InventoryPanel, type InventoryFormValue } from "../features/inventory/InventoryPanel";
import { TodayMealsPanel } from "../features/meals/TodayMealsPanel";
import { NutritionPanel } from "../features/nutrition/NutritionPanel";
import { ShoppingListPanel } from "../features/shopping/ShoppingListPanel";
import type {
  AiActionSummary,
  ApiRequestState,
  ChatMessage,
  DerivedShoppingListItem,
  InventoryConsumptionApplyItem,
  InventoryItem,
  MealPlan,
  MealType,
  PlanningMode,
  Session,
  ShoppingList,
  UserProfile,
  WeeklyPlan,
  WeeklyPlanDay,
  WorkspaceState,
} from "../types/smartmeal";
import { mealTypeLabels } from "../utils/labels";
import {
  adoptMealPlan,
  adoptWeeklyPlan,
  applyInventoryConsumption,
  ApiClientError,
  createConversation,
  createInventoryItem,
  ensureGuestSession,
  generateShoppingList,
  getConversationMessages,
  getCurrentShoppingList,
  getInventoryItems,
  getMealPlan,
  getProfile,
  getSession,
  getWeeklyPlan,
  getWorkspaceState,
  patchWeeklyPlanDay,
  patchWorkspaceState,
  regenerateMeal,
  sendConversationMessage,
  toggleShoppingItem,
} from "./api";
import {
  buildShoppingSummary,
  deriveActiveMeals,
  deriveOverviewMetrics,
  deriveWeeklyInsights,
  getSelectedWeeklyDay,
  type PlanningState,
} from "../utils/planning";
import { buildNutritionSummary, formatDelta } from "../utils/nutrition";
import styles from "./App.module.css";

type PageId = "overview" | "chat" | "today" | "inventory" | "weekly" | "nutrition" | "shopping";

type PersistedAppState = {
  selectedWeeklyPreferences: string[];
};

type PendingAction =
  | "bootstrap"
  | "chat"
  | "inventory"
  | "weekly_generate"
  | "weekly_adopt"
  | "weekly_adjust"
  | "shopping_refresh"
  | `meal:${MealType}`
  | `shopping:${string}`;

const navItems: Array<{ id: PageId; label: string; icon: typeof BotMessageSquare }> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "chat", label: "AI 对话", icon: BotMessageSquare },
  { id: "today", label: "今日三餐", icon: Soup },
  { id: "inventory", label: "库存管理", icon: NotebookTabs },
  { id: "weekly", label: "每周计划", icon: CalendarDays },
  { id: "nutrition", label: "营养统计", icon: PieChart },
  { id: "shopping", label: "购物清单", icon: ShoppingCart },
];

const defaultActionSummary: AiActionSummary = {
  title: "等待采用方案",
  affectedMeals: ["今日执行", "本周执行"],
  nutritionChanges: ["先在聊天里生成候选方案", "确认采用后才正式切换"],
  shoppingChanges: ["购物清单会跟随已采用方案", "库存扣减在库存页执行"],
  inventoryUsage: ["鸡蛋", "番茄", "鸡胸肉"],
};

const quickActionPrompts: Record<string, string> = {
  推荐食材替换: "帮我推荐更适合当前库存的食材替换方案，并同步刷新今日三餐。",
  快捷调整营养目标: "把今天的执行方案调整到更接近当前默认营养目标，并保留清淡方向。",
  减少油脂: "今天的三餐请减少油脂，尤其是午餐和晚餐。",
  提升蛋白质: "请在尽量不明显增加总热量的前提下提升今天的蛋白质。",
  控制热量: "把今天的总热量再控制一点，优先压低晚餐负担。",
  多用库存食材: "优先使用家里现有库存，尤其是鸡蛋、番茄、鸡胸肉和牛奶。",
};

const storageKey = "smartmeal_mvp_state_v3";
const emptyProfile: UserProfile = {
  id: "profile_loading",
  name: "家庭饮食计划",
  dailyCalorieTarget: 1900,
  proteinTarget: 95,
  carbsTarget: 250,
  fatTarget: 65,
  fiberTarget: 25,
  tastePreferences: [],
  dietaryRestrictions: [],
};

function getInitialPage(): PageId {
  const page = window.location.hash.replace("#/", "") as PageId;
  return navItems.some((item) => item.id === page) ? page : "overview";
}

function formatClockTime(value?: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value ? new Date(value) : new Date());
}

function cloneMeals(meals: MealPlan["meals"]) {
  return meals.map((meal) => ({
    ...meal,
    nutrition: { ...meal.nutrition },
    ingredients: meal.ingredients.map((item) => ({ ...item })),
    steps: [...meal.steps],
  }));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function getDefaultSelectedWeekday() {
  return "周一";
}

function haveSameMealIds(left: MealPlan["meals"], right: MealPlan["meals"]) {
  if (left.length !== right.length) return false;
  return left.every((meal, index) => meal.id === right[index]?.id);
}

function toCurrency(amount: number) {
  return `¥ ${amount.toFixed(1)}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

function getPersistedState(): PersistedAppState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;

    return {
      selectedWeeklyPreferences: getStringArray(parsed.selectedWeeklyPreferences, ["清淡饮食", "库存优先"]),
    };
  } catch {
    return null;
  }
}

function buildActionSummary(title: string, mealPlan: MealPlan | null, shoppingList: ShoppingList | null): AiActionSummary {
  return {
    title,
    affectedMeals: mealPlan?.meals.map((meal) => mealTypeLabels[meal.mealType]) ?? ["早餐", "午餐", "晚餐"],
    nutritionChanges: mealPlan
      ? [
          `热量 ${mealPlan.nutritionSummary.actual.calories} kcal`,
          `蛋白质 ${mealPlan.nutritionSummary.actual.protein} g`,
        ]
      : defaultActionSummary.nutritionChanges,
    shoppingChanges: shoppingList
      ? [`待买 ${shoppingList.items.filter((item) => !item.checked).length} 项`, `已完成 ${shoppingList.items.filter((item) => item.checked).length} 项`]
      : defaultActionSummary.shoppingChanges,
    inventoryUsage: mealPlan?.inventoryUsage.length ? mealPlan.inventoryUsage : defaultActionSummary.inventoryUsage,
  };
}

function appendMessage(list: ChatMessage[], message: ChatMessage) {
  if (list.some((item) => item.id === message.id)) {
    return list;
  }
  return [...list, message];
}

function toDerivedShoppingItems(shoppingList: ShoppingList | null, planningMode: PlanningMode): DerivedShoppingListItem[] {
  if (!shoppingList) return [];
  const source = shoppingList.sourceType === "weekly_plan" || planningMode === "weekly" ? "weekly" : "daily";
  return shoppingList.items.map((item) => ({
    ...item,
    stableKey: item.stableKey ?? `${item.name}|${item.amount}`,
    source,
  }));
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }
  return "请求失败，请稍后重试。";
}

function isNotFoundError(error: unknown) {
  return error instanceof ApiClientError && error.code === "not_found";
}

function detectConversationMode(message: string): "daily" | "weekly" {
  return /本周|这周|一周|7天|七天/.test(message) ? "weekly" : "daily";
}

function toConsumptionDraft(mealPlan: MealPlan | null): InventoryConsumptionApplyItem[] {
  if (!mealPlan) return [];
  return mealPlan.inventoryConsumptionPreview
    .filter((item) => item.inventoryItemId && item.plannedValue !== undefined && item.plannedUnit)
    .map((item) => ({
      inventoryItemId: item.inventoryItemId!,
      consumeValue: item.plannedValue!,
      consumeUnit: item.plannedUnit!,
      consumeText: item.plannedAmountText,
    }));
}

export function App() {
  const persistedState = useMemo(() => getPersistedState(), []);
  const [activePage, setActivePage] = useState<PageId>(getInitialPage);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapState, setBootstrapState] = useState<ApiRequestState>("idle");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [runtimeNotice, setRuntimeNotice] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);
  const [actionSummary, setActionSummary] = useState<AiActionSummary>(defaultActionSummary);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(undefined);
  const [currentMealPlanId, setCurrentMealPlanId] = useState<string | undefined>(undefined);
  const [currentWeeklyPlanId, setCurrentWeeklyPlanId] = useState<string | undefined>(undefined);
  const [currentShoppingListId, setCurrentShoppingListId] = useState<string | undefined>(undefined);
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [currentShoppingList, setCurrentShoppingList] = useState<ShoppingList | null>(null);
  const [currentWeeklyPlan, setCurrentWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [proposalMealPlan, setProposalMealPlan] = useState<MealPlan | null>(null);
  const [proposalShoppingList, setProposalShoppingList] = useState<ShoppingList | null>(null);
  const [proposalWeeklyPlan, setProposalWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [proposalMessageId, setProposalMessageId] = useState<string | null>(null);
  const [manualConsumptionDraft, setManualConsumptionDraft] = useState<InventoryConsumptionApplyItem[]>([]);
  const [isConsumptionManualMode, setIsConsumptionManualMode] = useState(false);
  const [planningMode, setPlanningMode] = useState<PlanningMode>("daily");
  const [selectedWeekday, setSelectedWeekday] = useState(getDefaultSelectedWeekday());
  const [selectedWeeklyPreferences, setSelectedWeeklyPreferences] = useState<string[]>(
    persistedState?.selectedWeeklyPreferences ?? ["清淡饮食", "库存优先"],
  );

  const dailyPlan = useMemo(() => currentMealPlan?.meals ?? [], [currentMealPlan]);
  const weeklyPlanDraft = useMemo(() => currentWeeklyPlan?.days ?? [], [currentWeeklyPlan]);
  const visibleWeeklyPlan = currentWeeklyPlan ?? proposalWeeklyPlan;
  const visibleWeeklyDays = visibleWeeklyPlan?.days ?? [];
  const weeklyPlanApplied = currentWeeklyPlan?.adopted ?? false;
  const weeklyUpdatedAt = currentWeeklyPlan?.updatedAt ? formatClockTime(currentWeeklyPlan.updatedAt) : formatClockTime();

  const planningState: PlanningState = useMemo(() => ({
    planningMode,
    dailyPlan,
    weeklyPlanDraft,
    weeklyPlanApplied,
    selectedWeekday,
    inventory,
  }), [planningMode, dailyPlan, weeklyPlanDraft, weeklyPlanApplied, selectedWeekday, inventory]);

  const activeMeals = useMemo(() => deriveActiveMeals(planningState), [planningState]);
  const shoppingItems = useMemo(() => {
    const fromServer = toDerivedShoppingItems(currentShoppingList, planningMode);
    return fromServer.length > 0 ? fromServer : [];
  }, [currentShoppingList, planningMode]);
  const shoppingSummary = useMemo(() => buildShoppingSummary(shoppingItems), [shoppingItems]);
  const overviewMetrics = useMemo(() => deriveOverviewMetrics(planningState, shoppingItems), [planningState, shoppingItems]);
  const nutritionSummary = useMemo(
    () => currentMealPlan?.nutritionSummary ?? buildNutritionSummary(activeMeals, profile),
    [activeMeals, currentMealPlan, profile],
  );
  const weeklyInsightResult = useMemo(() => deriveWeeklyInsights(planningState, weeklyUpdatedAt), [planningState, weeklyUpdatedAt]);
  const selectedWeeklyDay = useMemo(() => getSelectedWeeklyDay(visibleWeeklyDays, selectedWeekday), [visibleWeeklyDays, selectedWeekday]);
  const weeklyTodayMeals = useMemo(() => cloneMeals(selectedWeeklyDay?.meals ?? []), [selectedWeeklyDay]);
  const weekDates = useMemo(
    () => visibleWeeklyDays.map((day) => (day.date ? day.date.slice(5).replace("-", "/") : "--/--")),
    [visibleWeeklyDays],
  );

  const expiringItems = inventory.filter((item) => item.status === "expiring_soon");
  const weeklyAttentionCount = visibleWeeklyDays.filter((day) => day.status === "needs_attention").length;
  const weeklyBalancedCount = visibleWeeklyDays.filter((day) => day.status === "balanced").length;
  const isWeeklyMode = planningMode === "weekly" && weeklyPlanApplied;
  const isDailySyncedFromWeekly = weeklyPlanApplied && haveSameMealIds(dailyPlan, weeklyTodayMeals);

  const weeklyMacroAverages = useMemo(() => {
    const days = Math.max(1, visibleWeeklyDays.length);
    const totals = visibleWeeklyDays.reduce(
      (sum, day) => {
        const actual = buildNutritionSummary(day.meals, profile).actual;
        return {
          protein: sum.protein + actual.protein,
          carbs: sum.carbs + actual.carbs,
          fat: sum.fat + actual.fat,
        };
      },
      { protein: 0, carbs: 0, fat: 0 },
    );

    return {
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fat: Math.round(totals.fat / days),
    };
  }, [profile, visibleWeeklyDays]);

  const todayContextNote = weeklyPlanApplied
    ? isDailySyncedFromWeekly
      ? `当前餐单来自已确认周计划的 ${selectedWeekday} 安排。`
      : `当前餐单基于已确认周计划做了今日本地调整，采购和营养会按今日执行重新计算。`
    : "当前餐单是今日独立草稿，会直接驱动营养统计和采购缺口。";
  const nutritionContextNote = isWeeklyMode
    ? `当前营养统计展示的是 ${selectedWeekday} 的执行餐单，整周采购缺口已另外汇总到购物清单。`
    : "当前营养统计只跟随今日三餐变化。";
  const weeklySelectedDayStatus = selectedWeeklyDay ? (selectedWeeklyDay.status === "balanced" ? "均衡" : selectedWeeklyDay.status === "light" ? "轻负担" : "需微调") : "均衡";
  const weeklySelectedDayFocus = selectedWeeklyDay?.inventoryFocus.slice(0, 3).join("、") ?? "鸡蛋、青菜、西兰花";

  function showRuntimeError(error: unknown, retry?: () => void) {
    setRuntimeNotice(null);
    setRuntimeError(getErrorMessage(error));
    setRetryAction(retry ? () => retry : null);
  }

  function clearRuntimeFeedback() {
    setRuntimeError(null);
    setRuntimeNotice(null);
    setRetryAction(null);
  }

  useEffect(() => {
    function syncHashRoute() {
      setActivePage(getInitialPage());
    }

    window.addEventListener("hashchange", syncHashRoute);
    return () => window.removeEventListener("hashchange", syncHashRoute);
  }, []);

  useEffect(() => {
    const payload: PersistedAppState = {
      selectedWeeklyPreferences,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [selectedWeeklyPreferences]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setBootstrapState("loading");
      setPendingAction("bootstrap");
      setBootstrapError(null);
      setRuntimeNotice(null);
      try {
        await ensureGuestSession();
        const [sessionData, profileData, inventoryData, remoteWorkspace] = await Promise.all([
          getSession(),
          getProfile(),
          getInventoryItems(),
          getWorkspaceState(),
        ]);
        if (cancelled) return;
        setSession(sessionData);
        setProfile(profileData);
        setInventory(inventoryData);
        setWorkspaceState(remoteWorkspace);
        setCurrentConversationId(remoteWorkspace.currentConversationId);
        setCurrentMealPlanId(remoteWorkspace.currentMealPlanId);
        setCurrentWeeklyPlanId(remoteWorkspace.currentWeeklyPlanId);
        setCurrentShoppingListId(remoteWorkspace.currentShoppingListId);
        setPlanningMode(remoteWorkspace.planningMode);
        setSelectedWeekday(remoteWorkspace.selectedWeekday ?? getDefaultSelectedWeekday());
        const workspaceRecoveryPatch: Record<string, string | null> & { planningMode?: PlanningMode } = {};

        if (remoteWorkspace.currentConversationId) {
          try {
            const nextMessages = await getConversationMessages(remoteWorkspace.currentConversationId);
            if (!cancelled) {
              setMessages(nextMessages);
            }
          } catch (error) {
            if (!isNotFoundError(error)) throw error;
            workspaceRecoveryPatch.currentConversationId = null;
            if (!cancelled) {
              setCurrentConversationId(undefined);
              setMessages([]);
              setRuntimeNotice("上次对话已不存在，已自动清理失效指针，可以直接重新开始。");
            }
          }
        }

        if (remoteWorkspace.currentMealPlanId) {
          try {
            const nextMealPlan = await getMealPlan(remoteWorkspace.currentMealPlanId);
            if (!cancelled) {
              setCurrentMealPlan(nextMealPlan);
              setActionSummary(buildActionSummary("已恢复今日方案", nextMealPlan, null));
            }
          } catch (error) {
            if (!isNotFoundError(error)) throw error;
            workspaceRecoveryPatch.currentMealPlanId = null;
            workspaceRecoveryPatch.currentShoppingListId = null;
            if (!cancelled) {
              setCurrentMealPlan(null);
              setCurrentMealPlanId(undefined);
              setCurrentShoppingList(null);
              setCurrentShoppingListId(undefined);
              setRuntimeNotice("上次餐单资源已不存在，已切回可生成状态。");
            }
          }
        }

        if (remoteWorkspace.currentWeeklyPlanId) {
          try {
            const nextWeeklyPlan = await getWeeklyPlan(remoteWorkspace.currentWeeklyPlanId);
            if (!cancelled) {
              setCurrentWeeklyPlan(nextWeeklyPlan);
              if (nextWeeklyPlan.days[0]?.day && !remoteWorkspace.selectedWeekday) {
                setSelectedWeekday(nextWeeklyPlan.days[0].day);
              }
            }
          } catch (error) {
            if (!isNotFoundError(error)) throw error;
            workspaceRecoveryPatch.currentWeeklyPlanId = null;
            if (!cancelled) {
              setCurrentWeeklyPlan(null);
              setCurrentWeeklyPlanId(undefined);
              setPlanningMode("daily");
              setRuntimeNotice("上次周计划已不存在，已恢复到今日执行模式。");
            }
          }
        }

        const effectiveWeeklyPlanId = workspaceRecoveryPatch.currentWeeklyPlanId === null ? undefined : remoteWorkspace.currentWeeklyPlanId;
        const effectiveMealPlanId = workspaceRecoveryPatch.currentMealPlanId === null ? undefined : remoteWorkspace.currentMealPlanId;
        const sourceType = remoteWorkspace.planningMode === "weekly" && effectiveWeeklyPlanId
          ? "weekly_plan"
          : effectiveMealPlanId
            ? "meal_plan"
            : null;
        const sourceId = sourceType === "weekly_plan" ? effectiveWeeklyPlanId : effectiveMealPlanId;

        if (sourceType && sourceId) {
          try {
            const shoppingList = await getCurrentShoppingList(sourceType, sourceId);
            if (!cancelled) {
              setCurrentShoppingList(shoppingList);
              setCurrentShoppingListId(shoppingList.id);
            }
          } catch (error) {
            if (!isNotFoundError(error)) throw error;
            try {
              const regenerated = await generateShoppingList(sourceType, sourceId);
              if (!cancelled) {
                setCurrentShoppingList(regenerated);
                setCurrentShoppingListId(regenerated.id);
                setRuntimeNotice("上次购物清单已不存在，已按当前餐单重新生成。");
              }
            } catch (regenerateError) {
              if (!isNotFoundError(regenerateError)) throw regenerateError;
              workspaceRecoveryPatch.currentShoppingListId = null;
              if (!cancelled) {
                setCurrentShoppingList(null);
                setCurrentShoppingListId(undefined);
                setRuntimeNotice("上次购物清单资源已失效，生成新餐单后会重新整理。");
              }
            }
          }
        }
        if (Object.keys(workspaceRecoveryPatch).length > 0) {
          const recoveredWorkspace = await patchWorkspaceState({
            ...workspaceRecoveryPatch,
            planningMode: workspaceRecoveryPatch.currentWeeklyPlanId === null ? "daily" : remoteWorkspace.planningMode,
          } as Partial<WorkspaceState>);
          if (!cancelled) {
            setWorkspaceState(recoveredWorkspace);
          }
        }
        if (!cancelled) {
          setBootstrapState("success");
        }
      } catch (error) {
        if (!cancelled) {
          setBootstrapState("error");
          setBootstrapError(getErrorMessage(error));
          setRetryAction(() => () => setBootstrapNonce((current) => current + 1));
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
          setPendingAction(null);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [bootstrapNonce]);

  useEffect(() => {
    if (!workspaceState || workspaceState.selectedWeekday === selectedWeekday) {
      return;
    }

    void patchWorkspaceState({ selectedWeekday })
      .then((nextWorkspace) => {
        setWorkspaceState(nextWorkspace);
      })
      .catch(() => {
        setRuntimeNotice("当前选中日期已在本地切换，但同步到后端失败，刷新后可能回到上次日期。");
      });
  }, [selectedWeekday, workspaceState]);

  function navigate(page: PageId) {
    window.location.hash = `/${page}`;
    setActivePage(page);
  }

  function appendLocalAssistantMessage(content: string, structuredResult?: ChatMessage["structuredResult"]) {
    setMessages((current) => [
      ...current,
      {
        id: `local_msg_${Date.now()}`,
        role: "assistant",
        content,
        createdAt: formatClockTime(),
        structuredResult: structuredResult ?? null,
      },
    ]);
  }

  async function ensureConversation() {
    if (currentConversationId) {
      return currentConversationId;
    }

    const conversation = await createConversation("SmartMeal 当前对话");
    setCurrentConversationId(conversation.id);
    try {
      const nextWorkspace = await patchWorkspaceState({ currentConversationId: conversation.id });
      setWorkspaceState(nextWorkspace);
    } catch {
      setRuntimeNotice("对话已创建，但 workspace 指针同步失败；刷新时会尝试自动恢复。");
    }
    return conversation.id;
  }

  async function refreshShoppingFromSource(nextPlanningMode = planningMode, mealPlanId = currentMealPlanId, weeklyPlanId = currentWeeklyPlanId) {
    const sourceType = nextPlanningMode === "weekly" && weeklyPlanId ? "weekly_plan" : mealPlanId ? "meal_plan" : null;
    const sourceId = sourceType === "weekly_plan" ? weeklyPlanId : mealPlanId;
    if (!sourceType || !sourceId) {
      setCurrentShoppingList(null);
      setCurrentShoppingListId(undefined);
      return null;
    }

    const shoppingList = await getCurrentShoppingList(sourceType, sourceId);
    setCurrentShoppingList(shoppingList);
    setCurrentShoppingListId(shoppingList.id);
    return shoppingList;
  }

  async function handleRefreshShoppingList() {
    if (pendingAction === "shopping_refresh") return;
    setPendingAction("shopping_refresh");
    clearRuntimeFeedback();
    try {
      const sourceType = planningMode === "weekly" && currentWeeklyPlanId ? "weekly_plan" : currentMealPlanId ? "meal_plan" : null;
      const sourceId = sourceType === "weekly_plan" ? currentWeeklyPlanId : currentMealPlanId;
      if (!sourceType || !sourceId) {
        setRuntimeNotice("当前还没有餐单来源，先生成今日餐单或本周计划。");
        return;
      }
      const list = await generateShoppingList(sourceType, sourceId);
      setCurrentShoppingList(list);
      setCurrentShoppingListId(list.id);
      setRuntimeNotice("购物清单已按当前执行方案重新生成。");
    } catch (error) {
      if (isNotFoundError(error)) {
        setCurrentShoppingList(null);
        setCurrentShoppingListId(undefined);
      }
      showRuntimeError(error, () => void handleRefreshShoppingList());
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSend(message: string) {
    if (pendingAction === "chat") return;
    setIsGenerating(true);
    setPendingAction("chat");
    clearRuntimeFeedback();
    try {
      const conversationId = await ensureConversation();
      const mode = detectConversationMode(message);
      const payload = await sendConversationMessage(conversationId, message, mode);
      setMessages((current) => appendMessage(appendMessage(current, payload.userMessage), payload.assistantMessage));
      setProposalMessageId(payload.assistantMessage.id);
      setProposalMealPlan(payload.mealPlan);
      setProposalShoppingList(payload.shoppingList);
      setProposalWeeklyPlan(payload.weeklyPlan);
      if (payload.weeklyPlan?.days[0]?.day) {
        setSelectedWeekday(payload.weeklyPlan.days[0].day);
      }
      setManualConsumptionDraft(toConsumptionDraft(payload.mealPlan));
      setIsConsumptionManualMode(false);
      setActionSummary(
        payload.mealPlan
          ? buildActionSummary("已生成今日候选方案，等待采用", payload.mealPlan, payload.shoppingList)
          : payload.weeklyPlan
            ? {
                title: `已生成「${payload.weeklyPlan.title}」候选周计划`,
                affectedMeals: payload.weeklyPlan.days.slice(0, 3).map((day) => day.day),
                nutritionChanges: payload.weeklyPlan.insights.slice(0, 2),
                shoppingChanges: ["确认采用后才切到本周采购", "未采用前不会改动当前执行页"],
                inventoryUsage: payload.weeklyPlan.days.flatMap((day) => day.inventoryFocus).slice(0, 4),
              }
            : defaultActionSummary,
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        setCurrentConversationId(undefined);
        setMessages([]);
      }
      showRuntimeError(error, () => void handleSend(message));
    } finally {
      setIsGenerating(false);
      setPendingAction(null);
    }
  }

  async function handleQuickAction(action: string) {
    const prompt = quickActionPrompts[action] ?? action;
    await handleSend(prompt);
    setActionSummary((current) => ({ ...current, title: action }));
  }

  function runChatAction(action: string) {
    navigate("chat");
    void handleQuickAction(action);
  }

  async function handleSwapMeal(mealType: MealType) {
    if (!currentMealPlanId) return;
    if (pendingAction) return;
    setIsGenerating(true);
    setPendingAction(`meal:${mealType}`);
    clearRuntimeFeedback();
    try {
      const payload = await regenerateMeal(currentMealPlanId, mealType, `替换${mealTypeLabels[mealType]}`);
      setCurrentMealPlan(payload.mealPlan);
      setCurrentShoppingList(payload.shoppingListResource);
      setCurrentShoppingListId(payload.shoppingListResource?.id);
      setActionSummary(buildActionSummary(`已替换${mealTypeLabels[mealType]}`, payload.mealPlan, payload.shoppingListResource));
      appendLocalAssistantMessage(
        `已替换${mealTypeLabels[mealType]}为「${payload.mealPlan.meals.find((item) => item.mealType === mealType)?.title ?? "新的方案"}」。这次修改只影响今天的执行餐单。`,
        { mealPlanId: payload.mealPlan.id, shoppingListId: payload.shoppingListResource?.id },
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        setCurrentMealPlan(null);
        setCurrentMealPlanId(undefined);
        setRuntimeNotice("当前餐单已不存在，已清空旧指针，请重新生成今日方案。");
      }
      showRuntimeError(error, () => void handleSwapMeal(mealType));
    } finally {
      setIsGenerating(false);
      setPendingAction(null);
    }
  }

  async function handleAddInventory(value: InventoryFormValue) {
    if (pendingAction === "inventory") return;
    setPendingAction("inventory");
    clearRuntimeFeedback();
    try {
      const created = await createInventoryItem(value);
      const nextInventory = [created, ...inventory];
      setInventory(nextInventory);

      if (planningMode === "weekly" && currentWeeklyPlanId) {
        const nextShoppingList = await generateShoppingList("weekly_plan", currentWeeklyPlanId);
        setCurrentShoppingList(nextShoppingList);
        setCurrentShoppingListId(nextShoppingList.id);
      } else if (currentMealPlanId) {
        const nextShoppingList = await generateShoppingList("meal_plan", currentMealPlanId);
        setCurrentShoppingList(nextShoppingList);
        setCurrentShoppingListId(nextShoppingList.id);
        const nextMealPlan = await getMealPlan(currentMealPlanId);
        setCurrentMealPlan(nextMealPlan);
        setManualConsumptionDraft(toConsumptionDraft(nextMealPlan));
      }

      setActionSummary({
        title: "库存已更新",
        affectedMeals: ["后续推荐"],
        nutritionChanges: ["营养目标不变"],
        shoppingChanges: ["购物缺口已按最新库存重算"],
        inventoryUsage: [value.name],
      });
      appendLocalAssistantMessage(`已新增库存「${value.name}」，当前采购缺口会自动按最新库存重算。`);
    } catch (error) {
      showRuntimeError(error, () => void handleAddInventory(value));
      throw error;
    } finally {
      setPendingAction(null);
    }
  }

  async function handleToggleShopping(id: string) {
    if (!currentShoppingList) return;
    const target = currentShoppingList.items.find((item) => item.id === id);
    if (!target) return;
    if (pendingAction) return;
    setPendingAction(`shopping:${id}`);
    clearRuntimeFeedback();
    try {
      const nextShoppingList = await toggleShoppingItem(currentShoppingList.id, id, !target.checked);
      setCurrentShoppingList(nextShoppingList);
      setCurrentShoppingListId(nextShoppingList.id);
    } catch (error) {
      if (isNotFoundError(error)) {
        setCurrentShoppingList(null);
        setCurrentShoppingListId(undefined);
      }
      showRuntimeError(error, () => void handleToggleShopping(id));
    } finally {
      setPendingAction(null);
    }
  }

  function handleToggleWeeklyPreference(preference: string) {
    setSelectedWeeklyPreferences((current) => {
      if (current.includes(preference)) {
        return current.length === 1 ? current : current.filter((item) => item !== preference);
      }
      return [...current, preference];
    });
  }

  async function handleGenerateWeeklyPlan() {
    if (pendingAction === "weekly_generate") return;
    navigate("chat");
    await handleSend(`请按${selectedWeeklyPreferences.join("、")}生成我本周 7 天饮食计划，工作日尽量省时，并给出采购缺口。`);
  }

  async function handleAdjustWeeklyDay(dayName: string) {
    if (!currentWeeklyPlan) return;
    const targetDay = currentWeeklyPlan.days.find((day) => day.day === dayName);
    if (!targetDay?.date) return;
    if (pendingAction === "weekly_adjust") return;
    setPendingAction("weekly_adjust");
    clearRuntimeFeedback();
    try {
      const weeklyPlan = await patchWeeklyPlanDay(currentWeeklyPlan.id, targetDay.date, ["dinner"]);
      setCurrentWeeklyPlan(weeklyPlan);

      if (weeklyPlan.adopted && currentMealPlan && dayName === selectedWeekday) {
        const refreshedDay = weeklyPlan.days.find((day) => day.day === dayName);
        if (refreshedDay) {
          setCurrentMealPlan((previous) =>
            previous
              ? {
                  ...previous,
                  meals: cloneMeals(refreshedDay.meals),
                  nutritionSummary: buildNutritionSummary(refreshedDay.meals, profile),
                  inventoryUsage: refreshedDay.inventoryFocus,
                  suggestions: weeklyPlan.insights,
                }
              : previous,
          );
        }
      }

      if (planningMode === "weekly") {
        await refreshShoppingFromSource("weekly", currentMealPlanId, currentWeeklyPlan.id);
      }

      appendLocalAssistantMessage(
        `已微调${dayName}，新的晚餐重点是「${weeklyPlan.days.find((day) => day.day === dayName)?.dinner ?? "新的方案"}」，相关采购缺口和周洞察已同步重算。`,
        { weeklyPlanId: weeklyPlan.id },
      );
    } catch (error) {
      if (isNotFoundError(error)) {
        setCurrentWeeklyPlan(null);
        setCurrentWeeklyPlanId(undefined);
        setPlanningMode("daily");
      }
      showRuntimeError(error, () => void handleAdjustWeeklyDay(dayName));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConfirmWeeklyPlan() {
    if (!proposalWeeklyPlan?.id) return;
    if (pendingAction === "weekly_adopt") return;
    setPendingAction("weekly_adopt");
    clearRuntimeFeedback();
    try {
      const result = await adoptWeeklyPlan(proposalWeeklyPlan.id, selectedWeeklyDay?.date ?? proposalWeeklyPlan.days[0]?.date);
      const [weeklyPlan, mealPlan] = await Promise.all([
        getWeeklyPlan(result.weeklyPlanId),
        getMealPlan(result.syncedMealPlanId),
      ]);
      const shoppingList = result.shoppingListId ? await getCurrentShoppingList("weekly_plan", weeklyPlan.id) : null;

      setCurrentWeeklyPlan(weeklyPlan);
      setCurrentWeeklyPlanId(weeklyPlan.id);
      setCurrentMealPlan(mealPlan);
      setCurrentMealPlanId(mealPlan.id);
      setCurrentShoppingList(shoppingList);
      setCurrentShoppingListId(shoppingList?.id);
      setPlanningMode("weekly");
      setProposalWeeklyPlan(null);
      setProposalMessageId(null);
      setActionSummary({
        title: "已采用本周计划",
        affectedMeals: [selectedWeekday],
        nutritionChanges: [`平均热量 ${weeklyInsightResult.averageCalories} kcal`, `${weeklyInsightResult.attentionCount} 天需继续微调`],
        shoppingChanges: ["购物清单已切到本周采购", "已勾选食材状态保留"],
        inventoryUsage: weeklyInsightResult.inventoryItems,
      });
      appendLocalAssistantMessage(`本周计划已确认采用，今日三餐已切换为 ${selectedWeekday} 的安排，购物清单会按整周缺口整理。`, {
        weeklyPlanId: weeklyPlan.id,
        mealPlanId: mealPlan.id,
        shoppingListId: shoppingList?.id,
      });
    } catch (error) {
      showRuntimeError(error, () => void handleConfirmWeeklyPlan());
    } finally {
      setPendingAction(null);
    }
  }

  async function handleConfirmMealPlan() {
    if (!proposalMealPlan?.id) return;
    if (pendingAction === "chat") return;
    setPendingAction("chat");
    clearRuntimeFeedback();
    try {
      const result = await adoptMealPlan(proposalMealPlan.id);
      const [mealPlan, shoppingList] = await Promise.all([
        getMealPlan(result.mealPlanId),
        result.shoppingListId ? getCurrentShoppingList("meal_plan", result.mealPlanId) : Promise.resolve(null),
      ]);
      setWorkspaceState(result.workspaceState);
      setCurrentMealPlan(mealPlan);
      setCurrentMealPlanId(mealPlan.id);
      setCurrentShoppingList(shoppingList);
      setCurrentShoppingListId(shoppingList?.id);
      setPlanningMode("daily");
      setProposalMealPlan(null);
      setProposalShoppingList(null);
      setProposalMessageId(null);
      setManualConsumptionDraft(toConsumptionDraft(mealPlan));
      setActionSummary(buildActionSummary("已采用今日方案", mealPlan, shoppingList));
      appendLocalAssistantMessage("今日方案已确认采用，三餐、营养、总览和购物清单都已切到这份执行方案。", {
        mealPlanId: mealPlan.id,
        shoppingListId: shoppingList?.id,
      });
    } catch (error) {
      showRuntimeError(error, () => void handleConfirmMealPlan());
    } finally {
      setPendingAction(null);
    }
  }

  async function handleApplyConsumption(mode: "manual" | "auto") {
    const sourceType = planningMode === "weekly" && currentWeeklyPlanId ? "weekly_plan" : currentMealPlanId ? "meal_plan" : null;
    const sourceId = sourceType === "weekly_plan" ? currentWeeklyPlanId : currentMealPlanId;
    const items = mode === "manual" ? manualConsumptionDraft : toConsumptionDraft(currentMealPlan);
    if (!sourceType || !sourceId || items.length === 0) {
      setRuntimeNotice("当前没有可扣减的库存消耗。");
      return;
    }

    setPendingAction("inventory");
    clearRuntimeFeedback();
    try {
      const result = await applyInventoryConsumption({ sourceType, sourceId, mode, items });
      setInventory(result.updatedInventoryItems);
      setCurrentShoppingList(result.shoppingList);
      setCurrentShoppingListId(result.shoppingList?.id);
      if (result.mealPlan) {
        setCurrentMealPlan(result.mealPlan);
        setManualConsumptionDraft(toConsumptionDraft(result.mealPlan));
      }
      setIsConsumptionManualMode(false);
      setRuntimeNotice(
        result.skippedItems.length > 0
          ? `已扣减 ${result.appliedItems.length} 项，另有 ${result.skippedItems.length} 项因单位或数量问题跳过。`
          : `已完成 ${result.appliedItems.length} 项库存扣减。`,
      );
    } catch (error) {
      showRuntimeError(error, () => void handleApplyConsumption(mode));
    } finally {
      setPendingAction(null);
    }
  }

  function renderOverviewPage() {
    const completedWeeklyDays = weeklyPlanDraft.filter((day) => day.status !== "needs_attention").length;
    const heroMeals = activeMeals.slice(0, 3);

    return (
      <section className={styles.pageFrame}>
        <div className={styles.overviewHero}>
          <div className={styles.overviewHeroMain}>
            <div className={styles.heroIntro}>
              <span className={styles.heroEyebrow}>{overviewMetrics.heroEyebrow}</span>
              <span className={styles.heroStatus}>{overviewMetrics.modeLabel}</span>
            </div>
            <div className={styles.heroHeadline}>
              <h3>{overviewMetrics.heroTitle}</h3>
              <p>{overviewMetrics.heroDescription}</p>
            </div>
            <div className={styles.heroMetricBand}>
              <article>
                <span>今日热量</span>
                <strong>{formatNumber(nutritionSummary.actual.calories)}</strong>
                <small>kcal</small>
              </article>
              <article>
                <span>采购缺口</span>
                <strong>{shoppingSummary.remainingCount}</strong>
                <small>项待买</small>
              </article>
              <article>
                <span>库存利用</span>
                <strong>{currentMealPlan?.inventoryUsage.length ?? 0}</strong>
                <small>项已使用</small>
              </article>
            </div>
            <div className={styles.heroMealStage}>
              {heroMeals.map((meal) => (
                <MiniMealRow
                  key={meal.id}
                  image={meal.imageUrl}
                  title={meal.title}
                  meta={mealTypeLabels[meal.mealType]}
                  value={`${meal.nutrition.calories} kcal`}
                  compact
                />
              ))}
            </div>
            <div className={styles.overviewActionRow}>
              <button type="button" className={styles.primaryMiniAction} onClick={() => navigate("chat")}>和 AI 调方案</button>
              <button type="button" className={styles.inlineAction} onClick={() => navigate(isWeeklyMode ? "weekly" : "today")}>
                {isWeeklyMode ? "回看周计划" : "查看今日三餐"}
              </button>
            </div>
          </div>
          <div className={styles.overviewHeroSide}>
            <div className={styles.overviewHeroStats}>
              <MetricTile label="采购缺口" value={overviewMetrics.shoppingValue} />
              <MetricTile label="库存提醒" value={overviewMetrics.inventoryValue} />
              <MetricTile label="本周进度" value={`${completedWeeklyDays}/${Math.max(weeklyPlanDraft.length, 1)} 天`} />
            </div>
            <SurfaceCard title="执行节奏" emphasis={planningMode === "weekly" ? "周执行" : "日执行"} className={styles.stageCard}>
              <div className={styles.overviewFlowStrip}>
                <button type="button" onClick={() => navigate("chat")}>
                  <strong>1</strong>
                  <span>对话明确偏好与库存约束</span>
                </button>
                <button type="button" onClick={() => navigate("today")}>
                  <strong>2</strong>
                  <span>确认三餐与营养结构</span>
                </button>
                <button type="button" onClick={() => navigate("shopping")}>
                  <strong>3</strong>
                  <span>补齐采购缺口并进入执行</span>
                </button>
              </div>
            </SurfaceCard>
          </div>
        </div>

        <div className={styles.overviewGrid}>
          <SurfaceCard title="今日建议" emphasis={overviewMetrics.modeLabel} className={styles.stageCard}>
            <p className={styles.cardDetail}>{overviewMetrics.modeDescription}</p>
            <div className={styles.summaryPills}>
              <span>{nutritionSummary.score} 分营养贴合度</span>
              <span>{expiringItems.length} 个临期提醒</span>
              <span>{weeklyAttentionCount} 天待微调</span>
            </div>
            <ul className={styles.insightList}>
              <li>{todayContextNote}</li>
              <li>{shoppingSummary.remainingCount > 0 ? `当前还有 ${shoppingSummary.remainingCount} 项采购缺口，需要在执行前补齐。` : "当前采购缺口已清空，可以直接进入执行。"}</li>
              <li>{currentMealPlan?.generationMeta?.source === "fallback" ? "本次方案来自规则兜底，适合继续让 AI 微调一轮。" : "当前方案已可直接作为今天的执行底稿。"}</li>
            </ul>
          </SurfaceCard>

          <SurfaceCard title="关键缺口" emphasis={shoppingSummary.remainingCount > 0 ? `${shoppingSummary.remainingCount} 项待补` : "已补齐"} className={styles.stageCard}>
            <div className={styles.overviewSplit}>
              <div className={styles.stageStat}>
                <span>采购重点</span>
                <strong>{overviewMetrics.shoppingDetail}</strong>
              </div>
              <div className={styles.stageStat}>
                <span>库存关注</span>
                <strong>{expiringItems.slice(0, 3).map((item) => item.name).join("、") || "库存状态稳定"}</strong>
              </div>
            </div>
            <div className={styles.miniMealList}>
              {activeMeals.map((meal) => (
                <MiniMealRow
                  key={meal.id}
                  image={meal.imageUrl}
                  title={meal.title}
                  meta={mealTypeLabels[meal.mealType]}
                  value={`${meal.nutrition.protein} g 蛋白`}
                  compact
                />
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard title="AI 执行结果" emphasis={actionSummary.title} className={styles.stageCard}>
            <div className={styles.summaryPills}>
              {actionSummary.affectedMeals.map((item) => <span key={item}>{item}</span>)}
            </div>
            <ul className={styles.insightList}>
              {actionSummary.nutritionChanges.map((item) => <li key={item}>{item}</li>)}
              {actionSummary.shoppingChanges.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </SurfaceCard>

          <SurfaceCard title="下一步" emphasis={planningMode === "weekly" ? "周执行" : "今日执行"} className={styles.stageCard}>
            <div className={styles.actionStack}>
              <button type="button" className={styles.primaryBlockAction} onClick={() => navigate("shopping")}>查看采购清单</button>
              <button type="button" className={styles.inlineAction} onClick={() => navigate("nutrition")}>打开营养统计</button>
              <button type="button" className={styles.inlineAction} onClick={() => navigate("inventory")}>管理库存</button>
            </div>
          </SurfaceCard>
        </div>
      </section>
    );
  }

  function renderChatPage() {
    return (
      <section className={styles.pageFrame}>
        <div className={styles.chatPage}>
          <div className={styles.chatMainStage}>
            <div className={styles.chatStageIntro}>
              <div>
                <span className={styles.heroEyebrow}>Conversation Studio</span>
                <strong>先把需求说清楚，再把三餐、库存和采购一起推到执行态。</strong>
              </div>
              <div className={styles.summaryPills}>
                <span>{planningMode === "weekly" ? "周模式" : "日模式"}</span>
                <span>{messages.length} 条消息</span>
                <span>{currentMealPlan?.generationMeta?.source === "fallback" ? "规则兜底" : "AI 主生成"}</span>
              </div>
            </div>
            <ChatPanel
              messages={messages}
              isGenerating={isGenerating || isBootstrapping}
              isBootstrapping={isBootstrapping}
              onSend={(message) => void handleSend(message)}
              onQuickAction={(action) => void handleQuickAction(action)}
              proposalMessageId={proposalMessageId}
              proposalMode={proposalWeeklyPlan ? "weekly" : proposalMealPlan ? "daily" : null}
              onAdoptDaily={() => void handleConfirmMealPlan()}
              onAdoptWeekly={() => void handleConfirmWeeklyPlan()}
              proposalPending={pendingAction === "chat" || pendingAction === "weekly_adopt"}
            />
          </div>

          <div className={styles.chatWorkspace}>
            <SurfaceCard title="当前方案" emphasis={currentMealPlan ? `${currentMealPlan.nutritionSummary.actual.calories} kcal` : "等待生成"} className={styles.chatRailCard}>
              <p className={styles.cardDetail}>
                {proposalMealPlan?.reply ?? proposalWeeklyPlan?.description ?? currentMealPlan?.reply ?? "先发一条需求，让系统生成候选方案，再确认采用。"}
              </p>
              <div className={styles.summaryPills}>
                <span>{(proposalShoppingList ?? currentShoppingList)?.items.filter((item) => !item.checked).length ?? 0} 项待买</span>
                <span>{(proposalMealPlan ?? currentMealPlan)?.inventoryUsage.length ?? 0} 项库存将使用</span>
                {(proposalMealPlan ?? currentMealPlan)?.generationMeta?.source === "fallback" ? <span>规则兜底生成</span> : null}
                {(proposalMealPlan ?? currentMealPlan)?.generationMeta?.promptVersion ? <span>Prompt {(proposalMealPlan ?? currentMealPlan)?.generationMeta?.promptVersion}</span> : null}
              </div>
            </SurfaceCard>

            <SurfaceCard title="今日执行" emphasis={`${activeMeals.length} 餐`} className={styles.chatRailCard}>
              <div className={styles.miniMealList}>
                {activeMeals.map((meal) => (
                  <MiniMealRow
                    key={meal.id}
                    image={meal.imageUrl}
                    title={meal.title}
                    meta={mealTypeLabels[meal.mealType]}
                    value={`${meal.nutrition.protein} g 蛋白`}
                    compact
                  />
                ))}
              </div>
              <button type="button" className={styles.inlineAction} onClick={() => navigate("today")}>查看今日三餐</button>
            </SurfaceCard>

            <SurfaceCard title="执行摘要" emphasis={actionSummary.title} className={styles.chatRailCard}>
              <ul className={styles.insightList}>
                {actionSummary.nutritionChanges.map((item) => <li key={item}>{item}</li>)}
                {actionSummary.shoppingChanges.map((item) => <li key={item}>{item}</li>)}
                {actionSummary.inventoryUsage.slice(0, 4).map((item) => <li key={item}>已使用 {item}</li>)}
              </ul>
            </SurfaceCard>
          </div>
        </div>
      </section>
    );
  }

  function renderTodayPage() {
    return (
      <section className={styles.pageFrame}>
        <div className={styles.todayLayout}>
          <TodayMealsPanel
            meals={activeMeals}
            contextNote={todayContextNote}
            isLoading={isBootstrapping}
            pendingMealType={pendingAction?.startsWith("meal:") ? pendingAction.slice(5) as MealType : undefined}
            onRetry={() => setBootstrapNonce((current) => current + 1)}
            onSwapMeal={(mealType) => void handleSwapMeal(mealType)}
          />
          <NutritionPanel summary={nutritionSummary} suggestions={currentMealPlan?.suggestions ?? currentWeeklyPlan?.insights ?? []} contextNote={nutritionContextNote} />
        </div>
      </section>
    );
  }

  function renderInventoryPage() {
    return (
      <section className={styles.pageFrame}>
        <InventoryPanel
          inventory={inventory}
          consumptionPreview={currentMealPlan?.inventoryConsumptionPreview ?? []}
          manualConsumptionDraft={manualConsumptionDraft}
          isManualConsumptionMode={isConsumptionManualMode}
          isSubmitting={pendingAction === "inventory"}
          onAddInventory={handleAddInventory}
          onToggleManualConsumptionMode={() => {
            setIsConsumptionManualMode((current) => !current);
            setManualConsumptionDraft(toConsumptionDraft(currentMealPlan));
          }}
          onUpdateManualConsumption={(inventoryItemId, consumeValue) => {
            setManualConsumptionDraft((current) => current.map((item) => (
              item.inventoryItemId === inventoryItemId ? { ...item, consumeValue } : item
            )));
          }}
          onApplyManualConsumption={() => void handleApplyConsumption("manual")}
          onApplyAutoConsumption={() => void handleApplyConsumption("auto")}
        />
      </section>
    );
  }

  function renderWeeklyPage() {
    return (
      <section className={styles.pageFrame}>
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
              <button className={styles.preferenceMoreButton} type="button" onClick={() => void handleGenerateWeeklyPlan()} disabled={pendingAction === "weekly_generate"}>
                {pendingAction === "weekly_generate" ? "生成中..." : "去聊天生成"}
              </button>
              <div className={styles.preferenceHint}>
                <span>当前草稿</span>
                <strong>{weeklyPlanApplied ? "已接管今日执行" : proposalWeeklyPlan ? "候选方案待采用" : "待生成候选"}</strong>
                <p>优先使用 {weeklySelectedDayFocus}，并把需要注意的天数控制在 {weeklyAttentionCount} 天内。</p>
              </div>
            </SurfaceCard>
          </aside>

          <div className={styles.weeklyMainBoard}>
            <div className={styles.weeklyTopbar}>
              <div className={styles.weekRange}>
                <small>Weekly Planner</small>
                <strong>{visibleWeeklyPlan?.title ?? "本周计划"}</strong>
                <span>{weekDates[0] ?? "--/--"} - {weekDates[weekDates.length - 1] ?? "--/--"}</span>
              </div>
              <div className={styles.weeklyActions}>
                <button type="button" className={styles.secondaryAction} onClick={() => void handleGenerateWeeklyPlan()} disabled={pendingAction === "weekly_generate"}>
                  <ClipboardCheck size={16} />
                  {pendingAction === "weekly_generate" ? "生成中" : "去聊天生成本周计划"}
                </button>
                <button
                  type="button"
                  className={weeklyPlanApplied ? styles.inlineAction : proposalWeeklyPlan ? styles.primaryMiniAction : styles.inlineAction}
                  onClick={() => void handleConfirmWeeklyPlan()}
                  disabled={!proposalWeeklyPlan || (weeklyPlanApplied && isWeeklyMode) || pendingAction === "weekly_adopt"}
                >
                  {pendingAction === "weekly_adopt" ? "确认中..." : weeklyPlanApplied && isWeeklyMode ? "已确认采用" : "采用本周方案"}
                </button>
              </div>
            </div>

            <div className={styles.weeklyDigestGrid}>
              <MetricTile label="稳定天数" value={`${weeklyBalancedCount} / ${Math.max(weeklyPlanDraft.length, 1)} 天`} />
              <MetricTile label="需继续微调" value={`${weeklyAttentionCount} 天`} />
              <MetricTile label="库存优先食材" value={`${weeklyInsightResult.inventoryItems.length} 项`} />
            </div>

            <div className={styles.weekPlanner}>
              <div className={styles.weekPlannerHeader}>
                <span>计划阶段</span>
                {visibleWeeklyDays.map((day, index) => (
                  <button
                    key={day.date ?? day.day}
                    type="button"
                    className={day.day === selectedWeekday ? styles.dayPillActive : styles.dayPill}
                    onClick={() => setSelectedWeekday(day.day)}
                  >
                    <strong>{day.day}</strong>
                    <small>{weekDates[index] ?? "--/--"}</small>
                  </button>
                ))}
              </div>

              {["breakfast", "lunch", "dinner"].map((mealType) => (
                <div key={mealType} className={styles.weekPlannerRow}>
                  <span className={styles.mealAxisLabel}>{mealTypeLabels[mealType as MealType]}</span>
                  {visibleWeeklyDays.map((day) => {
                    const meal = day.meals.find((item) => item.mealType === mealType) ?? day.meals[0];
                    return (
                      <button
                        key={`${day.date ?? day.day}-${mealType}`}
                        type="button"
                        className={day.day === selectedWeekday ? `${styles.weekMealCell} ${styles.weekMealCellActive}` : styles.weekMealCell}
                        onClick={() => setSelectedWeekday(day.day)}
                      >
                        <img src={meal.imageUrl} alt={meal.title} />
                        <strong>{meal.title}</strong>
                        <span>{meal.nutrition.calories} kcal</span>
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

              <SurfaceCard title={`${selectedWeekday} 聚焦`} emphasis={weeklySelectedDayStatus}>
                <p className={styles.cardDetail}>
                  当前选中日预计 {selectedWeeklyDay?.calories ?? weeklyInsightResult.averageCalories} kcal，
                  库存优先食材为 {weeklySelectedDayFocus}。
                </p>
                <div className={styles.summaryPills}>
                  <span>{selectedWeeklyDay?.shoppingGap.length ?? 0} 项采购缺口</span>
                  <span>{selectedWeeklyDay?.meals.length ?? 3} 餐已排布</span>
                  <span>{weeklyPlanApplied ? "已接入执行流" : "草稿未采用"}</span>
                </div>
                <button className={styles.inlineAction} type="button" onClick={() => void handleAdjustWeeklyDay(selectedWeekday)} disabled={pendingAction === "weekly_adjust"}>
                  {pendingAction === "weekly_adjust" ? "微调中..." : "微调这一天"}
                </button>
              </SurfaceCard>

              <SurfaceCard title="执行提示" emphasis={weeklyPlanApplied ? "已接入今日流" : "待接入"}>
                <ul className={styles.insightList}>
                  <li>{weeklyPlanApplied ? `${selectedWeekday} 已驱动今日执行，继续微调会同步影响三餐和采购。` : "先确认采用，再让今日三餐、购物清单和总览统一切到周模式。"}</li>
                  <li>当前选中日还有 {selectedWeeklyDay?.shoppingGap.length ?? 0} 项采购缺口，适合先从主食和蛋白类补齐。</li>
                  <li>若想压低整周波动，优先处理“需继续微调”的天数。</li>
                </ul>
                <button className={styles.inlineAction} type="button" onClick={() => navigate("shopping")}>查看本周采购焦点</button>
              </SurfaceCard>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderNutritionPage() {
    const trendValues = weeklyPlanDraft.length > 0 ? weeklyPlanDraft.map((day) => day.calories) : [nutritionSummary.actual.calories];
    const chartTarget = profile.dailyCalorieTarget;
    const chartActual = Math.round(trendValues.reduce((sum, value) => sum + value, 0) / Math.max(1, trendValues.length));
    const weeklyPeak = Math.max(...trendValues);
    const weeklyLow = Math.min(...trendValues);
    const macroSegments = [
      { label: "碳水", value: nutritionSummary.actual.carbs, color: "#2f8f58" },
      { label: "蛋白", value: nutritionSummary.actual.protein, color: "#ffd36a" },
      { label: "脂肪", value: nutritionSummary.actual.fat, color: "#f08f45" },
    ];

    return (
      <section className={styles.pageFrame}>
        <div className={styles.nutritionDashboard}>
          <section className={styles.nutritionHero}>
            <div className={styles.nutritionHeroMain}>
              <span className={styles.heroEyebrow}>Nutrition Intelligence</span>
              <h3>{nutritionSummary.score} 分营养贴合度，当前摄入整体可控。</h3>
              <p>把日均热量、结构占比和 AI 解读放在同一层级，方便快速判断是否继续微调今日三餐，还是直接采用周计划执行。</p>
            </div>
            <div className={styles.nutritionHeroSide}>
              <div className={styles.modeBadge}>
                <span>当前口径</span>
                <strong>{isWeeklyMode ? `${selectedWeekday} / 周执行` : "今日执行"}</strong>
              </div>
              <div className={styles.modeBadge}>
                <span>目标差值</span>
                <strong>{formatDelta(nutritionSummary.deltas.calories, "kcal")}</strong>
              </div>
            </div>
          </section>

          <div className={styles.metricStrip}>
            <MetricTile label="总热量（日均）" value={`${chartActual} kcal`} />
            <MetricTile label="蛋白质（日均）" value={`${Math.round(nutritionSummary.actual.protein)} g`} />
            <MetricTile label="碳水（日均）" value={`${Math.round(nutritionSummary.actual.carbs)} g`} />
            <MetricTile label="脂肪（日均）" value={`${Math.round(nutritionSummary.actual.fat)} g`} />
            <MetricTile label="膳食纤维（日均）" value={`${Math.round(nutritionSummary.actual.fiber)} g`} />
          </div>

          <div className={styles.nutritionCharts}>
            <SurfaceCard title="热量趋势">
              <div className={styles.chartStatRow}>
                <span>目标 {chartTarget} kcal</span>
                <span>峰值 {weeklyPeak} kcal</span>
                <span>低点 {weeklyLow} kcal</span>
              </div>
              <LineChartCard values={trendValues} target={chartTarget} />
            </SurfaceCard>

            <SurfaceCard title="营养素占比">
              <div className={styles.chartStatRow}>
                <span>蛋白 {Math.round(nutritionSummary.actual.protein)} g</span>
                <span>碳水 {Math.round(nutritionSummary.actual.carbs)} g</span>
                <span>脂肪 {Math.round(nutritionSummary.actual.fat)} g</span>
              </div>
              <DonutChartCard segments={macroSegments} />
            </SurfaceCard>
          </div>

          <div className={styles.nutritionBottom}>
            <NutritionPanel summary={nutritionSummary} suggestions={currentMealPlan?.suggestions ?? currentWeeklyPlan?.insights ?? []} contextNote={nutritionContextNote} />
            <div className={styles.nutritionInsights}>
              <SurfaceCard title="AI 解读">
                <p className={styles.cardDetail}>
                  {currentMealPlan?.reply ?? "当前还没有真实餐单数据，先去对话页生成一份方案。"}
                </p>
                <button className={styles.inlineAction} type="button" onClick={() => navigate("today")}>查看详细分析</button>
              </SurfaceCard>
              <SurfaceCard title="执行建议" emphasis={isWeeklyMode ? "周模式" : "日模式"}>
                <ul className={styles.suggestionList}>
                  {(currentMealPlan?.suggestions ?? currentWeeklyPlan?.insights ?? []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </SurfaceCard>
              <SurfaceCard title="下一步动作" emphasis="闭环推进">
                <div className={styles.summaryPills}>
                  <span>{isWeeklyMode ? "从周计划回看今日" : "先对话调方案"}</span>
                  <span>{shoppingSummary.remainingCount} 项待采购</span>
                  <span>{nutritionSummary.score} 分贴合度</span>
                </div>
                <div className={styles.actionStack}>
                  <button className={styles.inlineAction} type="button" onClick={() => navigate("chat")}>去 AI 对话继续优化</button>
                  <button className={styles.inlineAction} type="button" onClick={() => navigate("today")}>回到今日三餐确认执行</button>
                  <button className={styles.inlineAction} type="button" onClick={() => navigate("shopping")}>打开购物清单</button>
                </div>
              </SurfaceCard>
            </div>
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
        <div className={styles.shoppingLayout}>
          <div className={styles.shoppingMain}>
            <div className={styles.shoppingStats}>
              <MetricTile label="待买项目" value={`${shoppingSummary.remainingCount} 项`} />
              <MetricTile label="预计花费" value={toCurrency(estimatedBudget)} />
              <MetricTile label="覆盖餐次" value={`${categories} 类食材`} />
            </div>
            <ShoppingListPanel
              items={shoppingItems}
              modeLabel={isWeeklyMode ? "本周采购" : "今日采购"}
              isLoading={isBootstrapping || pendingAction === "shopping_refresh"}
              pendingItemId={pendingAction?.startsWith("shopping:") ? pendingAction.slice(9) : undefined}
              onRetry={() => void handleRefreshShoppingList()}
              onToggle={(id) => void handleToggleShopping(id)}
            />
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
                {(currentMealPlan?.suggestions ?? currentWeeklyPlan?.insights ?? []).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button
                className={styles.primaryBlockAction}
                type="button"
                onClick={() => void handleRefreshShoppingList()}
                disabled={pendingAction === "shopping_refresh" || (!currentMealPlanId && !currentWeeklyPlanId)}
              >
                {pendingAction === "shopping_refresh" ? "更新中..." : "更新生成清单"}
              </button>
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
    if (activePage === "overview") return renderOverviewPage();
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
        <button className={styles.brand} type="button" onClick={() => navigate("overview")}>
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
        {bootstrapState === "loading" ? <StatusBanner tone="info" text="正在恢复当前工作台状态..." /> : null}
        {bootstrapError ? <StatusBanner tone="error" text={bootstrapError} actionLabel="重试" onAction={() => setBootstrapNonce((current) => current + 1)} /> : null}
        {runtimeNotice ? <StatusBanner tone="info" text={runtimeNotice} actionLabel="知道了" onAction={() => setRuntimeNotice(null)} /> : null}
        {runtimeError ? <StatusBanner tone="error" text={runtimeError} actionLabel={retryAction ? "重试" : "关闭"} onAction={retryAction ?? (() => setRuntimeError(null))} /> : null}
        {renderPage()}
      </main>
    </div>
  );
}

function SurfaceCard({ title, emphasis, className, children }: { title: string; emphasis?: string; className?: string; children: ReactNode }) {
  return (
    <section className={className ? `${styles.surfaceCard} ${className}` : styles.surfaceCard}>
      <div className={styles.surfaceHeader}>
        <span>{title}</span>
        {emphasis ? <strong>{emphasis}</strong> : null}
      </div>
      {children}
    </section>
  );
}

function MiniMealRow({ image, title, meta, value, compact = false }: { image: string; title: string; meta: string; value: string; compact?: boolean }) {
  return (
    <article className={compact ? `${styles.miniMealRow} ${styles.miniMealRowCompact}` : styles.miniMealRow}>
      <img src={image} alt={title} />
      <div>
        <span>{meta}</span>
        <strong>{title}</strong>
      </div>
      <em>{value}</em>
    </article>
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

function StatusBanner({
  tone,
  text,
  actionLabel,
  onAction,
}: {
  tone: "info" | "error";
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={tone === "error" ? styles.errorBanner : styles.infoBanner} role={tone === "error" ? "alert" : "status"}>
      <span>{text}</span>
      {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
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
