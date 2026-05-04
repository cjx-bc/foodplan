import { ChevronDown, ChevronUp, Clock, RefreshCcw, Utensils } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../../components/IconButton";
import type { MealRecommendation, MealType } from "../../types/smartmeal";
import { mealTypeLabels } from "../../utils/labels";
import styles from "./TodayMealsPanel.module.css";

type TodayMealsPanelProps = {
  meals: MealRecommendation[];
  onSwapMeal: (mealType: MealType) => void;
};

export function TodayMealsPanel({ meals, onSwapMeal }: TodayMealsPanelProps) {
  const [expanded, setExpanded] = useState<MealType>("lunch");

  return (
    <section className={styles.panel} aria-label="今日三餐推荐页">
      <div className={styles.sectionHeader}>
        <span className={styles.step}><Utensils size={22} /></span>
        <div>
          <h2>今日三餐推荐页</h2>
          <p>AI 已按清淡、高蛋白和库存优先优化。</p>
        </div>
      </div>

      <div className={styles.mealList}>
        {meals.map((meal) => {
          const isExpanded = expanded === meal.mealType;

          return (
            <article key={meal.id} className={`${styles.mealCard} ${isExpanded ? styles.expanded : ""}`}>
              <header className={styles.mealHeader}>
                <div>
                  <span className={styles.mealType}>
                    <Utensils size={18} />
                    {mealTypeLabels[meal.mealType]}
                  </span>
                  <h3>{meal.title}</h3>
                  <p>{meal.description}</p>
                </div>
                <button
                  className={styles.expandButton}
                  type="button"
                  onClick={() => setExpanded(isExpanded ? "breakfast" : meal.mealType)}
                  aria-label={`${isExpanded ? "收起" : "展开"}${mealTypeLabels[meal.mealType]}详情`}
                >
                  <strong>{meal.nutrition.calories}</strong> kcal
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </header>

              {isExpanded ? (
                <div className={styles.detail}>
                  <img src={meal.imageUrl} alt={meal.title} />
                  <div className={styles.detailContent}>
                    <div className={styles.metaLine}>
                      <span>
                        <Clock size={15} />
                        约 {meal.cookTimeMinutes} 分钟
                      </span>
                    </div>
                    <div className={styles.nutritionGrid}>
                      <span>蛋白质 <strong>{meal.nutrition.protein}g</strong></span>
                      <span>碳水 <strong>{meal.nutrition.carbs}g</strong></span>
                      <span>脂肪 <strong>{meal.nutrition.fat}g</strong></span>
                      <span>膳食纤维 <strong>{meal.nutrition.fiber}g</strong></span>
                    </div>
                    <p className={styles.tip}>{meal.aiTip}</p>
                    <div className={styles.ingredients}>
                      {meal.ingredients.map((ingredient) => (
                        <span key={`${meal.id}-${ingredient.name}`} className={ingredient.fromInventory ? styles.inventoryTag : ""}>
                          {ingredient.name} · {ingredient.amount}
                        </span>
                      ))}
                    </div>
                    <div className={styles.cardActions}>
                      <IconButton icon={<Utensils size={16} />} type="button">查看做法</IconButton>
                      <IconButton icon={<RefreshCcw size={16} />} type="button" onClick={() => onSwapMeal(meal.mealType)}>
                        换一个
                      </IconButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
