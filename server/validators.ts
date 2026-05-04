import type {
  ApiFieldError,
  ConversationRecord,
  InventoryCategory,
  InventoryItemRecord,
  ProfileRecord,
  ShoppingListRecord,
} from "./types.js";
import { deriveInventoryStatus, parseDateOnly } from "./utils.js";

const inventoryCategories = new Set<InventoryCategory>([
  "vegetable",
  "meat_egg",
  "staple",
  "seasoning",
  "dairy",
  "fruit",
  "other",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateStringArray(field: string, value: unknown, errors: ApiFieldError[]): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push({ field, message: "Must be an array of strings" });
    return undefined;
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function validatePositiveNumber(field: string, value: unknown, errors: ApiFieldError[]): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errors.push({ field, message: "Must be a positive number" });
    return undefined;
  }

  return value;
}

export function validateProfilePatch(
  body: unknown,
  currentProfile: ProfileRecord,
  updatedAt: string,
): { errors: ApiFieldError[]; value?: ProfileRecord } {
  const errors: ApiFieldError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push({ field: "body", message: "Must be a JSON object" });
    return { errors };
  }

  const payload = body as Record<string, unknown>;
  const name = payload.name === undefined ? currentProfile.name : String(payload.name).trim();
  if (!isNonEmptyString(name)) {
    errors.push({ field: "name", message: "Name is required" });
  }

  const tastePreferences = validateStringArray("tastePreferences", payload.tastePreferences, errors);
  const dietaryRestrictions = validateStringArray("dietaryRestrictions", payload.dietaryRestrictions, errors);

  const nextProfile: ProfileRecord = {
    ...currentProfile,
    name,
    dailyCalorieTarget: validatePositiveNumber("dailyCalorieTarget", payload.dailyCalorieTarget, errors) ?? currentProfile.dailyCalorieTarget,
    proteinTarget: validatePositiveNumber("proteinTarget", payload.proteinTarget, errors) ?? currentProfile.proteinTarget,
    carbsTarget: validatePositiveNumber("carbsTarget", payload.carbsTarget, errors) ?? currentProfile.carbsTarget,
    fatTarget: validatePositiveNumber("fatTarget", payload.fatTarget, errors) ?? currentProfile.fatTarget,
    fiberTarget: validatePositiveNumber("fiberTarget", payload.fiberTarget, errors) ?? currentProfile.fiberTarget,
    tastePreferences: tastePreferences ?? currentProfile.tastePreferences,
    dietaryRestrictions: dietaryRestrictions ?? currentProfile.dietaryRestrictions,
    updatedAt,
  };

  return errors.length > 0 ? { errors } : { errors, value: nextProfile };
}

export function validateInventoryCreate(
  body: unknown,
  now: string,
  id: string,
): { errors: ApiFieldError[]; value?: InventoryItemRecord } {
  const errors: ApiFieldError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push({ field: "body", message: "Must be a JSON object" });
    return { errors };
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    errors.push({ field: "name", message: "Name is required" });
  }

  const quantity = typeof payload.quantity === "string" ? payload.quantity.trim() : "";
  if (!quantity) {
    errors.push({ field: "quantity", message: "Quantity is required" });
  }

  const category = payload.category;
  if (typeof category !== "string" || !inventoryCategories.has(category as InventoryCategory)) {
    errors.push({ field: "category", message: "Category is invalid" });
  }

  const quantityValue =
    payload.quantityValue === undefined
      ? undefined
      : typeof payload.quantityValue === "number" && Number.isFinite(payload.quantityValue) && payload.quantityValue > 0
        ? payload.quantityValue
        : (() => {
            errors.push({ field: "quantityValue", message: "Must be a positive number" });
            return undefined;
          })();

  const quantityUnit =
    payload.quantityUnit === undefined
      ? undefined
      : typeof payload.quantityUnit === "string" && payload.quantityUnit.trim()
        ? payload.quantityUnit.trim()
        : (() => {
            errors.push({ field: "quantityUnit", message: "Must be a non-empty string" });
            return undefined;
          })();

  const expireDate =
    payload.expireDate === undefined
      ? undefined
      : typeof payload.expireDate === "string" && parseDateOnly(payload.expireDate) !== null
        ? payload.expireDate
        : (() => {
            errors.push({ field: "expireDate", message: "Must be a YYYY-MM-DD date string" });
            return undefined;
          })();

  const value: InventoryItemRecord = {
    id,
    name,
    category: (category as InventoryCategory) ?? "other",
    quantity,
    quantityValue,
    quantityUnit,
    expireDate,
    status: deriveInventoryStatus(expireDate),
    createdAt: now,
    updatedAt: now,
  };

  return errors.length > 0 ? { errors } : { errors, value };
}

