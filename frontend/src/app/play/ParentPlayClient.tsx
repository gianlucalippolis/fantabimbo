"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Popup from "../../components/Popup";
import BackIcon from "../../components/icons/BackIcon";
import { Button } from "../../components/Button";
import { useAuth } from "../../providers/AuthProvider";
import { useAppSelector } from "../../store/hooks";
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
  selectedNames?: string[] | null;
  selectedCount?: number;
}

interface ParentPlayClientProps {
  gameId: string;
}

export default function ParentPlayClient({ gameId }: ParentPlayClientProps) {
  const router = useRouter();

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

        // Carica tutti i dati del genitore
        if (gameData?.allNames) {
          setAllNames(gameData.allNames);
          setSelectedCount(gameData.selectedNames?.length || 5);

          // Se ha già fatto le selezioni, precarica i dati
          if (gameData.selectedNames && gameData.selectedNames.length > 0) {
            setOrderedNames(gameData.selectedNames);
            setCurrentStep(2); // Vai direttamente allo step di ordinamento

            // Preseleziona anche gli indici per lo step 1
            const selectedIdx: number[] = [];
            gameData.selectedNames.forEach((selectedName: string) => {
              const index = gameData.allNames?.findIndex(
                (name: string) => name === selectedName
              );
              if (index !== undefined && index >= 0) {
                selectedIdx.push(index);
              }
            });
            setSelectedIndexes(selectedIdx);
          }
        } else {
          setPopup({
            isVisible: true,
            type: "warning",
            title: "Attenzione",
            message:
              "Devi prima completare l'inserimento dei 12 nomi nella sezione setup!",
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
  }, [gameId, userProfile?.id]);

  // Redirect se non è genitore
  useEffect(() => {
    if (!isHydrating && userProfile && userProfile.userType !== "parent") {
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
      // Il genitore può selezionare quanti nomi vuole
      setSelectedIndexes([...selectedIndexes, index]);
    }
  }

  function handleConfirmSelection() {
    if (selectedIndexes.length === 0) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi selezionare almeno un nome.",
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
    if (orderedNames.length === 0) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi ordinare almeno un nome prima di salvare.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Salva le preferenze del genitore nel game
      await api.put(`/api/games/${gameId}`, {
        data: {
          selectedNames: orderedNames,
        },
      });

      setPopup({
        isVisible: true,
        type: "success",
        title: "Completato!",
        message: "Le tue preferenze sono state salvate con successo!",
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
        message: "Impossibile salvare le preferenze. Riprova più tardi.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isHydrating || isLoadingData) {
    return (
      <div className={styles.loadingContainer}>
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

        <h1 className={styles.title}>Modifica selezione - {game?.name}</h1>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          <div
            className={`${styles.step} ${
              currentStep >= 1 ? styles.active : ""
            }`}
          >
            1. Seleziona i nomi
          </div>
          <div
            className={`${styles.step} ${
              currentStep >= 2 ? styles.active : ""
            }`}
          >
            2. Ordina i nomi
          </div>
        </div>

        <NameSelector
          allNames={allNames}
          selectedIndexes={selectedIndexes}
          selectedCount={selectedCount}
          orderedNames={orderedNames}
          currentStep={currentStep}
          isParent={true}
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
