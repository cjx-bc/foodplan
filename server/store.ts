import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AppStore,
  ConversationMessageRecord,
  ConversationRecord,
  InventoryItemRecord,
  MealPlanRecord,
  ProfileRecord,
  SessionRecord,
  ShoppingListRecord,
  UserRecord,
  WeeklyPlanRecord,
  WorkspaceStateRecord,
} from "./types.js";
import { normalizeInventoryItem } from "./utils.js";

const storePath = path.join(process.cwd(), "server", "data", "store.json");
const defaultUserId = "user_guest_default";

let cachedStore: AppStore | null = null;

function ensureDefaultUser(now = new Date(0).toISOString()): UserRecord {
  return {
    id: defaultUserId,
    displayName: "Guest",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeProfile(profile: ProfileRecord, userId = defaultUserId): ProfileRecord {
  return {
    ...profile,
    userId: profile.userId ?? userId,
  };
}

function normalizeInventory(items: InventoryItemRecord[], userId = defaultUserId) {
  return items.map((item) => normalizeInventoryItem({
    ...item,
    userId: item.userId ?? userId,
  }));
}

function normalizeMealPlans(items: MealPlanRecord[], userId = defaultUserId) {
  return items.map((item) => ({
    ...item,
    userId: item.userId ?? userId,
  }));
}

function normalizeWeeklyPlans(items: WeeklyPlanRecord[], userId = defaultUserId) {
  return items.map((item) => ({
    ...item,
    userId: item.userId ?? userId,
  }));
}

function normalizeShoppingLists(items: ShoppingListRecord[], userId = defaultUserId) {
  return items.map((item) => ({
    ...item,
    userId: item.userId ?? userId,
  }));
}

function normalizeConversations(items: ConversationRecord[], userId = defaultUserId) {
  return items.map((item) => ({
    ...item,
    userId: item.userId ?? userId,
  }));
}

function normalizeConversationMessages(items: ConversationMessageRecord[], userId = defaultUserId) {
  return items.map((item) => ({
    ...item,
    userId: item.userId ?? userId,
  }));
}

async function readStoreFromDisk(): Promise<AppStore> {
  const raw = await readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppStore>;
  const user = parsed.users?.[0] ?? ensureDefaultUser(parsed.workspaceState?.updatedAt);
  const sessions = parsed.sessions ?? [];

  return {
    users: parsed.users?.length ? parsed.users : [user],
    sessions,
    profile: normalizeProfile(parsed.profile as ProfileRecord, user.id),
    inventoryItems: normalizeInventory(parsed.inventoryItems ?? [], user.id),
    mealPlans: normalizeMealPlans(parsed.mealPlans ?? [], user.id),
    weeklyPlans: normalizeWeeklyPlans(parsed.weeklyPlans ?? [], user.id),
    shoppingLists: normalizeShoppingLists(parsed.shoppingLists ?? [], user.id),
    conversations: normalizeConversations(parsed.conversations ?? [], user.id),
    conversationMessages: normalizeConversationMessages(parsed.conversationMessages ?? [], user.id),
    workspaceState: parsed.workspaceState ?? {
      userId: user.id,
      planningMode: "daily",
      updatedAt: new Date(0).toISOString(),
    },
  };
}

async function writeStoreToDisk(store: AppStore): Promise<void> {
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function getStore(): Promise<AppStore> {
  if (cachedStore) {
    return cachedStore;
  }

  cachedStore = await readStoreFromDisk();
  return cachedStore;
}

export async function saveStore(store: AppStore): Promise<void> {
  cachedStore = store;
  await writeStoreToDisk(store);
}

export async function readProfile(): Promise<ProfileRecord> {
  const store = await getStore();
  return store.profile;
}

export async function updateProfile(profile: ProfileRecord): Promise<ProfileRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    profile,
  };

  await saveStore(nextStore);
  return nextStore.profile;
}

export async function listInventoryItems(): Promise<InventoryItemRecord[]> {
  const store = await getStore();
  return normalizeInventory(store.inventoryItems, store.workspaceState.userId);
}

export async function replaceInventoryItems(items: InventoryItemRecord[]): Promise<InventoryItemRecord[]> {
  const store = await getStore();
  const normalizedItems = items.map(normalizeInventoryItem);
  const nextStore: AppStore = {
    ...store,
    inventoryItems: normalizedItems,
  };

  await saveStore(nextStore);
  return nextStore.inventoryItems;
}

export async function listMealPlans(): Promise<MealPlanRecord[]> {
  const store = await getStore();
  return [...store.mealPlans];
}

export async function readMealPlan(mealPlanId: string): Promise<MealPlanRecord | undefined> {
  const store = await getStore();
  return store.mealPlans.find((item) => item.id === mealPlanId);
}

export async function createMealPlan(mealPlan: MealPlanRecord): Promise<MealPlanRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    mealPlans: [mealPlan, ...store.mealPlans],
  };
  await saveStore(nextStore);
  return mealPlan;
}

