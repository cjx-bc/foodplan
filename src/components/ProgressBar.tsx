import styles from "./ProgressBar.module.css";

type ProgressBarProps = {
  label: string;
  value: number;
  target: number;
  unit: string;
};

export function ProgressBar({ label, value, target, unit }: ProgressBarProps) {
  const percent = Math.min(Math.round((value / target) * 100), 120);

  return (
    <div className={styles.row}>
      <div className={styles.meta}>
        <span>{label}</span>
        <strong>
          {value} / {target} {unit}
        </strong>
        <em>{percent}%</em>
      </div>
      <div className={styles.track}>
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}
