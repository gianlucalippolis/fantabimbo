"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import type { AxiosError } from "axios";
import styles from "../app/page.module.css";
import type { GameSummary } from "types/game";
import api from "../lib/axios";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchGames, setUserGames } from "../store/user";
import Countdown from "./Countdown";

interface GamesManagerProps {
  games: GameSummary[];
  inviteBaseUrl: string;
  userId: string | number;
  canCreateGames: boolean;
}

interface CreateFormState {
  name: string;
  description: string;
  prize: string;
}

const INITIAL_CREATE_STATE: CreateFormState = {
  name: "",
  description: "",
  prize: "",
};

export function GamesManager({
  games,
  inviteBaseUrl,
  userId,
  canCreateGames,
}: GamesManagerProps) {
  const profileFromStore = useAppSelector((state) => state.user.profile);
  const strapiJwt = profileFromStore?.jwt ?? null;

  const dispatch = useAppDispatch();
  const gamesFromStore = useAppSelector((state) => state.user.games);
  const gamesStatus = useAppSelector((state) => state.user.gamesStatus);
  const gamesErrorMessage = useAppSelector((state) => state.user.gamesError);

  const hasFetchedGames = useRef(false);

  const [createForm, setCreateForm] =
    useState<CreateFormState>(INITIAL_CREATE_STATE);
  const [revealDate, setRevealDate] = useState<string>("");
  const [revealTime, setRevealTime] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copiedGameId, setCopiedGameId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [gamePendingDelete, setGamePendingDelete] =
    useState<GameSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (games.length > 0) {
      dispatch(setUserGames(games));
    }
  }, [dispatch, games]);

  // Fetch games only once when component mounts
  useEffect(() => {
    if (strapiJwt && !hasFetchedGames.current) {
      hasFetchedGames.current = true;
      dispatch(fetchGames(strapiJwt));
    }
  }, [dispatch, strapiJwt]);

  const orderedGames = useMemo(() => {
    return [...gamesFromStore].sort((a, b) => {
      const dateA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const dateB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [gamesFromStore]);

  function handleCreateFieldChange<K extends keyof CreateFormState>(
    field: K,
    value: string
  ) {
    if (!canCreateGames) {
      return;
    }
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (createError) {
      setCreateError(null);
    }
  }

  function normalizeRevealDate(date: string, time: string): string | null {
    if (!date || !time) {
      return null;
    }
    const candidate = new Date(`${date}T${time}`);
    if (Number.isNaN(candidate.valueOf())) {
      return null;
    }
    return candidate.toISOString();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }

    if (!canCreateGames) {
      setCreateError(
        "Solo i genitori possono creare una partita. Chiedi a un genitore di creare la lega."
      );
      return;
    }

    const trimmedName = createForm.name.trim();
    const trimmedDescription = createForm.description.trim();
    const trimmedPrize = createForm.prize.trim();
    const trimmedRevealDate = revealDate.trim();
    const trimmedRevealTime = revealTime.trim();

    if (!trimmedName) {
      setCreateError("Inserisci il nome della partita.");
      return;
    }

    const hasPartialReveal =
      (trimmedRevealDate && !trimmedRevealTime) ||
      (!trimmedRevealDate && trimmedRevealTime);

    if (hasPartialReveal) {
      setCreateError(
        "Per impostare la rivelazione inserisci sia la data sia l'ora."
      );
      return;
    }

    const revealAt = normalizeRevealDate(trimmedRevealDate, trimmedRevealTime);

    try {
      setIsCreating(true);
      await api.post("/api/games", {
        data: {
          name: trimmedName,
          description: trimmedDescription,
          prize: trimmedPrize || null,
          revealAt,
        },
      });

      await dispatch(fetchGames(userId)).unwrap();
      setCreateForm(INITIAL_CREATE_STATE);
      setRevealDate("");
      setRevealTime("");
      setCreateError(null);
    } catch (error) {
      console.error("Game creation failed", error);
      const err = error as AxiosError<{ error?: { message?: string } }>;
      if (err.response?.status === 409) {
        setCreateError(
          err.response.data?.error?.message ??
            "Hai già una partita con questo nome."
        );
      } else {
        setCreateError(
          err.response?.data?.error?.message ??
            "Impossibile creare la partita. Riprova più tardi."
        );
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isJoining) {
      return;
    }

    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) {
      setJoinError("Inserisci un codice invito valido.");
      return;
    }

    try {
      setIsJoining(true);
      const response = await api.post("/api/games/join", {
        inviteCode: trimmedCode,
      });

      if (!response?.data) {
        setJoinError("Codice invito non valido.");
        return;
      }

      setJoinCode("");
      setJoinError(null);
      await dispatch(fetchGames(userId));
    } catch (error) {
      console.error("Game join failed", error);
      setJoinError(
        error instanceof Error
          ? error.message
          : "Impossibile partecipare alla partita. Riprova più tardi."
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleRegenerate(gameId: number) {
    if (regeneratingId != null) {
      return;
    }

    try {
      setRegeneratingId(gameId);
      const response = await fetch(
        `/api/games/regenerate-invite/${encodeURIComponent(gameId)}`,
        {
          method: "POST",
          credentials: "include",
          headers: strapiJwt
            ? {
                Authorization: `Bearer ${strapiJwt}`,
              }
            : undefined,
        }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload as { error?: string })?.error ??
          "Impossibile rigenerare il codice invito.";
        setJoinError(message);
        return;
      }

      await dispatch(fetchGames(userId));
      setJoinError(null);
    } catch (error) {
      console.error("Invite regeneration failed", error);
      setJoinError("Impossibile rigenerare il codice. Riprova più tardi.");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleCopy(link: string, gameId: number) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setCopiedGameId(gameId);
        setTimeout(() => {
          setCopiedGameId((current) => (current === gameId ? null : current));
        }, 2000);
      }
    } catch (error) {
      console.error("Copy invite link failed", error);
    }
  }

  function handleDeleteRequest(game: GameSummary) {
    setGamePendingDelete(game);
    setDeleteError(null);
  }

  function handleCloseDeleteModal() {
    if (isDeleting) {
      return;
    }
    setGamePendingDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!gamePendingDelete || isDeleting) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(
        `/api/games/${encodeURIComponent(gamePendingDelete.id)}`
      );
      await dispatch(fetchGames(userId));
      setGamePendingDelete(null);
      setDeleteError(null);
    } catch (error) {
      console.error("Game deletion failed", error);
      setDeleteError("Impossibile eliminare la partita. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  }

  const isLoadingList = gamesStatus === "loading";
  const inviteBaseClean = inviteBaseUrl.replace(/\/$/, "");

  return (
    <section className={styles.gamesSection}>
      <header className={styles.gamesHeader}>
        <h2>Le tue partite</h2>
        <p>
          {canCreateGames
            ? "Crea nuove partite e condividi il codice invito con i giocatori."
            : "Inserisci il codice invito ricevuto per unirti alla partita dei genitori."}
        </p>
      </header>

      {gamesErrorMessage ? (
        <div className={styles.gamesError} role="alert">
          {gamesErrorMessage}
        </div>
      ) : null}

      <div className={styles.gamesForms}>
        {canCreateGames ? (
          <details className={styles.createGameAccordion}>
            <summary className={styles.createGameSummary}>
              ➕ Crea una nuova partita
            </summary>
            <form className={styles.gamesForm} onSubmit={handleCreate}>
              <div className={styles.gamesFormRow}>
                <label htmlFor="game-name">Nome della partita</label>
                <p className={styles.inputHint}>
                  Evita di inserire il nome del bambino: sarà visibile a tutti i
                  partecipanti.
                </p>
                <input
                  id="game-name"
                  name="game-name"
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    handleCreateFieldChange("name", event.target.value)
                  }
                  placeholder="Nome della partita"
                  className={styles.gamesInput}
                />
              </div>
              <div className={styles.gamesFormRow}>
                <label htmlFor="game-reveal-date">
                  Data e ora di rivelazione
                </label>
                <p className={styles.inputHint}>
                  Imposta quando il nome verrà svelato a tutti i partecipanti.
                  Puoi lasciarlo vuoto e aggiornarlo in seguito.
                </p>
                <div className={styles.inlineFields}>
                  <input
                    id="game-reveal-date"
                    name="game-reveal-date"
                    type="date"
                    value={revealDate}
                    onChange={(event) => {
                      setRevealDate(event.target.value);
                      if (createError) {
                        setCreateError(null);
                      }
                    }}
                    className={styles.gamesInput}
                  />
                  <input
                    id="game-reveal-time"
                    name="game-reveal-time"
                    type="time"
                    value={revealTime}
                    onChange={(event) => {
                      setRevealTime(event.target.value);
                      if (createError) {
                        setCreateError(null);
                      }
                    }}
                    className={styles.gamesInput}
                  />
                </div>
              </div>
              <div className={styles.gamesFormRow}>
                <label htmlFor="game-description">
                  Descrizione (opzionale)
                </label>
                <textarea
                  id="game-description"
                  name="game-description"
                  rows={2}
                  value={createForm.description}
                  onChange={(event) =>
                    handleCreateFieldChange("description", event.target.value)
                  }
                  placeholder="Aggiungi qualche dettaglio per i partecipanti…"
                  className={styles.gamesTextArea}
                />
              </div>
              <div className={styles.gamesFormRow}>
                <label htmlFor="game-prize">Premio (opzionale)</label>
                <p className={styles.inputHint}>
                  Indica se c&apos;è un premio per il vincitore. Sarà visibile a
                  tutti i partecipanti.
                </p>
                <input
                  id="game-prize"
                  name="game-prize"
                  type="text"
                  value={createForm.prize}
                  onChange={(event) =>
                    handleCreateFieldChange("prize", event.target.value)
                  }
                  placeholder="Es. Cena offerta, Trofeo personalizzato…"
                  className={styles.gamesInput}
                  maxLength={150}
                />
              </div>
              {createError ? (
                <div className={styles.gamesError} role="alert">
                  {createError}
                </div>
              ) : null}
              <button
                type="submit"
                className={styles.gamesPrimaryButton}
                disabled={isCreating}
              >
                {isCreating ? "Creazione in corso…" : "Crea partita"}
              </button>
            </form>
          </details>
        ) : (
          <form className={styles.gamesForm} onSubmit={handleJoin}>
            <h3>Hai un codice invito?</h3>
            <p className={styles.gamesNotice}>
              Solo i genitori possono creare nuove partite. Inserisci il codice
              che ti hanno fornito per partecipare.
            </p>
            <div className={styles.gamesFormRow}>
              <label htmlFor="invite-code">Codice invito</label>
              <input
                id="invite-code"
                name="invite-code"
                type="text"
                value={joinCode}
                onChange={(event) => {
                  setJoinCode(event.target.value);
                  if (joinError) {
                    setJoinError(null);
                  }
                }}
                placeholder="ES. FANTA23"
                className={styles.gamesInput}
                autoComplete="off"
                pattern="[A-Za-z0-9]+"
              />
            </div>
            {joinError ? (
              <div className={styles.gamesError} role="alert">
                {joinError}
              </div>
            ) : null}
            <button
              type="submit"
              className={styles.gamesSecondaryButton}
              disabled={isJoining}
            >
              {isJoining ? "Accesso in corso…" : "Unisciti alla partita"}
            </button>
          </form>
        )}
      </div>

      <div className={styles.gamesList}>
        {isLoadingList ? (
          <p className={styles.gamesEmpty}>Caricamento partite…</p>
        ) : orderedGames.length === 0 ? (
          <p className={styles.gamesEmpty}>
            {canCreateGames
              ? "Non hai ancora partite attive. Inizia creando la tua lega personale."
              : "Non hai ancora partite attive. Usa un codice invito per unirti a una lega esistente."}
          </p>
        ) : (
          orderedGames.map((game) => {
            // Ensure the invite link has https:// prefix
            const baseUrlWithProtocol = inviteBaseClean.startsWith("http")
              ? inviteBaseClean
              : `https://${inviteBaseClean}`;
            const inviteLink = `${baseUrlWithProtocol}/registrazione?code=${encodeURIComponent(
              game.inviteCode
            )}`;
            return (
              <article key={game.id} className={styles.gameCard}>
                <header className={styles.gameCardHeader}>
                  <div className={styles.gameCardTitle}>
                    <h3>{game.name}</h3>
                    <span className={styles.gameRole}>
                      {game.isOwner ? "Creatrice" : "Partecipante"}
                    </span>
                  </div>
                  {game.description ? (
                    <p className={styles.gameDescription}>{game.description}</p>
                  ) : null}
                  {game.prize ? (
                    <div className={styles.gamePrize}>
                      <span className={styles.gamePrizeLabel}>Premio:</span>
                      <span className={styles.gamePrizeIcon}>🏆</span>
                      <span className={styles.gamePrizeText}>{game.prize}</span>
                    </div>
                  ) : null}
                </header>

                {/* Info rapide della partita */}
                <div className={styles.gameInfo}>
                  <div className={styles.gameInfoItem}>
                    <span className={styles.gameInfoLabel}>Codice</span>
                    <span className={styles.gameInfoValue}>
                      {game.inviteCode}
                    </span>
                  </div>
                  <div className={styles.gameInfoItem}>
                    <span className={styles.gameInfoLabel}>Partecipanti</span>
                    <span className={styles.gameInfoValue}>
                      {game.participants.length}
                    </span>
                  </div>
                </div>

                {/* Countdown e rivelazione */}
                {game.revealAt && (
                  <Countdown targetDate={game.revealAt} gameId={game.id} />
                )}

                {/* Azioni principali */}
                <div className={styles.gamePrimaryActions}>
                  <Link
                    href={`/lista-nomi?game=${encodeURIComponent(game.id)}`}
                    className={styles.gamePrimaryButton}
                  >
                    {(() => {
                      // Trova il partecipante corrente nella lista
                      const currentParticipant = game.participants.find(
                        (p) => p.id === Number(userId)
                      );
                      // Determina il testo in base al userType
                      if (currentParticipant?.userType === "parent") {
                        return "Inserisci i nomi";
                      } else if (currentParticipant?.userType === "player") {
                        return "Gioca";
                      }
                      // Fallback generico
                      return "Partecipa";
                    })()}
                  </Link>
                  <Link
                    href={`/partite/${encodeURIComponent(game.id)}`}
                    className={styles.gameSecondaryButton}
                  >
                    Dettagli partita
                  </Link>
                </div>

                {/* Sezione invito */}
                <details className={styles.gameInviteSection}>
                  <summary className={styles.gameInviteSummary}>
                    Condividi invito
                  </summary>
                  <div className={styles.gameInviteContent}>
                    <div className={styles.gameInviteInput}>
                      <label htmlFor={`invite-link-${game.id}`}>
                        Link invito
                      </label>
                      <input
                        id={`invite-link-${game.id}`}
                        readOnly
                        value={inviteLink}
                        className={styles.gamesInput}
                        onFocus={(event) => event.target.select()}
                        aria-label={`Link invito per ${game.name}`}
                      />
                    </div>
                    <div className={styles.gameInviteActions}>
                      <button
                        type="button"
                        className={styles.gamesSecondaryButton}
                        onClick={() => handleCopy(inviteLink, game.id)}
                      >
                        {copiedGameId === game.id ? "✓ Copiato!" : "Copia link"}
                      </button>
                      {game.isOwner ? (
                        <button
                          type="button"
                          className={styles.gamesTertiaryButton}
                          onClick={() => handleRegenerate(game.id)}
                          disabled={regeneratingId === game.id}
                        >
                          {regeneratingId === game.id
                            ? "Rigenerazione…"
                            : "Nuovo codice"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </details>

                {/* Pulsante elimina partita (solo proprietario) */}
                {game.isOwner ? (
                  <div className={styles.gameDeleteSection}>
                    <button
                      type="button"
                      className={styles.gamesDangerButton}
                      onClick={() => handleDeleteRequest(game)}
                      disabled={isDeleting}
                    >
                      {isDeleting && gamePendingDelete?.id === game.id
                        ? "Eliminazione…"
                        : "Elimina partita"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      {gamePendingDelete ? (
        <div
          className={styles.gamesModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-game-title"
        >
          <div className={styles.gamesModalDialog}>
            <h3 id="delete-game-title">Elimina questa partita?</h3>
            <p className={styles.gamesModalText}>
              Stai per eliminare <strong>{gamePendingDelete.name}</strong>. I
              partecipanti perderanno l&apos;accesso e il codice invito non sarà
              più valido. Questa azione non può essere annullata.
            </p>
            {deleteError ? (
              <div className={styles.gamesError} role="alert">
                {deleteError}
              </div>
            ) : null}
            <div className={styles.gamesModalActions}>
              <button
                type="button"
                className={styles.gamesTertiaryButton}
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                Annulla
              </button>
              <button
                type="button"
                className={styles.gamesDangerButton}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Eliminazione…" : "Elimina partita"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
