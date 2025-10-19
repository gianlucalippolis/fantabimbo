import type { ReactNode } from "react";
import styles from "./InfoBox.module.css";

type InfoBoxVariant = "info" | "warning" | "success" | "error";

interface InfoBoxProps {
  variant?: InfoBoxVariant;
  icon?: string;
  children: ReactNode;
  className?: string;
}

export function InfoBox({
  variant = "info",
  icon,
  children,
  className,
}: InfoBoxProps) {
  const classes = [styles.infoBox, styles[variant], className ?? ""]
    .filter(Boolean)
    .join(" ");

  const defaultIcon = icon ?? getDefaultIcon(variant);

  return (
    <div className={classes}>
      {defaultIcon && <span className={styles.icon}>{defaultIcon}</span>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}

function getDefaultIcon(variant: InfoBoxVariant): string {
  switch (variant) {
    case "info":
      return "💡";
    case "warning":
      return "⚠️";
    case "success":
      return "✅";
    case "error":
      return "❌";
    default:
      return "💡";
  }
}

export default InfoBox;
