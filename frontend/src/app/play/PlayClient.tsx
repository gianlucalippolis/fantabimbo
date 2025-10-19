"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import Popup from "../../components/Popup";
import LoadingScreen from "../../components/LoadingScreen";
import BackIcon from "../../components/icons/BackIcon";
import { Button } from "../../components/Button";
import InfoBox from "../../components/InfoBox";
import { useAuth } from "../../providers/AuthProvider";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import api from "../../lib/axios";
import { saveNameSubmission } from "../../store/nameSubmissions";

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
    allNames?: string[] | null;
    selectedNames?: string[] | null;
  };
}

function GiocaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");
  const dispatch = useAppDispatch();

  const { isLoading: isHydrating } = useAuth();
  const userProfile = useAppSelector((state) => state.user.profile);

  const [currentStep, setCurrentStep] = useState(1); // 1: seleziona 5, 2: ordina 5
  const [allNames, setAllNames] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFetchedGame = useRef(false);
  const hasFetchedSubmission = useRef(false);

  const isPlayer = userProfile?.userType === "player";

  // Carica i dati del game
  useEffect(() => {
    async function loadGame() {
      if (!gameId || hasFetchedGame.current) return;

      hasFetchedGame.current = true;
      try {
        const response = await api.get(`/api/games/${gameId}`);
        const gameData = response.data.data;
        setGame(gameData);

        // Carica i 12 nomi del genitore
        if (gameData?.attributes?.allNames) {
          setAllNames(gameData.attributes.allNames);
        } else {
          setPopup({
            isVisible: true,
            type: "warning",
            title: "Attenzione",
            message:
              "Il genitore non ha ancora inserito i nomi. Torna più tardi!",
          });
        }
      } catch (error) {
        console.error("Errore nel caricamento del game:", error);
        setPopup({
          isVisible: true,
          type: "error",
          title: "Errore",
          message: "Impossibile caricare i dati della partita.",
        });
      } finally {
        setIsLoadingData(false);
      }
    }

    loadGame();
  }, [gameId]);

  // Carica la submission del giocatore se esiste
  useEffect(() => {
    async function loadSubmission() {
      if (!gameId || hasFetchedSubmission.current || !userProfile) return;

      hasFetchedSubmission.current = true;
      try {
        const response = await api.get(
          `/api/name-submissions?filters[game][id][$eq]=${gameId}&filters[submitter][id][$eq]=${userProfile.id}&populate=*`
        );

        if (response.data?.data && response.data.data.length > 0) {
          const submission = response.data.data[0];
          const savedNames = submission.attributes?.names || submission.names;

          if (
            savedNames &&
            Array.isArray(savedNames) &&
            savedNames.length === 5
          ) {
            // Il giocatore ha già salvato i suoi 5 nomi ordinati
            setOrderedNames(savedNames);
            setCurrentStep(2);
          }
        }
      } catch (error) {
        console.error("Errore nel caricamento della submission:", error);
      }
    }

    loadSubmission();
  }, [gameId, userProfile]);

  // Redirect se non è giocatore
  useEffect(() => {
    if (!isHydrating && userProfile && !isPlayer) {
      router.push("/");
    }
  }, [isHydrating, userProfile, isPlayer, router]);

  function toggleNameSelection(index: number): void {
    if (selectedIndexes.includes(index)) {
      setSelectedIndexes(selectedIndexes.filter((i) => i !== index));
    } else {
      if (selectedIndexes.length < 5) {
        setSelectedIndexes([...selectedIndexes, index]);
      }
    }
  }

  function handleConfirmSelection() {
    if (selectedIndexes.length !== 5) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi selezionare esattamente 5 nomi.",
      });
      return;
    }

    // Crea l'array ordinato con i nomi selezionati
    const selected = selectedIndexes.map((index) => allNames[index]);
    setOrderedNames(selected);
    setCurrentStep(2);
  }

  function moveNameInOrder(fromIndex: number, toIndex: number): void {
    if (toIndex < 0 || toIndex >= orderedNames.length) return;
    const newOrdered = [...orderedNames];
    [newOrdered[fromIndex], newOrdered[toIndex]] = [
      newOrdered[toIndex],
      newOrdered[fromIndex],
    ];
    setOrderedNames(newOrdered);
  }

  async function handleSaveFinal() {
    if (orderedNames.length !== 5) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi ordinare tutti i 5 nomi prima di salvare.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await dispatch(
        saveNameSubmission({
          gameId: gameId!,
          names: orderedNames,
          submitterType: "participant",
        })
      ).unwrap();

      setPopup({
        isVisible: true,
        type: "success",
        title: "Completato!",
        message: "La tua previsione è stata salvata con successo!",
      });

      // Torna alla dashboard dopo 2 secondi
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: "Impossibile salvare la previsione. Riprova.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleClosePopup(): void {
    setPopup(null);
  }

  if (!gameId) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className={styles.errorState}>
            <h1 className={styles.errorTitle}>Errore - ID partita mancante</h1>
            <Button variant="tertiary" onClick={() => router.push("/")}>
              <BackIcon size={20} /> Torna alla dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isHydrating || isLoadingData) {
    return <LoadingScreen />;
  }

  if (!isPlayer) {
    return <LoadingScreen />;
  }

  if (allNames.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <Button
            variant="tertiary"
            onClick={() => router.push("/")}
            className={styles.backButton}
          >
            <BackIcon size={20} /> Torna alla dashboard
          </Button>
          <InfoBox variant="warning">
            Il genitore non ha ancora inserito i 12 nomi. Torna più tardi!
          </InfoBox>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Button
          variant="tertiary"
          onClick={() => {
            setIsNavigating(true);
            router.push("/");
          }}
          isLoading={isNavigating}
          className={styles.backButton}
        >
          <BackIcon size={20} /> Torna alla dashboard
        </Button>

        <h1 className={styles.title}>Gioca - {game?.attributes?.name}</h1>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          <div
            className={`${styles.step} ${
              currentStep >= 1 ? styles.active : ""
            }`}
          >
            1. Seleziona 5 nomi
          </div>
          <div
            className={`${styles.step} ${
              currentStep >= 2 ? styles.active : ""
            }`}
          >
            2. Ordina i 5 nomi
          </div>
        </div>

        {/* Step 1: Seleziona 5 nomi */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <InfoBox variant="info">
              <strong>Step 1:</strong> Il genitore ha scelto 12 nomi possibili.
              Seleziona i 5 nomi che pensi siano i suoi preferiti. Clicca su un
              nome per selezionarlo.
            </InfoBox>

            <div className={styles.selectionInfo}>
              Selezionati: {selectedIndexes.length} / 5
            </div>

            <div className={styles.selectionGrid}>
              {allNames.map((name, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.selectionCard} ${
                    selectedIndexes.includes(index) ? styles.selected : ""
                  }`}
                  onClick={() => toggleNameSelection(index)}
                  disabled={
                    !selectedIndexes.includes(index) &&
                    selectedIndexes.length >= 5
                  }
                >
                  {name}
                  {selectedIndexes.includes(index) && (
                    <span className={styles.selectedBadge}>✓</span>
                  )}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleConfirmSelection}
              disabled={selectedIndexes.length !== 5}
              className={styles.submitButton}
            >
              Conferma selezione
            </Button>
          </div>
        )}

        {/* Step 2: Ordina i 5 nomi */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <InfoBox variant="info">
              <strong>Step 2:</strong> Ora ordina i 5 nomi che hai selezionato
              dal più probabile (1°) al meno probabile (5°). Cerca di indovinare
              quale sarà il nome scelto!
            </InfoBox>

            <div className={styles.orderList}>
              {orderedNames.map((name, index) => (
                <div key={index} className={styles.orderItem}>
                  <div className={styles.orderControls}>
                    <Button
                      variant="secondary"
                      onClick={() => moveNameInOrder(index, index - 1)}
                      disabled={index === 0}
                      title="Sposta su"
                      className={styles.orderButton}
                    >
                      ▲
                    </Button>
                    <span className={styles.orderPosition}>{index + 1}°</span>
                    <Button
                      variant="secondary"
                      onClick={() => moveNameInOrder(index, index + 1)}
                      disabled={index === orderedNames.length - 1}
                      title="Sposta giù"
                      className={styles.orderButton}
                    >
                      ▼
                    </Button>
                  </div>
                  <div className={styles.orderName}>{name}</div>
                </div>
              ))}
            </div>

            <div className={styles.stepButtons}>
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrentStep(1);
                  setOrderedNames([]);
                }}
              >
                Indietro
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveFinal}
                isLoading={isSaving}
              >
                Salva la mia previsione
              </Button>
            </div>
          </div>
        )}

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

// Componente principale con Suspense boundary
export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GiocaContent />
    </Suspense>
  );
}
