"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import styles from "./InstallPwaPrompt.module.css";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.title}>Installa Fantanome sul tuo dispositivo</p>
        <p className={styles.subtitle}>
          Accedi più velocemente aggiungendo l&apos;app alla schermata iniziale.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={dismissPrompt}>
            Più tardi
          </Button>
          <Button onClick={handleInstall}>Installa</Button>
        </div>
      </div>
    </div>
  );
}
