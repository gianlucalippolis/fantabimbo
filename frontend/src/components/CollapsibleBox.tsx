"use client";

import { ReactNode } from "react";
import styles from "./CollapsibleBox.module.css";

interface CollapsibleBoxProps {
  title: string;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
}

export function CollapsibleBox({
  title,
  children,
  className = styles.collapsibleBox,
  summaryClassName = styles.collapsibleSummary,
  contentClassName = styles.collapsibleContent,
}: CollapsibleBoxProps) {
  return (
    <details className={className}>
      <summary className={summaryClassName}>{title}</summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
