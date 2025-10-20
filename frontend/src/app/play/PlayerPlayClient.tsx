"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Popup from "../../components/Popup";
import BackIcon from "../../components/icons/BackIcon";
import { Button } from "../../components/Button";
import { useAuth } from "../../providers/AuthProvider";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  saveNameSubmission,
  fetchNameSubmissions,
} from "../../store/nameSubmissions";
import api from "../../lib/axios";
import NameSelector from "./NameSelector";

interface PopupState {
  isVisible: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
}

interface Game {
  id: number;
  name: string;
  revealAt: string | null;
  allNames?: string[] | null;
  selectedCount?: number;
}

interface PlayerPlayClientProps {
  gameId: string;
}

export default function PlayerPlayClient({ gameId }: PlayerPlayClientProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { isLoading: isHydrating } = useAuth();
  const userProfile = useAppSelector((state) => state.user.profile);

  const [currentStep, setCurrentStep] = useState(1); // 1: seleziona N, 2: ordina N
  const [allNames, setAllNames] = useState<string[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  const [selectedCount, setSelectedCount] = useState<number>(5);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFetchedGame = useRef(false);

  // Carica i dati del game
  useEffect(() => {
    async function loadGame() {
      if (!gameId || hasFetchedGame.current) return;

      hasFetchedGame.current = true;
      try {
        const response = await api.get(`/api/games/${gameId}`);
        const gameData = response.data.data;
        setGame(gameData);

        // Carica i nomi per il giocatore (senza dati sensibili)
        if (gameData?.allNames) {
          setAllNames(gameData.allNames);
          setSelectedCount(gameData.selectedCount || 5);

          // Carica eventuali submission esistenti del giocatore
          try {
            const submissionResponse = await dispatch(
              fetchNameSubmissions({ gameId })
            ).unwrap();

            if (
              submissionResponse.userNames &&
              submissionResponse.userNames.length > 0
            ) {
              // Il giocatore ha già fatto una submission, precarica i dati
              const existingNames = submissionResponse.userNames;
              setOrderedNames(existingNames);
              setCurrentStep(2); // Vai direttamente allo step di ordinamento

              // Preseleziona anche gli indici per lo step 1 (nel caso voglia tornare indietro)
              const selectedIdx: number[] = [];
              existingNames.forEach((selectedName: string) => {
                const index = gameData.allNames?.findIndex(
                  (name: string) => name === selectedName
                );
                if (index !== undefined && index >= 0) {
                  selectedIdx.push(index);
                }
              });
              setSelectedIndexes(selectedIdx);
            }
          } catch {
            // Se non ci sono submission esistenti, non è un errore
            console.log("Nessuna submission esistente trovata");
          }
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
  }, [gameId, dispatch]);

  // Redirect se non è giocatore
  useEffect(() => {
    if (!isHydrating && userProfile && userProfile.userType !== "player") {
      router.push("/");
    }
  }, [isHydrating, userProfile, router]);

  function handleClosePopup(): void {
    setPopup(null);
  }

  function handleGoBack(): void {
    setIsNavigating(true);
    router.push("/");
  }

  function toggleNameSelection(index: number): void {
    if (selectedIndexes.includes(index)) {
      setSelectedIndexes(selectedIndexes.filter((i) => i !== index));
    } else {
      if (selectedIndexes.length < selectedCount) {
        setSelectedIndexes([...selectedIndexes, index]);
      }
    }
  }

  function handleConfirmSelection() {
    if (selectedIndexes.length !== selectedCount) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: `Devi selezionare esattamente ${selectedCount} nomi.`,
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

  function handleRestart(): void {
    // Resetta tutto e torna al primo step
    setCurrentStep(1);
    setSelectedIndexes([]);
    setOrderedNames([]);
  }

  async function handleSaveFinal() {
    if (orderedNames.length !== selectedCount) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: `Devi ordinare tutti i ${selectedCount} nomi prima di salvare.`,
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
        message: "Impossibile salvare la previsione. Riprova più tardi.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isHydrating || isLoadingData) {
    return (
      <div className={styles.container}>
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <Button
          variant="secondary"
          onClick={handleGoBack}
          isLoading={isNavigating}
          className={styles.backButton}
        >
          <BackIcon size={20} /> Torna alla dashboard
        </Button>

        <h1 className={styles.title}>Gioca - {game?.name}</h1>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          <div
            className={`${styles.step} ${
              currentStep >= 1 ? styles.active : ""
            }`}
          >
            1. Seleziona {selectedCount} nomi
          </div>
          <div
            className={`${styles.step} ${
              currentStep >= 2 ? styles.active : ""
            }`}
          >
            2. Ordina i {selectedCount} nomi
          </div>
        </div>

        <NameSelector
          allNames={allNames}
          selectedIndexes={selectedIndexes}
          selectedCount={selectedCount}
          orderedNames={orderedNames}
          currentStep={currentStep}
          isParent={false}
          onToggleNameSelection={toggleNameSelection}
          onConfirmSelection={handleConfirmSelection}
          onMoveNameInOrder={moveNameInOrder}
          onBackToSelection={() => {
            setCurrentStep(1);
            setOrderedNames([]);
          }}
          onFinalSave={handleSaveFinal}
          onRestart={handleRestart}
          isSaving={isSaving}
        />

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
