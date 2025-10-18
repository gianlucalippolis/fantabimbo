"use client";

import { FormEvent, useState, Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type ISession from "../../types/session";
import styles from "./page.module.css";
import Popup from "../../components/Popup";
import Countdown from "../../components/Countdown";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useReduxHydration } from "../../hooks/useReduxHydration";
import {
  fetchNameSubmissions,
  fetchParentNames,
  saveNameSubmission,
} from "../../store/nameSubmissions";
import api from "../../lib/axios";

interface PopupState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
}

interface Game {
  id: number;
  attributes: {
    name: string;
    revealAt: string | null;
  };
}

function ListaNomiContent() {
  const { data: session } = useSession();
  const typedSession = session as ISession;
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");

  const dispatch = useAppDispatch();
  const { submissions, parentNames, hasParentSubmission, isLoading } =
    useAppSelector((state) => state.nameSubmissions);

  // Hook per hydration automatica del Redux store
  const { isLoading: isHydrating } = useReduxHydration();

  // Stato locale per i nomi (inizializzato dai dati Redux)
  const [names, setNames] = useState<string[]>(
    Array.from({ length: 10 }, () => "")
  );

  const [popup, setPopup] = useState<PopupState | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isRevealExpired, setIsRevealExpired] = useState(false);

  const isParent = typedSession?.userType === "parent";

  // Carica i dati del game
  useEffect(() => {
    async function loadGame() {
      if (!gameId) return;

      try {
        const response = await api.get(`/api/games/${gameId}`);
        setGame(response.data.data);

        // Check if reveal date has already passed
        if (response.data.data?.attributes?.revealAt) {
          const now = new Date();
          const revealDate = new Date(response.data.data.attributes.revealAt);
          setIsRevealExpired(now >= revealDate);
        }
      } catch (error) {
        console.error("Errore nel caricamento del game:", error);
      }
    }

    loadGame();
  }, [gameId]);

  // Carica i nomi del genitore per i giocatori
  useEffect(() => {
    async function loadParentNamesForPlayers() {
      if (!gameId || !typedSession || isParent) {
        return;
      }

      try {
        await dispatch(fetchParentNames({ gameId })).unwrap();
      } catch (error) {
        console.error("Errore nel caricamento dei nomi del genitore:", error);
      }
    }

    loadParentNamesForPlayers();
  }, [gameId, dispatch, isParent, typedSession]);

  // Carica i nomi esistenti quando il componente si monta
  useEffect(() => {
    async function loadExistingNames() {
      if (!gameId) {
        return;
      }

      try {
        await dispatch(
          fetchNameSubmissions({
            gameId,
          })
        ).unwrap();
      } catch (error) {
        console.error("Errore nel caricamento dei nomi:", error);
      }
    }

    loadExistingNames();
  }, [gameId, dispatch]);

  // Quando arrivano i dati da Redux, aggiorna lo stato locale
  useEffect(() => {
    // Se è un giocatore e ci sono i nomi del genitore, usa quelli come base
    if (!isParent && hasParentSubmission && parentNames.length > 0) {
      // Se il giocatore ha già una submission, caricala
      if (submissions.length > 0) {
        let loadedNames = submissions[0].attributes?.names;
        if (!loadedNames) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          loadedNames = (submissions[0] as any).names;
        }

        if (loadedNames && Array.isArray(loadedNames)) {
          const fullNames = Array.from(
            { length: 10 },
            (_, index) => loadedNames[index] || ""
          );
          setNames(fullNames);
          console.log("Giocatore - nomi submission caricati:", fullNames);
          return;
        }
      }

      // Altrimenti usa i nomi del genitore (shuffled)
      const fullNames = Array.from(
        { length: 10 },
        (_, index) => parentNames[index] || ""
      );
      setNames(fullNames);
      console.log(
        "Giocatore - nomi del genitore (shuffled) caricati:",
        fullNames
      );
    }
    // Se è il genitore, carica la sua submission
    else if (isParent && submissions.length > 0) {
      let loadedNames = submissions[0].attributes?.names;
      if (!loadedNames) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        loadedNames = (submissions[0] as any).names;
      }

      console.log("Genitore - loaded names:", loadedNames);

      if (loadedNames && Array.isArray(loadedNames)) {
        const fullNames = Array.from(
          { length: 10 },
          (_, index) => loadedNames[index] || ""
        );
        setNames(fullNames);
        console.log("Genitore - nomi caricati e impostati:", fullNames);
      }
    }
  }, [submissions, parentNames, hasParentSubmission, isParent]);

  function handleNameChange(index: number, value: string): void {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  }

  function swapPositions(from: number, to: number): void {
    if (to < 0 || to >= names.length) return;
    const newNames = [...names];
    [newNames[from], newNames[to]] = [newNames[to], newNames[from]];
    setNames(newNames);
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

    const filteredNames = names.filter(
      (name: string) => name.trim().length > 0
    );

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
      const result = await dispatch(
        saveNameSubmission({
          gameId,
          names: names,
          submitterType: isParent ? "parent" : "participant",
        })
      ).unwrap();

      console.log("Save successful, result:", result);

      setPopup({
        isVisible: true,
        type: "success",
        title: "Successo!",
        message: "Lista salvata con successo!",
      });
    } catch (error) {
      console.error("Errore catturato nel catch:", error);
      console.error("Error type:", typeof error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Extract error message - it's the payload from rejectWithValue
      const errorMessage =
        typeof error === "string" ? error : "Impossibile salvare la lista.";

      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: errorMessage,
      });
    }
  }

  if (!gameId) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Errore - ID partita mancante</h1>
            <button
              className={styles.errorButton}
              onClick={() => router.push("/")}
            >
              Torna alla dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while hydrating Redux store
  if (isHydrating) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.errorState}>
            <p>Caricamento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <button className={styles.backButton} onClick={() => router.push("/")}>
          ← Torna alla dashboard
        </button>

        <h1 className={styles.title}>
          {isParent ? "Le tue preferenze" : "Riordina i nomi"}
        </h1>

        {!isParent && (
          <div className={styles.infoBox}>
            💡 <strong>Istruzioni:</strong> Riordina i nomi dal 1° al 10° posto
            secondo la tua previsione. Il genitore ha inserito questi nomi, ma
            tu li vedi in ordine casuale. Cerca di indovinare quale sarà il nome
            scelto (1° posto)!
          </div>
        )}

        {isParent && (
          <div className={styles.infoBox}>
            💡 <strong>Info:</strong> Inserisci i tuoi 10 nomi preferiti in
            ordine. Il <strong>primo nome</strong> della lista sarà quello
            scelto per il bambino!
          </div>
        )}

        {game?.attributes?.revealAt && (
          <Countdown
            targetDate={game.attributes.revealAt}
            gameId={game.id}
            onExpire={() => setIsRevealExpired(true)}
          />
        )}

        {isRevealExpired && (
          <div className={styles.warningBox}>
            ⚠️ La data di rivelazione è scaduta. Non è più possibile modificare
            i nomi.
          </div>
        )}

        {!isParent &&
          !hasParentSubmission &&
          parentNames.length === 0 &&
          !isLoading && (
            <div className={styles.warningBox}>
              ⚠️ Il genitore non ha ancora inserito i nomi. Torna più tardi!
            </div>
          )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.namesList}>
            {names.map((name: string, index: number) => (
              <div key={index} className={styles.nameItem}>
                <span className={styles.positionLabel}>
                  {index + 1}° posizione
                </span>

                <input
                  className={styles.nameInput}
                  type="text"
                  value={name}
                  placeholder={`Nome #${index + 1}`}
                  onChange={(event) =>
                    handleNameChange(index, event.target.value)
                  }
                  disabled={!isParent && hasParentSubmission}
                  readOnly={!isParent && hasParentSubmission}
                />

                <div className={styles.controls}>
                  <button
                    className={styles.controlButton}
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Sposta su"
                  >
                    ↑
                  </button>
                  <button
                    className={styles.controlButton}
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === names.length - 1}
                    title="Sposta giù"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isLoading || isRevealExpired}
            title={isRevealExpired ? "La data di rivelazione è scaduta" : ""}
          >
            {isLoading
              ? "Salvataggio..."
              : isRevealExpired
              ? "Modifiche non consentite"
              : "Salva la lista"}
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

// Loading component per Suspense
function LoadingListaNomi() {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.errorState}>
          <p>Caricamento...</p>
        </div>
      </div>
    </div>
  );
}

// Componente principale con Suspense boundary
export default function ListaNomiPage() {
  return (
    <Suspense fallback={<LoadingListaNomi />}>
      <ListaNomiContent />
    </Suspense>
  );
}
