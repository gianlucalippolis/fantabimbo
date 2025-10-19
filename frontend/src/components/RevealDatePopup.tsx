"use client";

import { useState, useEffect, FormEvent } from "react";
import type { AxiosError } from "axios";
import api from "../lib/axios";
import styles from "./RevealDatePopup.module.css";
import Button from "./Button";
import CalendarIcon from "./icons/CalendarIcon";
import ClockIcon from "./icons/ClockIcon";
import TrashIcon from "./icons/TrashIcon";
import SaveIcon from "./icons/SaveIcon";

interface RevealDatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (revealAt: string | null) => void;
  currentRevealAt: string | null;
  gameId: number;
}

function toDateInputValue(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function combineDateTime(dateStr: string, timeStr: string): string | null {
  if (!dateStr && !timeStr) return null;
  if (!dateStr || !timeStr) return null;

  const [year, month, day] = dateStr.split("-");
  const [hours, minutes] = timeStr.split(":");

  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes)
  );

  return date.toISOString();
}

export function RevealDatePopup({
  isOpen,
  onClose,
  onSuccess,
  currentRevealAt,
  gameId,
}: RevealDatePopupProps) {
  const [revealDate, setRevealDate] = useState<string>("");
  const [revealTime, setRevealTime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inizializza i campi con i valori attuali
  useEffect(() => {
    if (isOpen) {
      setRevealDate(toDateInputValue(currentRevealAt));
      setRevealTime(toTimeInputValue(currentRevealAt));
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentRevealAt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazione
    if (revealDate && !revealTime) {
      setError("Inserisci anche l'ora di rivelazione");
      return;
    }
    if (!revealDate && revealTime) {
      setError("Inserisci anche la data di rivelazione");
      return;
    }

    const revealAt = combineDateTime(revealDate, revealTime);

    // Verifica che la data sia futura
    if (revealAt && new Date(revealAt) <= new Date()) {
      setError("La data di rivelazione deve essere nel futuro");
      return;
    }

    try {
      setIsSaving(true);

      await api.put(`/api/games/${encodeURIComponent(gameId)}`, {
        data: {
          revealAt,
        },
      });

      // Mostra messaggio di successo
      setSuccessMessage("Data di rivelazione aggiornata con successo!");

      // Notifica il componente padre del successo
      onSuccess(revealAt);

      // Chiudi il popup dopo 1.5 secondi
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Failed to update reveal date", err);
      const axiosError = err as AxiosError<{ error?: { message?: string } }>;
      const errorMessage =
        axiosError.response?.data?.error?.message ??
        "Impossibile aggiornare la data di rivelazione. Riprova più tardi.";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setRevealDate("");
    setRevealTime("");
    setError(null);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Data di rivelazione</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.currentValue}>
            <span className={styles.label}>Attuale:</span>
            <span className={styles.value}>
              {currentRevealAt
                ? new Date(currentRevealAt).toLocaleString("it-IT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "Non impostata"}
            </span>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="reveal-date-popup" className={styles.inputLabel}>
              <CalendarIcon size={18} /> Data
            </label>
            <input
              id="reveal-date-popup"
              type="date"
              value={revealDate}
              onChange={(e) => setRevealDate(e.target.value)}
              className={styles.input}
              disabled={isSaving}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="reveal-time-popup" className={styles.inputLabel}>
              <ClockIcon size={18} /> Ora
            </label>
            <input
              id="reveal-time-popup"
              type="time"
              value={revealTime}
              onChange={(e) => setRevealTime(e.target.value)}
              className={styles.input}
              disabled={isSaving}
            />
          </div>

          {successMessage && (
            <div className={styles.success}>{successMessage}</div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClear}
              disabled={isSaving || (!revealDate && !revealTime)}
            >
              <TrashIcon size={18} /> Azzera
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={isSaving}
            >
              <SaveIcon size={18} /> Salva
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RevealDatePopup;