export function validateInventoryPatch(
  body: unknown,
  currentItem: InventoryItemRecord,
  updatedAt: string,
): { errors: ApiFieldError[]; value?: InventoryItemRecord } {
  const errors: ApiFieldError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    errors.push({ field: "body", message: "Must be a JSON object" });
    return { errors };
  }

  const payload = body as Record<string, unknown>;
  const nextItem: InventoryItemRecord = {
    ...currentItem,
    updatedAt,
  };

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string" || !payload.name.trim()) {
      errors.push({ field: "name", message: "Name is required" });
    } else {
      nextItem.name = payload.name.trim();
    }
  }

  if (payload.category !== undefined) {
    if (typeof payload.category !== "string" || !inventoryCategories.has(payload.category as InventoryCategory)) {
      errors.push({ field: "category", message: "Category is invalid" });
    } else {
      nextItem.category = payload.category as InventoryCategory;
    }
  }

  if (payload.quantity !== undefined) {
    if (typeof payload.quantity !== "string" || !payload.quantity.trim()) {
      errors.push({ field: "quantity", message: "Quantity is required" });
    } else {
      nextItem.quantity = payload.quantity.trim();
    }
  }

  if (payload.quantityValue !== undefined) {
    if (typeof payload.quantityValue !== "number" || !Number.isFinite(payload.quantityValue) || payload.quantityValue <= 0) {
      errors.push({ field: "quantityValue", message: "Must be a positive number" });
    } else {
      nextItem.quantityValue = payload.quantityValue;
    }
  }

  if (payload.quantityUnit !== undefined) {
    if (typeof payload.quantityUnit !== "string" || !payload.quantityUnit.trim()) {
      errors.push({ field: "quantityUnit", message: "Must be a non-empty string" });
    } else {
      nextItem.quantityUnit = payload.quantityUnit.trim();
    }
  }

  if (payload.expireDate !== undefined) {
    if (payload.expireDate === null || payload.expireDate === "") {
      nextItem.expireDate = undefined;
    } else if (typeof payload.expireDate !== "string" || parseDateOnly(payload.expireDate) === null) {
      errors.push({ field: "expireDate", message: "Must be a YYYY-MM-DD date string" });
    } else {
      nextItem.expireDate = payload.expireDate;
    }
  }

  nextItem.status = deriveInventoryStatus(nextItem.expireDate);

  return errors.length > 0 ? { errors } : { errors, value: nextItem };
}

export function validateMealPlanCreate(body: unknown): { errors: ApiFieldError[]; value?: { message: string; mode: "daily"; conversationId?: string } } {
  const errors: ApiFieldError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Must be a JSON object" }] };
  }

  const payload = body as Record<string, unknown>;
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    errors.push({ field: "message", message: "Message is required" });
  }

  if (payload.mode !== undefined && payload.mode !== "daily") {
    errors.push({ field: "mode", message: "Only daily mode is supported for now" });
  }

  if (payload.conversationId !== undefined && (typeof payload.conversationId !== "string" || !payload.conversationId.trim())) {
    errors.push({ field: "conversationId", message: "Conversation ID must be a non-empty string" });
  }

  return errors.length > 0
    ? { errors }
    : {
        errors,
        value: {
          message,
          mode: "daily",
          conversationId: typeof payload.conversationId === "string" ? payload.conversationId.trim() : undefined,
        },
      };
}

export function validateShoppingListGenerate(body: unknown): {
  errors: ApiFieldError[];
  value?: { sourceType: "meal_plan" | "weekly_plan"; sourceId: string; preserveCheckedState: boolean };
} {
  const errors: ApiFieldError[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Must be a JSON object" }] };
  }

  const payload = body as Record<string, unknown>;
  if (payload.sourceType !== "meal_plan" && payload.sourceType !== "weekly_plan") {
    errors.push({ field: "sourceType", message: "Source type is invalid" });
  }
  const sourceId = typeof payload.sourceId === "string" ? payload.sourceId.trim() : "";
  if (!sourceId) {
    errors.push({ field: "sourceId", message: "Source ID is required" });
  }

  return errors.length > 0
    ? { errors }
    : {
        errors,
        value: {
          sourceType: payload.sourceType as "meal_plan" | "weekly_plan",
          sourceId,
          preserveCheckedState: payload.preserveCheckedState !== false,
        },
      };
}

export function validateShoppingListItemPatch(
  body: unknown,
  currentList: ShoppingListRecord,
  itemId: string,
): { errors: ApiFieldError[]; value?: ShoppingListRecord } {
  const errors: ApiFieldError[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Must be a JSON object" }] };
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.checked !== "boolean") {
    errors.push({ field: "checked", message: "Checked must be a boolean" });
    return { errors };
  }

  const hasItem = currentList.items.some((item) => item.id === itemId);
  if (!hasItem) {
    errors.push({ field: "itemId", message: "Shopping list item not found" });
    return { errors };
  }

  return {
    errors,
    value: {
      ...currentList,
      items: currentList.items.map((item) => (item.id === itemId ? { ...item, checked: payload.checked as boolean } : item)),
    },
  };
}

export function validateConversationCreate(body: unknown, now: string, id: string): { errors: ApiFieldError[]; value?: ConversationRecord } {
  const errors: ApiFieldError[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Must be a JSON object" }] };
  }

  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    errors.push({ field: "title", message: "Title is required" });
  }

  return errors.length > 0
    ? { errors }
    : {
        errors,
        value: {
          id,
          title,
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        },
      };
}

export function validateConversationMessageCreate(body: unknown): {
  errors: ApiFieldError[];
  value?: { content: string; mode: "daily"; triggerPlanGeneration: boolean };
} {
  const errors: ApiFieldError[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: [{ field: "body", message: "Must be a JSON object" }] };
  }

  const payload = body as Record<string, unknown>;
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  if (!content) {
    errors.push({ field: "content", message: "Content is required" });
  }
  if (payload.mode !== undefined && payload.mode !== "daily") {
    errors.push({ field: "mode", message: "Only daily mode is supported for now" });
  }

  return errors.length > 0
    ? { errors }
    : {
        errors,
        value: {
          content,
          mode: "daily",
          triggerPlanGeneration: payload.triggerPlanGeneration !== false,
        },
      };
}
