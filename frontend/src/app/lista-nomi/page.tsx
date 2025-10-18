"use client";

import dynamic from "next/dynamic";
import styles from "./page.module.css";

const ListaNomiClient = dynamic(() => import("./ListaNomiClient"), {
  ssr: false,
  loading: () => (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.errorState}>
          <p>Caricamento...</p>
        </div>
      </div>
    </div>
  ),
});

export default function ListaNomiPage() {
  return <ListaNomiClient />;
}
