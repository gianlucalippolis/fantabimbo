import { Button } from "../../components/Button";
import InfoBox from "../../components/InfoBox";
import styles from "./page.module.css";

interface NameSelectorProps {
  allNames: string[];
  selectedIndexes: number[];
  selectedCount: number;
  orderedNames: string[];
  currentStep: number;
  isParent: boolean;
  onToggleNameSelection: (index: number) => void;
  onConfirmSelection: () => void;
  onMoveNameInOrder: (fromIndex: number, toIndex: number) => void;
  onBackToSelection: () => void;
  onFinalSave: () => void;
  onRestart: () => void;
  isSaving: boolean;
}

export default function NameSelector({
  allNames,
  selectedIndexes,
  selectedCount,
  orderedNames,
  currentStep,
  isParent,
  onToggleNameSelection,
  onConfirmSelection,
  onMoveNameInOrder,
  onBackToSelection,
  onFinalSave,
  onRestart,
  isSaving,
}: NameSelectorProps) {
  return (
    <>
      {/* Step 1: Seleziona N nomi */}
      {currentStep === 1 && (
        <div className={styles.stepContent}>
          <InfoBox variant="info">
            <strong>Step 1:</strong>{" "}
            {isParent
              ? `Hai inserito 12 nomi possibili. Seleziona tutti i nomi che preferisci (puoi sceglierne quanti vuoi).`
              : `Il genitore ha scelto 12 nomi possibili. Seleziona i ${selectedCount} nomi che pensi siano i suoi preferiti.`}{" "}
            Clicca su un nome per selezionarlo.
          </InfoBox>

          <div className={styles.selectionGrid}>
            {allNames.map((name, index) => (
              <div
                key={index}
                className={`${styles.selectionCard} ${
                  selectedIndexes.includes(index) ? styles.selected : ""
                } ${
                  !selectedIndexes.includes(index) &&
                  !isParent &&
                  selectedIndexes.length >= selectedCount
                    ? styles.disabled
                    : ""
                }`}
                onClick={() => onToggleNameSelection(index)}
                style={{
                  cursor:
                    !selectedIndexes.includes(index) &&
                    !isParent &&
                    selectedIndexes.length >= selectedCount
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {name}
                {selectedIndexes.includes(index) && (
                  <span className={styles.selectedBadge}>✓</span>
                )}
              </div>
            ))}
          </div>

          <div className={styles.selectionInfo}>
            {isParent
              ? `${selectedIndexes.length} nomi selezionati`
              : `${selectedIndexes.length} / ${selectedCount} nomi selezionati`}
          </div>

          <Button
            variant="primary"
            onClick={onConfirmSelection}
            disabled={
              isParent
                ? selectedIndexes.length === 0
                : selectedIndexes.length !== selectedCount
            }
            className={styles.submitButton}
          >
            Conferma selezione
          </Button>
        </div>
      )}

      {/* Step 2: Ordina i nomi */}
      {currentStep === 2 && (
        <div className={styles.stepContent}>
          <InfoBox variant="info">
            <strong>Step 2:</strong> Ora ordina i {orderedNames.length} nomi che
            hai selezionato dal più probabile (1°) al meno probabile (
            {orderedNames.length}°).{" "}
            {isParent
              ? "Metti il nome che preferisci di più al primo posto."
              : "Cerca di indovinare quale sarà il nome scelto!"}
          </InfoBox>

          <div className={styles.orderList}>
            {orderedNames.map((name, index) => (
              <div key={index} className={styles.orderItem}>
                <div className={styles.orderControls}>
                  <Button
                    variant="secondary"
                    onClick={() => onMoveNameInOrder(index, index - 1)}
                    disabled={index === 0}
                    title="Sposta su"
                    className={styles.orderButton}
                  >
                    ▲
                  </Button>
                  <span className={styles.orderPosition}>{index + 1}°</span>
                  <Button
                    variant="secondary"
                    onClick={() => onMoveNameInOrder(index, index + 1)}
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
            <Button variant="secondary" onClick={onBackToSelection}>
              Indietro
            </Button>
            <Button
              variant="tertiary"
              onClick={onRestart}
              title="Cancella tutto e ricomincia da capo"
            >
              ↻ Ricomincia
            </Button>
            <Button
              variant="primary"
              onClick={onFinalSave}
              isLoading={isSaving}
            >
              {isParent ? "Salva le mie preferenze" : "Salva la mia previsione"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
