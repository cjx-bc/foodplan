import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function IconButton({ icon, children, variant = "secondary", className = "", ...props }: IconButtonProps) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className}`} {...props}>
      <span className={styles.icon}>{icon}</span>
      {children ? <span>{children}</span> : null}
    </button>
  );
}
