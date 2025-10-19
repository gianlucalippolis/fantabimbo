"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GameSummary } from "types/game";
import { getStrapiMediaURL } from "../lib/utils";
import styles from "../app/partite/[id]/page.module.css";
import Countdown from "./Countdown";
import Leaderboard from "./Leaderboard";
import Avatar from "./Avatar";
import BackIcon from "./icons/BackIcon";
import { Button } from "./Button";
import RevealDatePopup from "./RevealDatePopup";

interface GameDetailClientProps {
  game: GameSummary;
}

export function GameDetailClient({ game }: GameDetailClientProps) {
  const router = useRouter();
  const [currentReveal, setCurrentReveal] = useState<string | null>(
    game.revealAt ?? null
  );
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if reveal date is already expired
    if (game.revealAt) {
      const now = new Date().getTime();
      const revealTime = new Date(game.revealAt).getTime();
      if (now >= revealTime) {
        setShowLeaderboard(true);
      }
    }
  }, [game.revealAt]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveSuccess = (revealAt: string | null) => {
    setCurrentReveal(revealAt);
  };

  const participants = useMemo(
    () => (Array.isArray(game.participants) ? game.participants : []),
    [game.participants]
  );

  const currentRevealLabel = useMemo(() => {
    if (!currentReveal) {
      return "Nessuna data impostata";
    }
    const formatted = new Date(currentReveal);
    if (Number.isNaN(formatted.valueOf())) {
      return "Nessuna data impostata";
    }
    // Only format on client side to avoid hydration mismatch
    if (!mounted) {
      return "Caricamento...";
    }
    return formatted.toLocaleString("it-IT");
  }, [currentReveal, mounted]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Button
            onClick={() => {
              setIsNavigating(true);
              router.push("/");
            }}
            variant="secondary"
            isLoading={isNavigating}
            className={styles.backLink}
          >
            <BackIcon size={20} /> Torna alla dashboard
          </Button>
          <h1 className={styles.title}>{game.name}</h1>
          <p className={styles.subtitle}>
            Organizzata da{" "}
            <strong>
              {game.owner?.firstName || game.owner?.lastName
                ? [game.owner?.firstName, game.owner?.lastName]
                    .filter(Boolean)
                    .join(" ")
                : game.owner?.email || "Genitore"}
            </strong>
          </p>
          {game.prize ? (
            <div className={styles.prize}>
              <span className={styles.prizeLabel}>Premio:</span>
              <span className={styles.prizeIcon}>🏆</span>
              <span className={styles.prizeText}>{game.prize}</span>
            </div>
          ) : null}
        </header>

        {/* Mostra risultati e classifica in cima quando il gioco è stato rivelato */}
        {showLeaderboard && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🎉 Risultati e Classifica</h2>
            <Leaderboard gameId={game.id} />
          </section>
        )}

        {/* Sezione highlight con countdown e azione principale */}
        <div className={styles.gameHighlight}>
          {currentReveal && !showLeaderboard && (
            <Countdown
              targetDate={currentReveal}
              gameId={game.id}
              onExpire={() => setShowLeaderboard(true)}
            />
          )}
          {!showLeaderboard && (
            <Link
              className={styles.highlightAction}
              href={`${
                game.isOwner ? "/game-setup" : "/play"
              }?game=${encodeURIComponent(game.id)}`}
            >
              Compila la tua lista dei nomi
            </Link>
          )}
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data di rivelazione</h2>
          <p className={styles.currentReveal}>Attuale: {currentRevealLabel}</p>
          {game.isOwner ? (
            <Button
              onClick={() => setIsPopupOpen(true)}
              variant="primary"
              className={styles.editRevealButton}
            >
              Modifica data
            </Button>
          ) : (
            <p className={styles.noticeInfo}>
              Solo l&apos;organizzatore può modificare la data di rivelazione.
            </p>
          )}
        </section>

        <RevealDatePopup
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onSuccess={handleSaveSuccess}
          currentRevealAt={currentReveal}
          gameId={game.id}
        />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Giocatori iscritti</h2>
          {participants.length === 0 ? (
            <p className={styles.emptyState}>
              Nessun partecipante ha ancora aderito a questa partita.
            </p>
          ) : (
            <ul className={styles.participantList}>
              {participants.map((participant) => {
                const displayName = [
                  participant.firstName,
                  participant.lastName,
                ]
                  .filter(Boolean)
                  .join(" ");
                const avatarRelativeUrl =
                  participant.avatar?.formats?.thumbnail?.url ||
                  participant.avatar?.url ||
                  null;
                const avatarUrl = getStrapiMediaURL(avatarRelativeUrl);
                return (
                  <li key={participant.id} className={styles.participantItem}>
                    <Avatar
                      imageUrl={avatarUrl}
                      name={displayName || participant.email || "Partecipante"}
                      size="small"
                    />
                    <div className={styles.participantInfo}>
                      <span className={styles.participantName}>
                        {displayName || participant.email || "Partecipante"}
                      </span>
                      <span className={styles.participantRole}>
                        {participant.userType === "parent"
                          ? "Genitore"
                          : "Giocatore"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
