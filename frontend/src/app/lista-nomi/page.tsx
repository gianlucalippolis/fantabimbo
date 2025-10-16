"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AxiosError } from "axios";
import type ISession from "types/session";
import type {
  NameSubmission,
  NameSubmissionFormData,
  VictoryResult,
} from "types/nameSubmission";
import api from "../../lib/axios";
import styles from "../../styles/Login.module.css";

const MAX_NAMES = 10;

function buildInitialNames(): string[] {
  return Array.from({ length: MAX_NAMES }, () => "");
}

export default function ListaNomiPage() {
  const { data: session } = useSession();
  const typedSession = session as ISession | null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");

  const [names, setNames] = useState<string[]>(() => buildInitialNames());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isParent = typedSession?.userType === "parent";

  function handleNameChange(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setError(null);
  }

  function swapPositions(from: number, to: number) {
    if (to < 0 || to >= names.length) {
      return;
    }

    setNames((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function handleMoveUp(index: number) {
    swapPositions(index, index - 1);
  }

  function handleMoveDown(index: number) {
    swapPositions(index, index + 1);
  }

  function handleReset() {
    setNames(buildInitialNames());
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!gameId) {
      setError("ID partita mancante.");
      return;
    }

    if (isLoading) return;

    const filteredNames = names.filter((name) => name.trim().length > 0);

    if (filteredNames.length === 0) {
      setError("Inserisci almeno un nome.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const submissionData: NameSubmissionFormData = {
        names: filteredNames,
        submitterType: isParent ? "parent" : "participant",
        isParentPreference: false,
      };

      await api.post("/api/name-submissions", {
        data: {
          gameId: Number(gameId),
          ...submissionData,
        },
      });

      alert("Lista salvata con successo!");
    } catch (error) {
      console.error("Submission failed", error);
      const err = error as AxiosError<{ error?: { message?: string } }>;
      setError(
        err.response?.data?.error?.message ||
          "Impossibile salvare la lista. Riprova più tardi."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!gameId) {
    return (
      <div className={styles.login}>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <h1 className={styles.title}>Errore</h1>
            <p className={styles.subtitle}>
              ID partita mancante. Torna alla dashboard e seleziona una partita.
            </p>
          </div>
          <button
            type="button"
            className={styles.button}
            onClick={() => router.push("/")}
          >
            Torna alla dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push("/")}
        >
          ← Torna alla dashboard
        </button>

        <div className={styles.header}>
          <h1 className={styles.title}>
            {isParent ? "Le tue preferenze" : "I tuoi tentativi"}
          </h1>
          <p className={styles.subtitle}>
            {isParent
              ? `Inserisci fino a ${MAX_NAMES} nomi e ordina la lista secondo la tua preferenza.`
              : `Prova a indovinare i nomi preferiti! Inserisci fino a ${MAX_NAMES} nomi in ordine di preferenza.`}
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <span>Classifica dei nomi</span>
              <button
                type="button"
                className={styles.helperLink}
                onClick={handleReset}
              >
                Svuota tutto
              </button>
            </div>
            <div className={styles.notice}>
              <p className={styles.noticeInfo}>
                Usa le frecce per spostare i nomi e mantenere l'ordine di
                preferenza. Puoi modificare i nomi in qualsiasi momento prima di
                salvare.
              </p>
            </div>
          </div>

          <div>
            {names.map((name, index) => (
              <div key={index} className={styles.var}>
                <div className={styles.labelRow}>
                  <span className={styles.noticeText}>
                    {index + 1}. posizione
                  </span>
                  <div className={styles.orderControls}>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label={`Sposta il nome ${index + 1} verso l'alto`}
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                    <button
                      type="button"
                      className={styles.orderButton}
                      onClick={() => handleMoveDown(index)}
                      disabled={index === names.length - 1}
                      aria-label={`Sposta il nome ${index + 1} verso il basso`}
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  className={styles.input}
                  value={name}
                  placeholder={`Nome #${index + 1}`}
                  onChange={(event) =>
                    handleNameChange(index, event.target.value)
                  }
                />
              </div>
            ))}
          </div>

          {error && (
            <div className={styles.notice} style={{ color: "red" }}>
              <p className={styles.noticeText}>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.button}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Salvataggio..." : "Salva la lista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
