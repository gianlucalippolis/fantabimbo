"use client";

import { useEffect, useState } from "react";
import styles from "./Countdown.module.css";

interface CountdownProps {
  targetDate: string | null;
  onExpire?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export default function Countdown({ targetDate, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!targetDate || !mounted) return;

    const calculateTimeLeft = (): TimeLeft => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    // Update immediately
    const newTimeLeft = calculateTimeLeft();
    setTimeLeft(newTimeLeft);

    if (newTimeLeft.isExpired && onExpire) {
      onExpire();
    }

    // Update every second
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire, mounted]);

  if (!targetDate) {
    return (
      <div className={styles.countdown}>
        <p className={styles.noDate}>Nessuna data di rivelazione impostata</p>
      </div>
    );
  }

  // Don't render time-dependent content until mounted on client
  if (!mounted || timeLeft === null) {
    return (
      <div className={styles.countdown}>
        <p className={styles.label}>Caricamento countdown...</p>
      </div>
    );
  }

  // At this point, timeLeft is guaranteed to be non-null
  const { days, hours, minutes, seconds, isExpired } = timeLeft;

  if (isExpired) {
    return (
      <div className={styles.countdown}>
        <p className={styles.expired}>🎉 I nomi sono stati rivelati!</p>
      </div>
    );
  }

  return (
    <div className={styles.countdown}>
      <p className={styles.label}>Rivelazione nomi tra:</p>
      <div className={styles.timeUnits}>
        <div className={styles.timeUnit}>
          <span className={styles.value}>{days}</span>
          <span className={styles.unit}>giorn{days === 1 ? "o" : "i"}</span>
        </div>
        <div className={styles.separator}>:</div>
        <div className={styles.timeUnit}>
          <span className={styles.value}>{String(hours).padStart(2, "0")}</span>
          <span className={styles.unit}>ore</span>
        </div>
        <div className={styles.separator}>:</div>
        <div className={styles.timeUnit}>
          <span className={styles.value}>
            {String(minutes).padStart(2, "0")}
          </span>
          <span className={styles.unit}>min</span>
        </div>
        <div className={styles.separator}>:</div>
        <div className={styles.timeUnit}>
          <span className={styles.value}>
            {String(seconds).padStart(2, "0")}
          </span>
          <span className={styles.unit}>sec</span>
        </div>
      </div>
      <p className={styles.revealDate}>
        Data rivelazione: {new Date(targetDate).toLocaleString("it-IT")}
      </p>
    </div>
  );
}
