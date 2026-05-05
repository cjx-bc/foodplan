import { readFile } from "node:fs/promises";
import path from "node:path";

import { closePool } from "../server/db.js";
import { seedWorkspaceData } from "../server/store.js";
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
  WorkspaceRecord,
  WorkspaceStateRecord,
} from "../server/types.js";

function normalizeUser(store: Partial<AppStore>, now: string): UserRecord {
  const user = store.users?.[0];
  return {
    id: user?.id ?? "user_guest_default",
    displayName: user?.displayName ?? "Guest",
    kind: user?.kind ?? "guest",
    createdAt: user?.createdAt ?? now,
    updatedAt: user?.updatedAt ?? now,
  };
}

function normalizeWorkspace(store: Partial<AppStore>, user: UserRecord, now: string): WorkspaceRecord {
  const workspace = store.workspaces?.[0];
  return {
    id: workspace?.id ?? "workspace_guest_default",
    ownerUserId: workspace?.ownerUserId ?? user.id,
    name: workspace?.name ?? "Guest Workspace",
    kind: workspace?.kind ?? "guest",
    createdAt: workspace?.createdAt ?? now,
    updatedAt: workspace?.updatedAt ?? now,
  };
}

function normalizeSession(store: Partial<AppStore>, user: UserRecord, workspace: WorkspaceRecord, now: string): SessionRecord | undefined {
  const session = store.sessions?.[0];
  if (!session) {
    return undefined;
  }
  return {
    id: session.id,
    userId: session.userId ?? user.id,
    workspaceId: session.workspaceId ?? workspace.id,
    token: session.token,
    createdAt: session.createdAt ?? now,
    updatedAt: session.updatedAt ?? now,
  };
}

function withScope<T extends object>(value: T, userId: string, workspaceId: string): T & { userId: string; workspaceId: string } {
  const scoped = value as T & { userId?: string; workspaceId?: string };
  return {
    ...value,
    userId: scoped.userId ?? userId,
    workspaceId: scoped.workspaceId ?? workspaceId,
  };
}

async function main() {
  const inputPath = process.env.SMARTMEAL_JSON_SEED_PATH ?? path.join(process.cwd(), "server", "data", "store.json");
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppStore>;
  const now = parsed.workspaceState?.updatedAt ?? parsed.profile?.updatedAt ?? new Date().toISOString();

  const user = normalizeUser(parsed, now);
  const workspace = normalizeWorkspace(parsed, user, now);
  const session = normalizeSession(parsed, user, workspace, now);

  const profile: ProfileRecord = withScope(
    {
      ...(parsed.profile as Omit<ProfileRecord, "userId" | "workspaceId">),
      id: parsed.profile?.id ?? "profile_001",
      name: parsed.profile?.name ?? "家庭饮食计划",
      dailyCalorieTarget: parsed.profile?.dailyCalorieTarget ?? 1900,
      proteinTarget: parsed.profile?.proteinTarget ?? 95,
      carbsTarget: parsed.profile?.carbsTarget ?? 250,
      fatTarget: parsed.profile?.fatTarget ?? 65,
      fiberTarget: parsed.profile?.fiberTarget ?? 25,
      tastePreferences: parsed.profile?.tastePreferences ?? ["清淡", "家常", "高蛋白"],
      dietaryRestrictions: parsed.profile?.dietaryRestrictions ?? ["少油", "少盐"],
      createdAt: parsed.profile?.createdAt ?? now,
      updatedAt: parsed.profile?.updatedAt ?? now,
    },
    user.id,
    workspace.id,
  ) as ProfileRecord;

  const inventoryItems = (parsed.inventoryItems ?? []).map((item) => withScope(item, user.id, workspace.id) as InventoryItemRecord);
  const mealPlans = (parsed.mealPlans ?? []).map((item) => withScope(item, user.id, workspace.id) as MealPlanRecord);
  const weeklyPlans = (parsed.weeklyPlans ?? []).map((item) => withScope(item, user.id, workspace.id) as WeeklyPlanRecord);
  const shoppingLists = (parsed.shoppingLists ?? []).map((item) => withScope(item, user.id, workspace.id) as ShoppingListRecord);
  const conversations = (parsed.conversations ?? []).map((item) => withScope(item, user.id, workspace.id) as ConversationRecord);
  const conversationMessages = (parsed.conversationMessages ?? []).map((item) => withScope(item, user.id, workspace.id) as ConversationMessageRecord);
  const workspaceState: WorkspaceStateRecord = withScope(
    {
      ...(parsed.workspaceState ?? {}),
      planningMode: parsed.workspaceState?.planningMode ?? "daily",
      updatedAt: parsed.workspaceState?.updatedAt ?? now,
    },
    user.id,
    workspace.id,
  ) as WorkspaceStateRecord;

  await seedWorkspaceData({
    user,
    workspace,
    session,
    profile,
    inventoryItems,
    mealPlans,
    weeklyPlans,
    shoppingLists,
    conversations,
    conversationMessages,
    workspaceState,
  });

  console.log(`Seeded MySQL from ${inputPath}`);
  console.log(`Workspace ${workspace.id} now owns ${inventoryItems.length} inventory items, ${mealPlans.length} meal plans, ${weeklyPlans.length} weekly plans.`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
