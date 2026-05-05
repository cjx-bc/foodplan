import { randomUUID } from "node:crypto";

import type { InventoryItemRecord, InventoryStatus, MealIngredientRecord, MealRecommendationRecord } from "./types.js";

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

const quantityUnitAliases: Record<string, string> = {
  个: "piece",
  颗: "piece",
  枚: "piece",
  根: "piece",
  盒: "box",
  袋: "bag",
  碗: "bowl",
  杯: "cup",
  克: "g",
  千克: "kg",
  毫升: "ml",
  升: "l",
  piece: "piece",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",
  box: "box",
  boxes: "box",
  bag: "bag",
  bags: "bag",
  bowl: "bowl",
  bowls: "bowl",
  cup: "cup",
  cups: "cup",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
};

export function normalizeQuantityUnit(unit?: string): string | undefined {
  if (!unit) {
    return undefined;
  }

  const normalized = unit.trim().toLowerCase();
  return quantityUnitAliases[normalized] ?? normalized;
}

export function normalizeQuantityText(quantity: string, quantityValue?: number, quantityUnit?: string): string {
  const normalizedUnit = normalizeQuantityUnit(quantityUnit);
  if (quantityValue && normalizedUnit) {
    return `${quantityValue} ${normalizedUnit}`;
  }
  return quantity.trim();
}

export function normalizeInventoryItem(item: InventoryItemRecord): InventoryItemRecord {
  return {
    ...item,
    quantityUnit: normalizeQuantityUnit(item.quantityUnit),
    quantity: normalizeQuantityText(item.quantity, item.quantityValue, item.quantityUnit),
    status: deriveInventoryStatus(item.expireDate),
  };
}

const chineseAmountAliases: Record<string, number> = {
  半: 0.5,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseAmountNumber(value: string): number | undefined {
  const normalized = value.trim();
  const numeric = normalized.match(/^(\d+(?:\.\d+)?)/);
  if (numeric) {
    return Number(numeric[1]);
  }

  const chinese = normalized.match(/^([半一二两三四五六七八九十])/);
  return chinese ? chineseAmountAliases[chinese[1] ?? ""] : undefined;
}

function parseAmountUnit(value: string): string | undefined {
  const normalized = value.trim();
  const numeric = normalized.match(/^\d+(?:\.\d+)?\s*([^\d\s.]+)$/);
  if (numeric) {
    return normalizeQuantityUnit(numeric[1]);
  }

  const chinese = normalized.match(/^[半一二两三四五六七八九十]\s*([^\d\s.]+)$/);
  return chinese ? normalizeQuantityUnit(chinese[1]) : undefined;
}

export function normalizeIngredientAmount(amount: string): string {
  const trimmed = amount.trim().replace(/\s+/g, " ");
  const value = parseAmountNumber(trimmed);
  const unit = parseAmountUnit(trimmed);
  if (value !== undefined && unit) {
    return `${value} ${unit}`;
  }
  return trimmed;
}

export function normalizeMealIngredient(ingredient: MealIngredientRecord): MealIngredientRecord {
  return {
    ...ingredient,
    name: ingredient.name.trim(),
    amount: normalizeIngredientAmount(ingredient.amount),
  };
}

export function normalizeMealRecommendation(meal: MealRecommendationRecord): MealRecommendationRecord {
  return {
    ...meal,
    ingredients: meal.ingredients.map(normalizeMealIngredient),
  };
}
