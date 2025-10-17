"use client";

import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type ISession from "../../types/session";
import api from "../../lib/axios";
import styles from "../../styles/Login.module.css";
import Popup from "../../components/Popup";

interface PopupState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
}

const MAX_NAMES = 10;

function buildInitialNames(): string[] {
  return Array.from({ length: MAX_NAMES }, () => "");
}

export default function ListaNomiPage() {
  const { data: session } = useSession();
  const typedSession = session as ISession;
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");

  const [names, setNames] = useState<string[]>(() => buildInitialNames());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const isParent = typedSession?.userType === "parent";

  function handleNameChange(index: number, value: string): void {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function swapPositions(from: number, to: number): void {
    if (to < 0 || to >= names.length) return;
    setNames((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function handleMoveUp(index: number): void {
    swapPositions(index, index - 1);
  }

  function handleMoveDown(index: number): void {
    swapPositions(index, index + 1);
  }

  function handleClosePopup(): void {
    setPopup(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (!gameId) {
      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: "ID partita mancante.",
      });
      return;
    }

    const filteredNames = names.filter((name) => name.trim().length > 0);

    if (filteredNames.length === 0) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Inserisci almeno un nome prima di salvare.",
      });
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);

      await api.post("/api/name-submissions", {
        data: {
          gameId: Number(gameId),
          names: filteredNames,
          submitterType: isParent ? "parent" : "participant",
          isParentPreference: false,
        },
      });

      setPopup({
        isVisible: true,
        type: "success",
        title: "Successo!",
        message: "Lista salvata con successo!",
      });
    } catch {
      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: "Impossibile salvare la lista.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!gameId) {
    return (
      <div className={styles.login}>
        <div className={styles.wrapper}>
          <h1>Errore - ID partita mancante</h1>
          <button onClick={() => router.push("/")}>Torna alla dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <button onClick={() => router.push("/")}>← Torna alla dashboard</button>

        <h1>{isParent ? "Le tue preferenze" : "I tuoi tentativi"}</h1>

        <form onSubmit={handleSubmit}>
          <div>
            {names.map((name, index) => (
              <div key={index}>
                <span>{index + 1}. posizione</span>
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === names.length - 1}
                >
                  ↓
                </button>
                <input
                  type="text"
                  value={name}
                  placeholder={"Nome #" + (index + 1)}
                  onChange={(event) =>
                    handleNameChange(index, event.target.value)
                  }
                />
              </div>
            ))}
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Salvataggio..." : "Salva la lista"}
          </button>
        </form>

        {popup && (
          <Popup
            isVisible={popup.isVisible}
            type={popup.type}
            title={popup.title}
            message={popup.message}
            onClose={handleClosePopup}
          />
        )}
      </div>
    </div>
  );
}
