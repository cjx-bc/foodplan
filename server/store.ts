import { query, withTransaction } from "./db.js";
import type {
  AiGenerationEventRecord,
  ConversationMessageRecord,
  ConversationRecord,
  InventoryItemRecord,
  MealPlanRecord,
  ProfileRecord,
  SessionRecord,
  ShoppingListItemRecord,
  ShoppingListRecord,
  StoreScope,
  UserRecord,
  WeeklyPlanRecord,
  WorkspaceRecord,
  WorkspaceStateRecord,
} from "./types.js";
import { normalizeInventoryItem } from "./utils.js";

const defaultUserId = "user_guest_default";
const defaultWorkspaceId = "workspace_guest_default";

type StoreRow = Record<string, unknown>;
type QueryableClient = {
  query: (sql: string, values?: unknown[]) => Promise<unknown>;
};

function defaultProfile(scope: StoreScope, now = new Date(0).toISOString()): ProfileRecord {
  return {
    id: "profile_001",
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    name: "家庭饮食计划",
    dailyCalorieTarget: 1900,
    proteinTarget: 95,
    carbsTarget: 250,
    fatTarget: 65,
    fiberTarget: 25,
    tastePreferences: ["清淡", "家常", "高蛋白"],
    dietaryRestrictions: ["少油", "少盐"],
    createdAt: now,
    updatedAt: now,
  };
}

function defaultWorkspaceState(scope: StoreScope, now = new Date(0).toISOString()): WorkspaceStateRecord {
  return {
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    planningMode: "daily",
    updatedAt: now,
  };
}

function toIso(value: unknown): string {
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(value)) {
      return new Date(`${value.replace(" ", "T")}Z`).toISOString();
    }
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(String(value)).toISOString();
}

function parseJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as T[];
  }
  return [];
}

function parseJsonObject<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractRows(result: unknown): StoreRow[] {
  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return (result[0] as unknown[]).filter(isPlainObject);
    }
    return result.filter(isPlainObject);
  }

  if (isPlainObject(result) && Array.isArray(result.rows)) {
    return result.rows.filter(isPlainObject);
  }

  return [];
}

