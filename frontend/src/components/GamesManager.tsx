"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type ISession from "types/session";
import styles from "../app/page.module.css";
import type { GameSummary } from "types/game";
import api from "../lib/axios";

interface GamesManagerProps {
  games: GameSummary[];
  inviteBaseUrl: string;
  userId: string | number;
  canCreateGames: boolean;
}

type GamesState = GameSummary[];

interface CreateFormState {
  name: string;
  description: string;
}

const INITIAL_CREATE_STATE: CreateFormState = {
  name: "",
  description: "",
};

export function GamesManager({
  games,
  inviteBaseUrl,
  userId,
  canCreateGames,
}: GamesManagerProps) {
  const { data: session } = useSession();
  const typedSession = session as ISession | null;
  const strapiJwt = typedSession?.jwt ?? null;
  const [items, setItems] = useState<GamesState>(games);
  const [createForm, setCreateForm] =
    useState<CreateFormState>(INITIAL_CREATE_STATE);
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

  const creationNotAllowedMessage =
    "Solo i genitori possono creare una partita. Chiedi a un genitore di creare la lega.";

  const inviteBase = inviteBaseUrl.replace(/\/$/, "");

  const orderedGames = useMemo(() => {
    return [...items].sort((a, b) => {
      const dateA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const dateB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [items]);

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

  async function retrieveGames() {
    const res = await api.get("/api/games");
    setItems(res.data.data);
  }

  useEffect(() => {
    retrieveGames();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreating) {
      return;
    }

    if (!canCreateGames) {
      setCreateError(creationNotAllowedMessage);
      return;
    }

    const trimmedName = createForm.name.trim();
    const trimmedDescription = createForm.description.trim();

    if (!trimmedName) {
      setCreateError("Inserisci il nome della partita.");
      return;
    }

    try {
      setIsCreating(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await api.post("/api/games", {
        data: {
          name: trimmedName,
          description: trimmedDescription,
        },
      });

      if (response.status !== 200) {
        const message =
          response?.error?.message ?? "Impossibile creare la partita.";
        setCreateError(message);
        return;
      }

      const createdGame = response.data.game;
      setItems((prev) => {
        const exists = prev.some((game) => game.id === createdGame.id);
        return exists ? prev : [createdGame, ...prev];
      });
      setCreateForm(INITIAL_CREATE_STATE);
      setCreateError(null);
    } catch (error) {
      console.error("Game creation failed", error);
      setCreateError("Impossibile creare la partita. Riprova più tardi.");
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
      const response = await fetch("/api/games/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(strapiJwt ? { Authorization: `Bearer ${strapiJwt}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ inviteCode: trimmedCode }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload as { error?: string })?.error ??
          "Impossibile partecipare alla partita con questo codice.";
        setJoinError(message);
        return;
      }

      const joinedGame = (payload as { game: GameSummary }).game;
      setItems((prev) => {
        const filtered = prev.filter((game) => game.id !== joinedGame.id);
        return [joinedGame, ...filtered];
      });
      setJoinCode("");
      setJoinError(null);
    } catch (error) {
      console.error("Game join failed", error);
      setJoinError("Impossibile entrare nella partita. Riprova più tardi.");
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
        `/api/games/${encodeURIComponent(gameId)}/regenerate-invite`,
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

      const updatedGame = (payload as { game: GameSummary }).game;
      setItems((prev) =>
        prev.map((game) => (game.id === updatedGame.id ? updatedGame : game))
      );
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
      setItems((prev) =>
        prev.filter((game) => game.id !== gamePendingDelete.id)
      );
      setGamePendingDelete(null);
      setDeleteError(null);
    } catch (error) {
      console.error("Game deletion failed", error);
      setDeleteError("Impossibile eliminare la partita. Riprova più tardi.");
    } finally {
      setIsDeleting(false);
    }
  }

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

      <div className={styles.gamesForms}>
        {canCreateGames ? (
          <form className={styles.gamesForm} onSubmit={handleCreate}>
            <h3>Crea una partita</h3>
            <div className={styles.gamesFormRow}>
              <label htmlFor="game-name">Nome della partita</label>
              <input
                id="game-name"
                name="game-name"
                type="text"
                value={createForm.name}
                onChange={(event) =>
                  handleCreateFieldChange("name", event.target.value)
                }
                placeholder="Esempio: Lega classe 3A"
                className={styles.gamesInput}
              />
            </div>
            <div className={styles.gamesFormRow}>
              <label htmlFor="game-description">Descrizione (opzionale)</label>
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
        {orderedGames.length === 0 ? (
          <p className={styles.gamesEmpty}>
            {canCreateGames
              ? "Non hai ancora partite attive. Inizia creando la tua lega personale."
              : "Non hai ancora partite attive. Usa un codice invito per unirti a una lega esistente."}
          </p>
        ) : (
          orderedGames.map((game) => {
            const isOwner = game.owner.id;
            const inviteLink = `${inviteBase}/registrazione?code=${encodeURIComponent(
              game.inviteCode
            )}`;
            return (
              <article key={game.id} className={styles.gameCard}>
                <header className={styles.gameCardHeader}>
                  <div>
                    <h3>{game.name}</h3>
                    {game.description ? (
                      <p className={styles.gameDescription}>
                        {game.description}
                      </p>
                    ) : null}
                  </div>
                  <span className={styles.gameRole}>
                    {game.isOwner ? "Creatrice" : "Partecipante"}
                  </span>
                </header>
                <dl className={styles.gameMeta}>
                  <div>
                    <dt>Codice invito</dt>
                    <dd>{game.inviteCode}</dd>
                  </div>
                  <div>
                    <dt>Partecipanti</dt>
                    <dd>{game.participants.length}</dd>
                  </div>
                </dl>
                <div className={styles.gameInvite}>
                  <input
                    readOnly
                    value={inviteLink}
                    className={styles.gamesInput}
                    onFocus={(event) => event.target.select()}
                    aria-label={`Link invito per ${game.name}`}
                  />
                  <div className={styles.gameInviteActions}>
                    <button
                      type="button"
                      className={styles.gamesSecondaryButton}
                      onClick={() => handleCopy(inviteLink, game.id)}
                    >
                      {copiedGameId === game.id ? "Copiato!" : "Copia link"}
                    </button>
                    {isOwner ? (
                      <>
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
                        <button
                          type="button"
                          className={styles.gamesDangerButton}
                          onClick={() => handleDeleteRequest(game)}
                          disabled={isDeleting}
                        >
                          {isDeleting && gamePendingDelete?.id === game.id
                            ? "Eliminazione…"
                            : "Elimina"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
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