export async function updateMealPlan(mealPlan: MealPlanRecord): Promise<MealPlanRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    mealPlans: store.mealPlans.map((item) => (item.id === mealPlan.id ? mealPlan : item)),
  };
  await saveStore(nextStore);
  return mealPlan;
}

export async function readWeeklyPlan(weeklyPlanId: string): Promise<WeeklyPlanRecord | undefined> {
  const store = await getStore();
  return store.weeklyPlans.find((item) => item.id === weeklyPlanId);
}

export async function createWeeklyPlan(weeklyPlan: WeeklyPlanRecord): Promise<WeeklyPlanRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    weeklyPlans: [weeklyPlan, ...store.weeklyPlans],
  };
  await saveStore(nextStore);
  return weeklyPlan;
}

export async function updateWeeklyPlan(weeklyPlan: WeeklyPlanRecord): Promise<WeeklyPlanRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    weeklyPlans: store.weeklyPlans.map((item) => (item.id === weeklyPlan.id ? weeklyPlan : item)),
  };
  await saveStore(nextStore);
  return weeklyPlan;
}

export async function listShoppingLists(): Promise<ShoppingListRecord[]> {
  const store = await getStore();
  return [...store.shoppingLists];
}

export async function readShoppingListBySource(sourceType: "meal_plan" | "weekly_plan", sourceId: string): Promise<ShoppingListRecord | undefined> {
  const store = await getStore();
  return store.shoppingLists.find((item) => item.sourceType === sourceType && item.sourceId === sourceId);
}

export async function upsertShoppingList(shoppingList: ShoppingListRecord): Promise<ShoppingListRecord> {
  const store = await getStore();
  const nextLists = store.shoppingLists.some((item) => item.id === shoppingList.id)
    ? store.shoppingLists.map((item) => (item.id === shoppingList.id ? shoppingList : item))
    : [shoppingList, ...store.shoppingLists];

  const nextStore: AppStore = {
    ...store,
    shoppingLists: nextLists,
  };
  await saveStore(nextStore);
  return shoppingList;
}

export async function readShoppingList(shoppingListId: string): Promise<ShoppingListRecord | undefined> {
  const store = await getStore();
  return store.shoppingLists.find((item) => item.id === shoppingListId);
}

export async function listConversations(): Promise<ConversationRecord[]> {
  const store = await getStore();
  return [...store.conversations].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function readConversation(conversationId: string): Promise<ConversationRecord | undefined> {
  const store = await getStore();
  return store.conversations.find((item) => item.id === conversationId);
}

export async function createConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    conversations: [conversation, ...store.conversations],
  };
  await saveStore(nextStore);
  return conversation;
}

export async function updateConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    conversations: store.conversations.map((item) => (item.id === conversation.id ? conversation : item)),
  };
  await saveStore(nextStore);
  return conversation;
}

export async function listConversationMessages(conversationId: string): Promise<ConversationMessageRecord[]> {
  const store = await getStore();
  return store.conversationMessages.filter((item) => item.conversationId === conversationId);
}

export async function createConversationMessages(messages: ConversationMessageRecord[]): Promise<ConversationMessageRecord[]> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    conversationMessages: [...store.conversationMessages, ...messages],
  };
  await saveStore(nextStore);
  return messages;
}

export async function readWorkspaceState(): Promise<WorkspaceStateRecord> {
  const store = await getStore();
  return store.workspaceState;
}

export async function updateWorkspaceState(workspaceState: WorkspaceStateRecord): Promise<WorkspaceStateRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    workspaceState,
  };
  await saveStore(nextStore);
  return workspaceState;
}

export async function listUsers(): Promise<UserRecord[]> {
  const store = await getStore();
  return store.users;
}

export async function readUserById(userId: string): Promise<UserRecord | undefined> {
  const store = await getStore();
  return store.users.find((item) => item.id === userId);
}

export async function createUser(user: UserRecord): Promise<UserRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    users: [user, ...store.users],
  };
  await saveStore(nextStore);
  return user;
}

export async function readSessionByToken(token: string): Promise<SessionRecord | undefined> {
  const store = await getStore();
  return store.sessions.find((item) => item.token === token);
}

export async function createSession(session: SessionRecord): Promise<SessionRecord> {
  const store = await getStore();
  const nextStore: AppStore = {
    ...store,
    sessions: [session, ...store.sessions],
  };
  await saveStore(nextStore);
  return session;
}