async function queryRows(sql: string, values?: unknown[]): Promise<StoreRow[]> {
  return extractRows(await query(sql, values));
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    kind: (row.kind as UserRecord["kind"]) ?? "guest",
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapWorkspace(row: Record<string, unknown>): WorkspaceRecord {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    name: String(row.name),
    kind: row.kind as WorkspaceRecord["kind"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    token: String(row.token),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapProfile(row: Record<string, unknown>): ProfileRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    dailyCalorieTarget: Number(row.daily_calorie_target),
    proteinTarget: Number(row.protein_target),
    carbsTarget: Number(row.carbs_target),
    fatTarget: Number(row.fat_target),
    fiberTarget: Number(row.fiber_target),
    tastePreferences: parseJsonArray<string>(row.taste_preferences),
    dietaryRestrictions: parseJsonArray<string>(row.dietary_restrictions),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapInventoryItem(row: Record<string, unknown>): InventoryItemRecord {
  return normalizeInventoryItem({
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    name: String(row.name),
    category: row.category as InventoryItemRecord["category"],
    quantity: String(row.quantity),
    quantityValue: row.quantity_value === null || row.quantity_value === undefined ? undefined : Number(row.quantity_value),
    quantityUnit: row.quantity_unit === null || row.quantity_unit === undefined ? undefined : String(row.quantity_unit),
    expireDate: row.expire_date ? String(row.expire_date) : undefined,
    status: row.status as InventoryItemRecord["status"],
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
}

function mapConversation(row: Record<string, unknown>): ConversationRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    title: String(row.title),
    lastMessageAt: toIso(row.last_message_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapConversationMessage(row: Record<string, unknown>): ConversationMessageRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    conversationId: String(row.conversation_id),
    role: row.role as ConversationMessageRecord["role"],
    content: String(row.content),
    mealPlanId: row.meal_plan_id ? String(row.meal_plan_id) : undefined,
    shoppingListId: row.shopping_list_id ? String(row.shopping_list_id) : undefined,
    weeklyPlanId: row.weekly_plan_id ? String(row.weekly_plan_id) : undefined,
    createdAt: toIso(row.created_at),
  };
}

function mapMealPlan(row: Record<string, unknown>): MealPlanRecord {
  const payload = parseJsonObject<MealPlanRecord>(row.payload);
  return {
    ...payload,
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    sourceMessage: String(row.source_message),
    reply: String(row.reply),
    generationMeta: row.generation_meta ? parseJsonObject<MealPlanRecord["generationMeta"]>(row.generation_meta) : undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapWeeklyPlan(row: Record<string, unknown>): WeeklyPlanRecord {
  const payload = parseJsonObject<WeeklyPlanRecord>(row.payload);
  return {
    ...payload,
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    title: String(row.title),
    description: String(row.description),
    tags: parseJsonArray<string>(row.tags),
    generationMeta: row.generation_meta ? parseJsonObject<WeeklyPlanRecord["generationMeta"]>(row.generation_meta) : undefined,
    adopted: Boolean(row.adopted),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapShoppingList(row: Record<string, unknown>): ShoppingListRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    sourceType: row.source_type as ShoppingListRecord["sourceType"],
    sourceId: String(row.source_id),
    items: parseJsonArray<ShoppingListItemRecord>(row.items),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapWorkspaceState(row: Record<string, unknown>): WorkspaceStateRecord {
  return {
    userId: String(row.user_id),
    workspaceId: String(row.workspace_id),
    currentConversationId: row.current_conversation_id ? String(row.current_conversation_id) : undefined,
    currentMealPlanId: row.current_meal_plan_id ? String(row.current_meal_plan_id) : undefined,
    currentWeeklyPlanId: row.current_weekly_plan_id ? String(row.current_weekly_plan_id) : undefined,
    currentShoppingListId: row.current_shopping_list_id ? String(row.current_shopping_list_id) : undefined,
    planningMode: row.planning_mode as WorkspaceStateRecord["planningMode"],
    selectedWeekday: row.selected_weekday ? String(row.selected_weekday) : undefined,
    updatedAt: toIso(row.updated_at),
  };
}

function mealPlanInsertValues(mealPlan: MealPlanRecord) {
  return [
    mealPlan.id,
    mealPlan.userId,
    mealPlan.workspaceId,
    mealPlan.conversationId ?? null,
    mealPlan.mode,
    mealPlan.sourceMessage,
    mealPlan.reply,
    JSON.stringify(mealPlan),
    mealPlan.generationMeta ? JSON.stringify(mealPlan.generationMeta) : null,
    mealPlan.createdAt,
    mealPlan.updatedAt,
  ];
}

function weeklyPlanInsertValues(weeklyPlan: WeeklyPlanRecord) {
  return [
    weeklyPlan.id,
    weeklyPlan.userId,
    weeklyPlan.workspaceId,
    weeklyPlan.conversationId ?? null,
    weeklyPlan.title,
    weeklyPlan.description,
    JSON.stringify(weeklyPlan.tags),
    JSON.stringify(weeklyPlan),
    weeklyPlan.generationMeta ? JSON.stringify(weeklyPlan.generationMeta) : null,
    weeklyPlan.adopted,
    weeklyPlan.createdAt,
    weeklyPlan.updatedAt,
  ];
}

async function upsertProfileWithClient(client: QueryableClient, profile: ProfileRecord) {
  await client.query(
    `INSERT INTO profiles (
      id, user_id, workspace_id, name, daily_calorie_target, protein_target, carbs_target, fat_target, fiber_target,
      taste_preferences, dietary_restrictions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      workspace_id = VALUES(workspace_id),
      name = VALUES(name),
      daily_calorie_target = VALUES(daily_calorie_target),
      protein_target = VALUES(protein_target),
      carbs_target = VALUES(carbs_target),
      fat_target = VALUES(fat_target),
      fiber_target = VALUES(fiber_target),
      taste_preferences = VALUES(taste_preferences),
      dietary_restrictions = VALUES(dietary_restrictions),
      updated_at = VALUES(updated_at)`,
    [
      profile.id,
      profile.userId,
      profile.workspaceId,
      profile.name,
      profile.dailyCalorieTarget,
      profile.proteinTarget,
      profile.carbsTarget,
      profile.fatTarget,
      profile.fiberTarget,
      JSON.stringify(profile.tastePreferences),
      JSON.stringify(profile.dietaryRestrictions),
      profile.createdAt,
      profile.updatedAt,
    ],
  );
}

async function upsertWorkspaceStateWithClient(client: QueryableClient, workspaceState: WorkspaceStateRecord) {
  await client.query(
    `INSERT INTO workspace_states (
      workspace_id, user_id, current_conversation_id, current_meal_plan_id, current_weekly_plan_id,
      current_shopping_list_id, planning_mode, selected_weekday, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      current_conversation_id = VALUES(current_conversation_id),
      current_meal_plan_id = VALUES(current_meal_plan_id),
      current_weekly_plan_id = VALUES(current_weekly_plan_id),
      current_shopping_list_id = VALUES(current_shopping_list_id),
      planning_mode = VALUES(planning_mode),
      selected_weekday = VALUES(selected_weekday),
      updated_at = VALUES(updated_at)`,
    [
      workspaceState.workspaceId,
      workspaceState.userId,
      workspaceState.currentConversationId ?? null,
      workspaceState.currentMealPlanId ?? null,
      workspaceState.currentWeeklyPlanId ?? null,
      workspaceState.currentShoppingListId ?? null,
      workspaceState.planningMode,
      workspaceState.selectedWeekday ?? null,
      workspaceState.updatedAt,
    ],
  );
}

export async function listUsers(): Promise<UserRecord[]> {
  const rows = await queryRows("SELECT * FROM users ORDER BY created_at ASC");
  return rows.map((row) => mapUser(row));
}

export async function readUserById(userId: string): Promise<UserRecord | undefined> {
  const rows = await queryRows("SELECT * FROM users WHERE id = ? LIMIT 1", [userId]);
  const row = rows[0];
  return row ? mapUser(row) : undefined;
}

export async function createUser(user: UserRecord): Promise<UserRecord> {
  await query(
    `INSERT INTO users (id, display_name, kind, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      display_name = VALUES(display_name),
      kind = VALUES(kind),
      updated_at = VALUES(updated_at)`,
    [user.id, user.displayName, user.kind ?? "guest", user.createdAt, user.updatedAt],
  );
  return user;
}

export async function listWorkspacesByUserId(userId: string): Promise<WorkspaceRecord[]> {
  const rows = await queryRows("SELECT * FROM workspaces WHERE owner_user_id = ? ORDER BY created_at ASC", [userId]);
  return rows.map((row) => mapWorkspace(row));
}

export async function readWorkspaceById(workspaceId: string): Promise<WorkspaceRecord | undefined> {
  const rows = await queryRows("SELECT * FROM workspaces WHERE id = ? LIMIT 1", [workspaceId]);
  const row = rows[0];
  return row ? mapWorkspace(row) : undefined;
}

export async function createWorkspace(workspace: WorkspaceRecord): Promise<WorkspaceRecord> {
  await query(
    `INSERT INTO workspaces (id, owner_user_id, name, kind, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      owner_user_id = VALUES(owner_user_id),
      name = VALUES(name),
      kind = VALUES(kind),
      updated_at = VALUES(updated_at)`,
    [workspace.id, workspace.ownerUserId, workspace.name, workspace.kind, workspace.createdAt, workspace.updatedAt],
  );
  return workspace;
}

export async function readSessionByToken(token: string): Promise<SessionRecord | undefined> {
  const rows = await queryRows("SELECT * FROM sessions WHERE token = ? LIMIT 1", [token]);
  const row = rows[0];
  return row ? mapSession(row) : undefined;
}

export async function createSession(session: SessionRecord): Promise<SessionRecord> {
  await query(
    `INSERT INTO sessions (id, user_id, workspace_id, token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      workspace_id = VALUES(workspace_id),
      token = VALUES(token),
      updated_at = VALUES(updated_at)`,
    [session.id, session.userId, session.workspaceId, session.token, session.createdAt, session.updatedAt],
  );
  return session;
}

export async function ensureDefaultGuestContext(now: string): Promise<{ user: UserRecord; workspace: WorkspaceRecord; scope: StoreScope }> {
  const user = (await readUserById(defaultUserId)) ?? await createUser({
    id: defaultUserId,
    displayName: "Guest",
    kind: "guest",
    createdAt: now,
    updatedAt: now,
  });

  const workspace = (await readWorkspaceById(defaultWorkspaceId)) ?? await createWorkspace({
    id: defaultWorkspaceId,
    ownerUserId: user.id,
    name: "Guest Workspace",
    kind: "guest",
    createdAt: now,
    updatedAt: now,
  });

  return {
    user,
    workspace,
    scope: {
      userId: user.id,
      workspaceId: workspace.id,
    },
  };
}

export async function readProfile(scope: StoreScope): Promise<ProfileRecord> {
  const rows = await queryRows(
    "SELECT * FROM profiles WHERE workspace_id = ? AND user_id = ? LIMIT 1",
    [scope.workspaceId, scope.userId],
  );
  const row = rows[0];
  if (row) {
    return mapProfile(row);
  }

  const fallback = defaultProfile(scope);
  await updateProfile(fallback);
  return fallback;
}

export async function updateProfile(profile: ProfileRecord): Promise<ProfileRecord> {
  await query(
    `INSERT INTO profiles (
      id, user_id, workspace_id, name, daily_calorie_target, protein_target, carbs_target, fat_target, fiber_target,
      taste_preferences, dietary_restrictions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      workspace_id = VALUES(workspace_id),
      name = VALUES(name),
      daily_calorie_target = VALUES(daily_calorie_target),
      protein_target = VALUES(protein_target),
      carbs_target = VALUES(carbs_target),
      fat_target = VALUES(fat_target),
      fiber_target = VALUES(fiber_target),
      taste_preferences = VALUES(taste_preferences),
      dietary_restrictions = VALUES(dietary_restrictions),
      updated_at = VALUES(updated_at)`,
    [
      profile.id,
      profile.userId,
      profile.workspaceId,
      profile.name,
      profile.dailyCalorieTarget,
      profile.proteinTarget,
      profile.carbsTarget,
      profile.fatTarget,
      profile.fiberTarget,
      JSON.stringify(profile.tastePreferences),
      JSON.stringify(profile.dietaryRestrictions),
      profile.createdAt,
      profile.updatedAt,
    ],
  );
  return profile;
}

export async function listInventoryItems(scope: StoreScope): Promise<InventoryItemRecord[]> {
  const rows = await queryRows(
    "SELECT * FROM inventory_items WHERE workspace_id = ? ORDER BY updated_at DESC",
    [scope.workspaceId],
  );
  return rows.map((row) => mapInventoryItem(row));
}

export async function replaceInventoryItems(scope: StoreScope, items: InventoryItemRecord[]): Promise<InventoryItemRecord[]> {
  const normalizedItems = items.map((item) => normalizeInventoryItem({ ...item, workspaceId: scope.workspaceId, userId: scope.userId }));

  await withTransaction(async (client) => {
    await client.query("DELETE FROM inventory_items WHERE workspace_id = ?", [scope.workspaceId]);
    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO inventory_items (
          id, user_id, workspace_id, name, category, quantity, quantity_value, quantity_unit,
          expire_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.userId,
          item.workspaceId,
          item.name,
          item.category,
          item.quantity,
          item.quantityValue ?? null,
          item.quantityUnit ?? null,
          item.expireDate ?? null,
          item.status,
          item.createdAt,
          item.updatedAt,
        ],
      );
    }
  });

  return normalizedItems;
}

export async function readMealPlan(scope: StoreScope, mealPlanId: string): Promise<MealPlanRecord | undefined> {
  const rows = await queryRows(
    "SELECT * FROM meal_plans WHERE workspace_id = ? AND id = ? LIMIT 1",
    [scope.workspaceId, mealPlanId],
  );
  const row = rows[0];
  return row ? mapMealPlan(row) : undefined;
}

export async function createMealPlan(mealPlan: MealPlanRecord): Promise<MealPlanRecord> {
  await query(
    `INSERT INTO meal_plans (
      id, user_id, workspace_id, conversation_id, mode, source_message, reply, payload, generation_meta, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    mealPlanInsertValues(mealPlan),
  );
  return mealPlan;
}

export async function updateMealPlan(mealPlan: MealPlanRecord): Promise<MealPlanRecord> {
  await query(
    `UPDATE meal_plans
    SET user_id = ?, workspace_id = ?, conversation_id = ?, mode = ?, source_message = ?, reply = ?,
      payload = ?, generation_meta = ?, created_at = ?, updated_at = ?
    WHERE id = ?`,
    [
      mealPlan.userId,
      mealPlan.workspaceId,
      mealPlan.conversationId ?? null,
      mealPlan.mode,
      mealPlan.sourceMessage,
      mealPlan.reply,
      JSON.stringify(mealPlan),
      mealPlan.generationMeta ? JSON.stringify(mealPlan.generationMeta) : null,
      mealPlan.createdAt,
      mealPlan.updatedAt,
      mealPlan.id,
    ],
  );
  return mealPlan;
}

export async function readWeeklyPlan(scope: StoreScope, weeklyPlanId: string): Promise<WeeklyPlanRecord | undefined> {
  const rows = await queryRows(
    "SELECT * FROM weekly_plans WHERE workspace_id = ? AND id = ? LIMIT 1",
    [scope.workspaceId, weeklyPlanId],
  );
  const row = rows[0];
  return row ? mapWeeklyPlan(row) : undefined;
}

export async function createWeeklyPlan(weeklyPlan: WeeklyPlanRecord): Promise<WeeklyPlanRecord> {
  await query(
    `INSERT INTO weekly_plans (
      id, user_id, workspace_id, conversation_id, title, description, tags, payload, generation_meta, adopted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    weeklyPlanInsertValues(weeklyPlan),
  );
  return weeklyPlan;
}

export async function updateWeeklyPlan(weeklyPlan: WeeklyPlanRecord): Promise<WeeklyPlanRecord> {
  await query(
    `UPDATE weekly_plans
    SET user_id = ?, workspace_id = ?, conversation_id = ?, title = ?, description = ?, tags = ?,
      payload = ?, generation_meta = ?, adopted = ?, created_at = ?, updated_at = ?
    WHERE id = ?`,
    [
      weeklyPlan.userId,
      weeklyPlan.workspaceId,
      weeklyPlan.conversationId ?? null,
      weeklyPlan.title,
      weeklyPlan.description,
      JSON.stringify(weeklyPlan.tags),
      JSON.stringify(weeklyPlan),
      weeklyPlan.generationMeta ? JSON.stringify(weeklyPlan.generationMeta) : null,
      weeklyPlan.adopted,
      weeklyPlan.createdAt,
      weeklyPlan.updatedAt,
      weeklyPlan.id,
    ],
  );
  return weeklyPlan;
}

export async function readShoppingListBySource(
  scope: StoreScope,
  sourceType: "meal_plan" | "weekly_plan",
  sourceId: string,
): Promise<ShoppingListRecord | undefined> {
  const rows = await queryRows(
    "SELECT * FROM shopping_lists WHERE workspace_id = ? AND source_type = ? AND source_id = ? LIMIT 1",
    [scope.workspaceId, sourceType, sourceId],
  );
  const row = rows[0];
  return row ? mapShoppingList(row) : undefined;
}

export async function upsertShoppingList(shoppingList: ShoppingListRecord): Promise<ShoppingListRecord> {
  await query(
    `INSERT INTO shopping_lists (
      id, user_id, workspace_id, source_type, source_id, items, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      workspace_id = VALUES(workspace_id),
      source_type = VALUES(source_type),
      source_id = VALUES(source_id),
      items = VALUES(items),
      updated_at = VALUES(updated_at)`,
    [
      shoppingList.id,
      shoppingList.userId,
      shoppingList.workspaceId,
      shoppingList.sourceType,
      shoppingList.sourceId,
      JSON.stringify(shoppingList.items),
      shoppingList.createdAt,
      shoppingList.updatedAt,
    ],
  );
  return shoppingList;
}

export async function readShoppingList(scope: StoreScope, shoppingListId: string): Promise<ShoppingListRecord | undefined> {
  const rows = await queryRows(
    "SELECT * FROM shopping_lists WHERE workspace_id = ? AND id = ? LIMIT 1",
    [scope.workspaceId, shoppingListId],
  );
  const row = rows[0];
  return row ? mapShoppingList(row) : undefined;
}

export async function listConversations(scope: StoreScope): Promise<ConversationRecord[]> {
  const rows = await queryRows(
    "SELECT * FROM conversations WHERE workspace_id = ? ORDER BY updated_at DESC",
    [scope.workspaceId],
  );
  return rows.map((row) => mapConversation(row));
}

export async function readConversation(scope: StoreScope, conversationId: string): Promise<ConversationRecord | undefined> {
  const rows = await queryRows(
    "SELECT * FROM conversations WHERE workspace_id = ? AND id = ? LIMIT 1",
    [scope.workspaceId, conversationId],
  );
  const row = rows[0];
  return row ? mapConversation(row) : undefined;
}

export async function createConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
  await query(
    `INSERT INTO conversations (id, user_id, workspace_id, title, last_message_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      conversation.id,
      conversation.userId,
      conversation.workspaceId,
      conversation.title,
      conversation.lastMessageAt,
      conversation.createdAt,
      conversation.updatedAt,
    ],
  );
  return conversation;
}

export async function updateConversation(conversation: ConversationRecord): Promise<ConversationRecord> {
  await query(
    `UPDATE conversations
    SET user_id = ?, workspace_id = ?, title = ?, last_message_at = ?, created_at = ?, updated_at = ?
    WHERE id = ?`,
    [
      conversation.userId,
      conversation.workspaceId,
      conversation.title,
      conversation.lastMessageAt,
      conversation.createdAt,
      conversation.updatedAt,
      conversation.id,
    ],
  );
  return conversation;
}

export async function listConversationMessages(scope: StoreScope, conversationId: string): Promise<ConversationMessageRecord[]> {
  const rows = await queryRows(
    `SELECT * FROM conversation_messages
    WHERE workspace_id = ? AND conversation_id = ?
    ORDER BY created_at ASC`,
    [scope.workspaceId, conversationId],
  );
  return rows.map((row) => mapConversationMessage(row));
}

export async function createConversationMessages(messages: ConversationMessageRecord[]): Promise<ConversationMessageRecord[]> {
  await withTransaction(async (client) => {
    for (const message of messages) {
      await client.query(
        `INSERT INTO conversation_messages (
          id, user_id, workspace_id, conversation_id, role, content, meal_plan_id, shopping_list_id, weekly_plan_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.userId,
          message.workspaceId,
          message.conversationId,
          message.role,
          message.content,
          message.mealPlanId ?? null,
          message.shoppingListId ?? null,
          message.weeklyPlanId ?? null,
          message.createdAt,
        ],
      );
    }
  });
  return messages;
}

export async function readWorkspaceState(scope: StoreScope): Promise<WorkspaceStateRecord> {
  const rows = await queryRows("SELECT * FROM workspace_states WHERE workspace_id = ? LIMIT 1", [scope.workspaceId]);
  const row = rows[0];
  if (row) {
    return mapWorkspaceState(row);
  }

  const fallback = defaultWorkspaceState(scope);
  await updateWorkspaceState(fallback);
  return fallback;
}

export async function updateWorkspaceState(workspaceState: WorkspaceStateRecord): Promise<WorkspaceStateRecord> {
  await withTransaction(async (client) => {
    await upsertWorkspaceStateWithClient(client, workspaceState);
  });
  return workspaceState;
}

export async function logAiGenerationEvent(event: AiGenerationEventRecord): Promise<void> {
  await query(
    `INSERT INTO ai_generation_events (
      id, workspace_id, user_id, kind, status, model, request_id, prompt_version,
      source_message, input_payload, raw_output, error_message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.workspaceId,
      event.userId,
      event.kind,
      event.status,
      event.model ?? null,
      event.requestId ?? null,
      event.promptVersion ?? null,
      event.sourceMessage,
      JSON.stringify(event.inputPayload),
      event.rawOutput ?? null,
      event.errorMessage ?? null,
      event.createdAt,
    ],
  );
}

export async function seedWorkspaceData(input: {
  user: UserRecord;
  workspace: WorkspaceRecord;
  session?: SessionRecord;
  profile: ProfileRecord;
  inventoryItems: InventoryItemRecord[];
  mealPlans: MealPlanRecord[];
  weeklyPlans: WeeklyPlanRecord[];
  shoppingLists: ShoppingListRecord[];
  conversations: ConversationRecord[];
  conversationMessages: ConversationMessageRecord[];
  workspaceState: WorkspaceStateRecord;
}): Promise<void> {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM conversation_messages WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM shopping_lists WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM meal_plans WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM weekly_plans WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM conversations WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM inventory_items WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM workspace_states WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM sessions WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM profiles WHERE workspace_id = ?", [input.workspace.id]);
    await client.query("DELETE FROM workspaces WHERE id = ?", [input.workspace.id]);
    await client.query("DELETE FROM users WHERE id = ?", [input.user.id]);

    await client.query(
      `INSERT INTO users (id, display_name, kind, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
      [input.user.id, input.user.displayName, input.user.kind ?? "guest", input.user.createdAt, input.user.updatedAt],
    );
    await client.query(
      `INSERT INTO workspaces (id, owner_user_id, name, kind, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [input.workspace.id, input.workspace.ownerUserId, input.workspace.name, input.workspace.kind, input.workspace.createdAt, input.workspace.updatedAt],
    );
    if (input.session) {
      await client.query(
        `INSERT INTO sessions (id, user_id, workspace_id, token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.session.id,
          input.session.userId,
          input.session.workspaceId,
          input.session.token,
          input.session.createdAt,
          input.session.updatedAt,
        ],
      );
    }

    await upsertProfileWithClient(client, input.profile);

    for (const item of input.inventoryItems.map(normalizeInventoryItem)) {
      await client.query(
        `INSERT INTO inventory_items (
          id, user_id, workspace_id, name, category, quantity, quantity_value, quantity_unit,
          expire_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.userId,
          item.workspaceId,
          item.name,
          item.category,
          item.quantity,
          item.quantityValue ?? null,
          item.quantityUnit ?? null,
          item.expireDate ?? null,
          item.status,
          item.createdAt,
          item.updatedAt,
        ],
      );
    }

    for (const mealPlan of input.mealPlans) {
      await client.query(
        `INSERT INTO meal_plans (
          id, user_id, workspace_id, conversation_id, mode, source_message, reply, payload, generation_meta, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        mealPlanInsertValues(mealPlan),
      );
    }

    for (const weeklyPlan of input.weeklyPlans) {
      await client.query(
        `INSERT INTO weekly_plans (
          id, user_id, workspace_id, conversation_id, title, description, tags, payload, generation_meta, adopted, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        weeklyPlanInsertValues(weeklyPlan),
      );
    }

    for (const shoppingList of input.shoppingLists) {
      await client.query(
        `INSERT INTO shopping_lists (
          id, user_id, workspace_id, source_type, source_id, items, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shoppingList.id,
          shoppingList.userId,
          shoppingList.workspaceId,
          shoppingList.sourceType,
          shoppingList.sourceId,
          JSON.stringify(shoppingList.items),
          shoppingList.createdAt,
          shoppingList.updatedAt,
        ],
      );
    }

    for (const conversation of input.conversations) {
      await client.query(
        `INSERT INTO conversations (id, user_id, workspace_id, title, last_message_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          conversation.id,
          conversation.userId,
          conversation.workspaceId,
          conversation.title,
          conversation.lastMessageAt,
          conversation.createdAt,
          conversation.updatedAt,
        ],
      );
    }

    for (const message of input.conversationMessages) {
      await client.query(
        `INSERT INTO conversation_messages (
          id, user_id, workspace_id, conversation_id, role, content, meal_plan_id, shopping_list_id, weekly_plan_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.userId,
          message.workspaceId,
          message.conversationId,
          message.role,
          message.content,
          message.mealPlanId ?? null,
          message.shoppingListId ?? null,
          message.weeklyPlanId ?? null,
          message.createdAt,
        ],
      );
    }

    await upsertWorkspaceStateWithClient(client, input.workspaceState);
  });
}
