import { randomUUID } from "node:crypto";

import type { InventoryItemRecord, InventoryStatus } from "./types.js";

export function createRequestId(): string {
  return randomUUID();
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function deriveInventoryStatus(expireDate?: string): InventoryStatus {
  if (!expireDate) {
    return "fresh";
  }

  const expireAt = parseDateOnly(expireDate);
  if (expireAt === null) {
    return "fresh";
  }

  const now = new Date();
  const todayAt = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((expireAt - todayAt) / 86_400_000);

  if (diffDays < 0) {
    return "expired";
  }

  if (diffDays <= 3) {
    return "expiring_soon";
  }

  return "fresh";
}

export function normalizeInventoryItem(item: InventoryItemRecord): InventoryItemRecord {
  return {
    ...item,
    status: deriveInventoryStatus(item.expireDate),
  };
}
