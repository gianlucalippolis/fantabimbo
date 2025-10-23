"use client";

import { useEffect, useState } from "react";
import api from "../lib/axios";
import styles from "./Leaderboard.module.css";

interface PlayerScore {
  userId: number;
  user: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  score: number;
  details: {
    babyNameGuessed: boolean;
    babyNameInFirstPosition: boolean;
    correctPositions: number;
    nearPositions: number;
    pointsForBabyName: number;
    pointsForCorrectPositions: number;
    pointsForNearPositions: number;
  };
  guessedNames: string[];
  nameBreakdown?: Array<{
    name: string;
    position: number;
    correctPosition: number | null;
    distance: number | null;
    points: number;
    reason: string;
    type: 'babyNameFirst' | 'babyNameGuessed' | 'correctPosition' | 'nearPosition' | 'farPosition' | 'wrongName';
  }>;
}

interface LeaderboardData {
  winners: PlayerScore[];
  parentPreferences: string[];
  babyName: string | null;
  gameRevealed: boolean;
}

interface LeaderboardProps {
  gameId: number | string;
}

export default function Leaderboard({ gameId }: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const response = await api.get(
          `/api/name-submissions/calculate-victory/${gameId}`
        );

        // Il backend Strapi wrappa la risposta in { data: {...}, meta: {} }
        const leaderboardData = response.data.data || response.data;

        // Debug: controlla userId duplicati
        if (leaderboardData?.winners) {
          const userIds = leaderboardData.winners.map((w: any) => w.userId);
          const duplicates = userIds.filter((id: any, idx: number) => userIds.indexOf(id) !== idx);
          if (duplicates.length > 0) {
            console.error('[Leaderboard] Duplicate userIds found:', duplicates);
          }
        }

        setData(leaderboardData);
      } catch (err: unknown) {
        console.error("Failed to load leaderboard:", err);
        setError("Impossibile caricare la classifica. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [gameId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>Caricamento classifica...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>{error}</p>
      </div>
    );
  }

  if (!data || !data.babyName) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          <p>
            La classifica sarà disponibile quando il genitore inserirà la sua
            lista di nomi con il nome del bambino al primo posto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.babyNameReveal}>
        <h2 className={styles.revealTitle}>Il nome scelto è:</h2>
        <p className={styles.babyName}>🎉 {data.babyName} 🎉</p>
      </div>

      <div className={styles.leaderboard}>
        <h3 className={styles.leaderboardTitle}>🏆 Classifica</h3>

        {data.winners.length === 0 ? (
          <p className={styles.noSubmissions}>
            Nessun partecipante ha ancora inviato i propri nomi.
          </p>
        ) : (
          <div className={styles.scoresList}>
            {data.winners.map((score, index) => {
              const playerName =
                [score.user.firstName, score.user.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                score.user.email ||
                "Giocatore";

              return (
                <div
                  key={score.userId}
                  className={`${styles.scoreCard} ${
                    index === 0 ? styles.firstPlace : ""
                  } ${index === 1 ? styles.secondPlace : ""} ${
                    index === 2 ? styles.thirdPlace : ""
                  }`}
                >
                  <div className={styles.scoreHeader}>
                    <div className={styles.rank}>
                      {index === 0 && "🥇"}
                      {index === 1 && "🥈"}
                      {index === 2 && "🥉"}
                      {index > 2 && `${index + 1}°`}
                    </div>
                    <div className={styles.playerInfo}>
                      <p className={styles.playerName}>{playerName}</p>
                    </div>
                    <div className={styles.totalScore}>{score.score} pt</div>
                  </div>

                  <div className={styles.scoreDetails}>
                    {score.details.babyNameInFirstPosition && (
                      <div
                        className={`${styles.scoreItem} ${styles.perfectGuess}`}
                      >
                        <span className={styles.scoreLabel}>
                          ⭐ Nome del bambino al 1° posto!
                        </span>
                        <span className={styles.scoreValue}>
                          +{score.details.pointsForBabyName}
                        </span>
                      </div>
                    )}
                    {score.details.babyNameGuessed &&
                      !score.details.babyNameInFirstPosition && (
                        <div className={styles.scoreItem}>
                          <span className={styles.scoreLabel}>
                            Nome del bambino indovinato
                          </span>
                          <span className={styles.scoreValue}>
                            +{score.details.pointsForBabyName}
                          </span>
                        </div>
                      )}
                    {score.details.correctPositions > 0 && (
                      <div className={styles.scoreItem}>
                        <span className={styles.scoreLabel}>
                          {score.details.correctPositions}{" "}
                          {score.details.correctPositions === 1
                            ? "posizione corretta"
                            : "posizioni corrette"}
                        </span>
                        <span className={styles.scoreValue}>
                          +{score.details.pointsForCorrectPositions}
                        </span>
                      </div>
                    )}
                    {score.details.nearPositions > 0 && (
                      <div className={styles.scoreItem}>
                        <span className={styles.scoreLabel}>
                          {score.details.nearPositions}{" "}
                          {score.details.nearPositions === 1
                            ? "nome vicino (distanza 1)"
                            : "nomi vicini (distanza 1)"}
                        </span>
                        <span className={styles.scoreValue}>
                          +{score.details.pointsForNearPositions}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lista dei nomi con dettaglio punti */}
                  {score.nameBreakdown && score.nameBreakdown.length > 0 ? (
                    <div className={styles.guessedNames}>
                      <p className={styles.guessedNamesTitle}>
                        Dettaglio punteggio per nome:
                      </p>
                      <ol className={styles.namesList}>
                        {score.nameBreakdown.map((nameDetail, idx) => {
                          const iconMap = {
                            babyNameFirst: "⭐",
                            babyNameGuessed: "🎯",
                            correctPosition: "✅",
                            nearPosition: "📍",
                            farPosition: "○",
                            wrongName: "✗",
                          };

                          return (
                            <li
                              key={`${score.userId}-${nameDetail.position}`}
                              className={`${styles.nameItem} ${styles[nameDetail.type]}`}
                            >
                              <span className={styles.nameText}>
                                {iconMap[nameDetail.type]} {nameDetail.name}
                                {nameDetail.correctPosition !== null && (
                                  <span className={styles.positionInfo}>
                                    (pos. corretta: {nameDetail.correctPosition}°)
                                  </span>
                                )}
                              </span>
                              <span className={styles.namePoints}>
                                {nameDetail.points > 0 ? (
                                  <>
                                    +{nameDetail.points} pt
                                  </>
                                ) : (
                                  <span className={styles.noPoints}>
                                    0 pt
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : (
                    score.guessedNames &&
                    score.guessedNames.length > 0 && (
                      <div className={styles.guessedNames}>
                        <p className={styles.guessedNamesTitle}>
                          Nomi proposti:
                        </p>
                        <ol className={styles.namesList}>
                          {score.guessedNames.map((name, idx) => (
                            <li key={`${score.userId}-name-${idx}`} className={styles.nameItem}>
                              {name}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
