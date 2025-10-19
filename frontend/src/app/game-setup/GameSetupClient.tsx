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
import { useAppSelector } from "../../store/hooks";
import api from "../../lib/axios";

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
}

function SetupGiocoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");

  const { isLoading: isHydrating } = useAuth();
  const userProfile = useAppSelector((state) => state.user.profile);

  const [currentStep, setCurrentStep] = useState(1); // 1: inserisci tutti i nomi, 2: seleziona preferiti, 3: ordina selezionati
  const [allNames, setAllNames] = useState<string[]>(
    Array.from({ length: 12 }, () => "")
  );
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [orderedNames, setOrderedNames] = useState<string[]>([]); // Nomi selezionati e ordinati dal genitore
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasFetchedGame = useRef(false);

  const isParent = userProfile?.userType === "parent";

  // Carica i dati del game
  useEffect(() => {
    async function loadGame() {
      if (!gameId || hasFetchedGame.current) return;

      hasFetchedGame.current = true;
      try {
        const response = await api.get(`/api/games/${gameId}`);
        const gameData = response.data.data;
        setGame(gameData);

        console.log("🔍 Dati caricati dal backend:", {
          allNames: gameData?.allNames,
          selectedNames: gameData?.selectedNames,
        });

        // Se ci sono già dati salvati, caricali
        if (gameData?.allNames) {
          const loadedNames = Array.from(
            { length: 12 },
            (_, i) => gameData.allNames[i] || ""
          );
          console.log("📝 Nomi caricati nello stato:", loadedNames);
          setAllNames(loadedNames);
        }

        if (gameData?.selectedNames && gameData.selectedNames.length > 0) {
          // Carica i nomi selezionati e ordinati
          setOrderedNames(gameData.selectedNames);

          // Ripristina anche gli indici selezionati per lo step 2
          const selectedIndices: number[] = [];
          gameData.selectedNames.forEach((selectedName: string) => {
            const index = gameData.allNames?.findIndex(
              (name: string) => name === selectedName
            );
            if (index !== undefined && index !== -1) {
              selectedIndices.push(index);
            }
          });
          setSelectedIndexes(selectedIndices);

          // Se ci sono già i nomi selezionati ordinati salvati, vai direttamente allo step 3
          setCurrentStep(3);
        } else if (
          gameData?.allNames &&
          gameData.allNames.filter((n: string) => n).length === 12
        ) {
          // Se ci sono già tutti i nomi inseriti, vai allo step 2
          setCurrentStep(2);
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

  // Redirect se non è genitore
  useEffect(() => {
    if (!isHydrating && userProfile && !isParent) {
      router.push("/");
    }
  }, [isHydrating, userProfile, isParent, router]);

  function handleNameChange(index: number, value: string): void {
    const newNames = [...allNames];
    newNames[index] = value;
    setAllNames(newNames);
  }

  function toggleNameSelection(index: number): void {
    if (selectedIndexes.includes(index)) {
      // Rimuovi dalla selezione
      setSelectedIndexes(selectedIndexes.filter((i) => i !== index));
    } else {
      // Aggiungi alla selezione (max 10)
      if (selectedIndexes.length < 10) {
        setSelectedIndexes([...selectedIndexes, index]);
      }
    }
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

  function handleClosePopup(): void {
    setPopup(null);
  }

  async function handleSaveStep1() {
    const filteredNames = allNames.filter((name) => name.trim().length > 0);

    if (filteredNames.length < 12) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi inserire tutti i 12 nomi prima di procedere.",
      });
      return;
    }

    console.log("💾 Salvataggio Step 1 - allNames:", allNames);

    setIsSaving(true);
    try {
      // Salva la lista completa di nomi
      const response = await api.put(`/api/games/${gameId}`, {
        data: {
          allNames: allNames,
        },
      });

      console.log("✅ Risposta backend Step 1:", response.data);

      setCurrentStep(2);
      setPopup({
        isVisible: true,
        type: "success",
        title: "Successo!",
        message: "Lista completa salvata! Ora seleziona i tuoi preferiti.",
      });
    } catch (error) {
      console.error("❌ Errore nel salvataggio:", error);
      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: "Impossibile salvare i nomi. Riprova.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleConfirmSelection() {
    const selectedCount = selectedIndexes.length;

    if (selectedCount < 1) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi selezionare almeno 1 nome preferito.",
      });
      return;
    }

    if (selectedCount > 10) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Puoi selezionare massimo 10 nomi preferiti.",
      });
      return;
    }

    // Crea l'array con i nomi selezionati (ancora da ordinare)
    const selected = selectedIndexes.map((index) => allNames[index]);
    setOrderedNames(selected);
    setCurrentStep(3);
  }

  async function handleSaveFinal() {
    const selectedCount = orderedNames.length;

    if (selectedCount < 1) {
      setPopup({
        isVisible: true,
        type: "warning",
        title: "Attenzione",
        message: "Devi ordinare almeno 1 nome prima di salvare.",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Salva la lista dei nomi selezionati e ordinati
      await api.put(`/api/games/${gameId}`, {
        data: {
          selectedNames: orderedNames,
        },
      });

      setPopup({
        isVisible: true,
        type: "success",
        title: "Completato!",
        message: "La tua classifica è stata salvata con successo!",
      });

      // Torna alla dashboard dopo 2 secondi
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Errore nel salvataggio finale:", error);
      setPopup({
        isVisible: true,
        type: "error",
        title: "Errore",
        message: "Impossibile salvare la classifica. Riprova.",
      });
    } finally {
      setIsSaving(false);
    }
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

  if (!isParent) {
    return <LoadingScreen />;
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

        <h1 className={styles.title}>Setup gioco - {game?.name}</h1>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          <div
            className={`${styles.step} ${
              currentStep >= 1 ? styles.active : ""
            }`}
          >
            1. Inserisci lista completa
          </div>
          <div
            className={`${styles.step} ${
              currentStep >= 2 ? styles.active : ""
            }`}
          >
            2. Seleziona preferiti
          </div>
          <div
            className={`${styles.step} ${
              currentStep >= 3 ? styles.active : ""
            }`}
          >
            3. Ordina i preferiti
          </div>
        </div>

        {/* Step 1: Inserisci lista completa */}
        {currentStep === 1 && (
          <div className={styles.stepContent}>
            <InfoBox variant="info">
              <strong>Step 1:</strong> Inserisci 12 nomi che ti piacciono. I
              giocatori vedranno questa lista e dovranno indovinare i tuoi
              preferiti.
            </InfoBox>

            <div className={styles.namesList}>
              {allNames.map((name, index) => (
                <div key={index} className={styles.nameItem}>
                  <span className={styles.positionLabel}>{index + 1}°</span>
                  <input
                    className={styles.nameInput}
                    type="text"
                    value={name}
                    placeholder={`Nome #${index + 1}`}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleSaveStep1}
              isLoading={isSaving}
              className={styles.submitButton}
            >
              Salva e continua
            </Button>
          </div>
        )}

        {/* Step 2: Seleziona preferiti */}
        {currentStep === 2 && (
          <div className={styles.stepContent}>
            <InfoBox variant="info">
              <strong>Step 2:</strong> Seleziona da 1 a 10 nomi preferiti dalla
              lista completa. Meno nomi scegli, più difficile sarà per i
              giocatori! Clicca su un nome per selezionarlo/deselezionarlo.
            </InfoBox>

            <div className={styles.selectionInfo}>
              Selezionati: {selectedIndexes.length} / 10
              {selectedIndexes.length > 0 && selectedIndexes.length <= 3 && (
                <span className={styles.difficultyHint}>
                  {" "}
                  🔥 Molto difficile!
                </span>
              )}
              {selectedIndexes.length > 3 && selectedIndexes.length <= 6 && (
                <span className={styles.difficultyHint}> ⚡ Difficile</span>
              )}
              {selectedIndexes.length > 6 && (
                <span className={styles.difficultyHint}> ✅ Più facile</span>
              )}
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
                    selectedIndexes.length >= 10
                  }
                >
                  {name}
                  {selectedIndexes.includes(index) && (
                    <span className={styles.selectedBadge}>✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.stepButtons}>
              <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                Indietro
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSelection}
                disabled={selectedIndexes.length < 1}
              >
                Conferma selezione ({selectedIndexes.length})
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Ordina i preferiti */}
        {currentStep === 3 && (
          <div className={styles.stepContent}>
            <InfoBox variant="info">
              <strong>Step 3:</strong> Ordina i {orderedNames.length}{" "}
              {orderedNames.length === 1
                ? "nome selezionato"
                : "nomi selezionati"}{" "}
              dal tuo preferito (1°) al meno preferito. Usa le frecce per
              spostare i nomi.
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
                  setCurrentStep(2);
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
                Salva classifica finale
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
export default function GameSetupPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SetupGiocoContent />
    </Suspense>
  );
}
