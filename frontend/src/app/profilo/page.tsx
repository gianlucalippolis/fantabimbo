"use client";

import dynamic from "next/dynamic";
import styles from "./page.module.css";

// Load the client component with SSR disabled
const ProfiloClient = dynamic(() => import("./ProfiloClient"), {
  ssr: false,
  loading: () => (
    <div className={styles.container}>
      <div className={styles.card}>
        <p className={styles.loading}>Caricamento...</p>
      </div>
    </div>
  ),
});

export default function ProfilePage() {
  return <ProfiloClient />;
}
