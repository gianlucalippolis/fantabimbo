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
    namesInTop5: number; // Numero di nomi indovinati nei nomi selezionati
    correctPositions: number; // Numero di posizioni corrette
    perfectGuess: boolean; // true se tutti i nomi sono corretti nelle posizioni giuste
    pointsForNames: number; // Punti per nomi indovinati (20 punti per nome)
    pointsForPositions: number; // Punti per posizioni corrette (30 punti per posizione)
    perfectBonus: number; // Bonus per guess perfetto (100 punti)
  };
  guessedNames: string[];
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
        console.log("=== Leaderboard API Response ===");
        console.log("Full response:", JSON.stringify(response.data, null, 2));

        // Il backend Strapi wrappa la risposta in { data: {...}, meta: {} }
        const leaderboardData = response.data.data || response.data;
        console.log("Extracted leaderboard data:", leaderboardData);

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
    console.log("=== NO DATA OR NO BABY NAME ===");
    console.log("data exists:", !!data);
    console.log("data.babyName:", data?.babyName);
    console.log("Full data object:", data);

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
                    {score.details.perfectGuess && (
                      <div
                        className={`${styles.scoreItem} ${styles.perfectGuess}`}
                      >
                        <span className={styles.scoreLabel}>
                          🌟 Guess perfetto!
                        </span>
                        <span className={styles.scoreValue}>
                          +{score.details.perfectBonus}
                        </span>
                      </div>
                    )}
                    {score.details.namesInTop5 > 0 && (
                      <div className={styles.scoreItem}>
                        <span className={styles.scoreLabel}>
                          {score.details.namesInTop5}{" "}
                          {score.details.namesInTop5 === 1
                            ? "nome indovinato"
                            : "nomi indovinati"}
                        </span>
                        <span className={styles.scoreValue}>
                          +{score.details.pointsForNames}
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
                          +{score.details.pointsForPositions}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lista dei nomi indovinati */}
                  {score.guessedNames && score.guessedNames.length > 0 && (
                    <div className={styles.guessedNames}>
                      <p className={styles.guessedNamesTitle}>Nomi proposti:</p>
                      <ol className={styles.namesList}>
                        {score.guessedNames.map((name, idx) => (
                          <li key={idx} className={styles.nameItem}>
                            {name}
                          </li>
                        ))}
                      </ol>
                    </div>
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
