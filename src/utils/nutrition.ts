import type { MealRecommendation, NutritionFacts, NutritionSummary, UserProfile } from "../types/smartmeal";

export function sumNutrition(meals: MealRecommendation[]): NutritionFacts {
  return meals.reduce<NutritionFacts>(
    (total, meal) => ({
      calories: total.calories + meal.nutrition.calories,
      protein: total.protein + meal.nutrition.protein,
      carbs: total.carbs + meal.nutrition.carbs,
      fat: total.fat + meal.nutrition.fat,
      fiber: total.fiber + meal.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

export function buildNutritionSummary(meals: MealRecommendation[], profile: UserProfile): NutritionSummary {
  const actual = sumNutrition(meals);
  const target: NutritionFacts = {
    calories: profile.dailyCalorieTarget,
    protein: profile.proteinTarget,
    carbs: profile.carbsTarget,
    fat: profile.fatTarget,
    fiber: profile.fiberTarget,
  };

  const deltas: NutritionFacts = {
    calories: actual.calories - target.calories,
    protein: actual.protein - target.protein,
    carbs: actual.carbs - target.carbs,
    fat: actual.fat - target.fat,
    fiber: actual.fiber - target.fiber,
  };

  const proteinScore = Math.min(actual.protein / target.protein, 1);
  const calorieScore = Math.max(0, 1 - Math.abs(actual.calories - target.calories) / target.calories);
  const fiberScore = Math.min(actual.fiber / target.fiber, 1);

  return {
    actual,
    target,
    deltas,
    score: Math.round((proteinScore * 0.35 + calorieScore * 0.4 + fiberScore * 0.25) * 100),
  };
}

export function formatDelta(value: number, unit: string): string {
  if (value === 0) return `持平 ${unit}`;
  return `${value > 0 ? "+" : ""}${value}${unit}`;
}
