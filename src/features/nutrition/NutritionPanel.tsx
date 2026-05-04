import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import { ProgressBar } from "../../components/ProgressBar";
import type { NutritionSummary } from "../../types/smartmeal";
import { formatDelta } from "../../utils/nutrition";
import styles from "./NutritionPanel.module.css";

type NutritionPanelProps = {
  summary: NutritionSummary;
  suggestions: string[];
};

export function NutritionPanel({ summary, suggestions }: NutritionPanelProps) {
  return (
    <section className={styles.panel} aria-label="今日营养概览">
      <div className={styles.header}>
        <span>
          <Activity size={19} />
          今日营养概览
        </span>
        <strong>{summary.score} 分</strong>
      </div>

      <div className={styles.delta}>
        <div>
          <small>总热量</small>
          <strong>{summary.actual.calories}</strong>
          <span>{formatDelta(summary.deltas.calories, "kcal")}</span>
        </div>
        <div>
          <small>蛋白质</small>
          <strong>{summary.actual.protein}g</strong>
          <span>{formatDelta(summary.deltas.protein, "g")}</span>
        </div>
      </div>

      <div className={styles.progressList}>
        <ProgressBar label="热量" value={summary.actual.calories} target={summary.target.calories} unit="kcal" />
        <ProgressBar label="蛋白质" value={summary.actual.protein} target={summary.target.protein} unit="g" />
        <ProgressBar label="碳水" value={summary.actual.carbs} target={summary.target.carbs} unit="g" />
        <ProgressBar label="脂肪" value={summary.actual.fat} target={summary.target.fat} unit="g" />
        <ProgressBar label="膳食纤维" value={summary.actual.fiber} target={summary.target.fiber} unit="g" />
      </div>

      <div className={styles.suggestions}>
        <h3>
          <Sparkles size={17} />
          AI 个性化建议
        </h3>
        {suggestions.map((suggestion) => (
          <p key={suggestion}>
            <CheckCircle2 size={16} />
            {suggestion}
          </p>
        ))}
      </div>
    </section>
  );
}
