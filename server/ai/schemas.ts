import type { JSONSchemaType } from "ajv";

export type DeepSeekDailyPlanOutput = {
  reply: string;
  breakfastId: string;
  lunchId: string;
  dinnerId: string;
  suggestions: string[];
};

export type DeepSeekWeeklyPlanDayOutput = {
  date: string;
  breakfastId: string;
  lunchId: string;
  dinnerId: string;
};

export type DeepSeekWeeklyPlanOutput = {
  title: string;
  description: string;
  tags: string[];
  insights: string[];
  days: DeepSeekWeeklyPlanDayOutput[];
};

export const dailyPlanSchema: JSONSchemaType<DeepSeekDailyPlanOutput> = {
  type: "object",
  properties: {
    reply: { type: "string", minLength: 1 },
    breakfastId: { type: "string", minLength: 1 },
    lunchId: { type: "string", minLength: 1 },
    dinnerId: { type: "string", minLength: 1 },
    suggestions: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
    },
  },
  required: ["reply", "breakfastId", "lunchId", "dinnerId", "suggestions"],
  additionalProperties: false,
};

export const weeklyPlanSchema: JSONSchemaType<DeepSeekWeeklyPlanOutput> = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    tags: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
    },
    insights: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
    },
    days: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          date: { type: "string", minLength: 10 },
          breakfastId: { type: "string", minLength: 1 },
          lunchId: { type: "string", minLength: 1 },
          dinnerId: { type: "string", minLength: 1 },
        },
        required: ["date", "breakfastId", "lunchId", "dinnerId"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "description", "tags", "insights", "days"],
  additionalProperties: false,
};
