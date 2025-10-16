import { useEffect } from "react";
import styles from "./Popup.module.css";

interface PopupProps {
  isVisible: boolean;
  onClose: () => void;
  type?: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  autoCloseMs?: number;
}

export default function Popup({
  isVisible,
  onClose,
  type = "info",
  title,
  message,
  autoCloseMs = 3000,
}: PopupProps) {
  useEffect(() => {
    if (isVisible && autoCloseMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoCloseMs, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.popup} ${styles[type]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.iconTitle}>
            <span className={styles.icon}>{getIcon()}</span>
            {title && <h3 className={styles.title}>{title}</h3>}
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.footer}>
          <button className={styles.okButton} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
