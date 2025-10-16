"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "../../styles/Login.module.css";

const MAX_NAMES = 10;

function buildInitialNames(): string[] {
  return Array.from({ length: MAX_NAMES }, () => "");
}

export default function ListaNomiPage() {
  const [names, setNames] = useState<string[]>(() => buildInitialNames());
  const [savedNames, setSavedNames] = useState<string[] | null>(null);
  const allFilled = useMemo(
    () => names.every((name) => name.trim().length > 0),
    [names]
  );

  function handleNameChange(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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
    setSavedNames(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedNames(names.map((name) => name.trim()));
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => window.history.back()}
        >
          ← Torna indietro
        </button>
        <div className={styles.header}>
          <h1 className={styles.title}>Le tue preferenze</h1>
          <p className={styles.subtitle}>
            Inserisci fino a {MAX_NAMES} nomi e ordina la lista secondo la tua
            preferenza.
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
                Usa le frecce per spostare i nomi e mantenere l’ordine di
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

          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              Salva la lista
            </button>
          </div>
        </form>

        {savedNames ? (
          <div className={styles.notice}>
            <p className={styles.noticeText}>
              Hai salvato {savedNames.length} nomi:
            </p>
            <ol>
              {savedNames.map((name, index) => (
                <li key={`${name}-${index}`}>
                  <span className={styles.noticeText}>
                    {index + 1}. {name}
                  </span>
                </li>
              ))}
            </ol>
            {!allFilled && (
              <p className={styles.noticeInfo}>
                Alcune posizioni sono vuote: compila tutti gli spazi per una
                classifica completa.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
