"use client";

import type { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GameSummary } from "types/game";
import api from "../lib/axios";
import styles from "../app/partite/[id]/page.module.css";

interface GameDetailClientProps {
  game: GameSummary;
}

function toDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }
  return date.toISOString().split("T")[0] ?? "";
}

function toTimeInputValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }
  const iso = date.toISOString();
  const [, timePart] = iso.split("T");
  return timePart ? timePart.slice(0, 5) : "";
}

function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) {
    return null;
  }
  const candidate = new Date(`${date}T${time}`);
  if (Number.isNaN(candidate.valueOf())) {
    return null;
  }
  return candidate.toISOString();
}

export function GameDetailClient({ game }: GameDetailClientProps) {
  const [revealDate, setRevealDate] = useState<string>(() =>
    toDateInputValue(game.revealAt)
  );
  const [revealTime, setRevealTime] = useState<string>(() =>
    toTimeInputValue(game.revealAt)
  );
  const [currentReveal, setCurrentReveal] = useState<string | null>(
    game.revealAt ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setSaveMessage(null);
    setSaveError(null);
  }, [revealDate, revealTime]);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }
    const timeout = setTimeout(() => setSaveMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [saveMessage]);

  useEffect(() => {
    setCurrentReveal(game.revealAt ?? null);
    setRevealDate(toDateInputValue(game.revealAt));
    setRevealTime(toTimeInputValue(game.revealAt));
  }, [game.revealAt]);

  const participants = useMemo(
    () => (Array.isArray(game.participants) ? game.participants : []),
    [game.participants]
  );

  const currentRevealLabel = useMemo(() => {
    if (!currentReveal) {
      return "Nessuna data impostata";
    }
    const formatted = new Date(currentReveal);
    if (Number.isNaN(formatted.valueOf())) {
      return "Nessuna data impostata";
    }
    return formatted.toLocaleString();
  }, [currentReveal]);

  async function handleSave() {
    if (!game.isOwner) {
      return;
    }

    const revealAt = combineDateTime(revealDate, revealTime);

    try {
      setIsSaving(true);
      setSaveMessage(null);
      setSaveError(null);

      await api.put(`/api/games/${encodeURIComponent(game.id)}`, {
        data: {
          revealAt,
        },
      });

      setSaveMessage("Impostazioni aggiornate!");
      setCurrentReveal(revealAt);
    } catch (error) {
      console.error("Failed to update reveal date", error);
      const err = error as AxiosError<{ error?: { message?: string } }>;
      setSaveError(
        err.response?.data?.error?.message ??
          "Impossibile aggiornare la data di rivelazione. Riprova più tardi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Link className={styles.backLink} href="/">
            ← Torna alla dashboard
          </Link>
          <h1 className={styles.title}>{game.name}</h1>
          <p className={styles.subtitle}>
            Organizzata da{" "}
            <strong>
              {game.owner?.firstName || game.owner?.lastName
                ? [game.owner?.firstName, game.owner?.lastName]
                    .filter(Boolean)
                    .join(" ")
                : game.owner?.email || "Genitore"}
            </strong>
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data di rivelazione</h2>
          <p className={styles.currentReveal}>Attuale: {currentRevealLabel}</p>
          <div className={styles.revealForm}>
            <label htmlFor="reveal-date">Data</label>
            <input
              id="reveal-date"
              type="date"
              value={revealDate}
              onChange={(event) => setRevealDate(event.target.value)}
              disabled={!game.isOwner}
            />
            <label htmlFor="reveal-time">Ora</label>
            <input
              id="reveal-time"
              type="time"
              value={revealTime}
              onChange={(event) => setRevealTime(event.target.value)}
              disabled={!game.isOwner}
            />
            {game.isOwner ? (
              <div className={styles.revealActions}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Salvataggio…" : "Salva impostazioni"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={() => {
                    setRevealDate("");
                    setRevealTime("");
                  }}
                  disabled={isSaving}
                >
                  Azzera data
                </button>
              </div>
            ) : null}
            {saveMessage ? (
              <p className={styles.successMessage}>{saveMessage}</p>
            ) : null}
            {saveError ? (
              <p className={styles.errorMessage}>{saveError}</p>
            ) : null}
            {!game.isOwner ? (
              <p className={styles.noticeInfo}>
                Solo l'organizzatore può modificare la data di rivelazione.
              </p>
            ) : null}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Giocatori iscritti</h2>
          {participants.length === 0 ? (
            <p className={styles.emptyState}>
              Nessun partecipante ha ancora aderito a questa partita.
            </p>
          ) : (
            <ul className={styles.participantList}>
              {participants.map((participant) => {
                const displayName = [
                  participant.firstName,
                  participant.lastName,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={participant.id} className={styles.participantItem}>
                    <span className={styles.participantName}>
                      {displayName || participant.email || "Partecipante"}
                    </span>
                    <span className={styles.participantRole}>
                      {participant.userType === "parent"
                        ? "Genitore"
                        : "Giocatore"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className={styles.footer}>
          <Link
            className={styles.primaryAction}
            href={`/lista-nomi?game=${encodeURIComponent(game.id)}`}
          >
            La tua lista dei nomi
          </Link>
        </footer>
      </div>
    </div>
  );
}
