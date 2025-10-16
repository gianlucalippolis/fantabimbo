import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getStrapiConfig } from "../../../lib/env";
import type { GameSummary } from "types/game";
import styles from "./page.module.css";
import api from "../../../lib/axios";

type RouteParams = {
  params: {
    id: string;
  };
};

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
};

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function GameDetailPage({ params }: RouteParams) {
  const { id } = params;
  if (!id) {
    notFound();
  }

  const session = (await getServerSession(
    authOptions
  )) as SessionWithStrapi | null;

  if (!session?.jwt) {
    redirect("/login");
  }

  const { apiUrl } = getStrapiConfig({ required: true });

  let game: GameSummary | null = null;

  try {
    const response = await api.get(`/api/games/${id}`, {
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
      params: {
        "populate[owner]": "*",
        "populate[participants]": "*",
      },
      validateStatus: () => true,
    });

    if (response.status === 404) {
      notFound();
    }

    if (response.status === 403) {
      redirect("/login");
    }

    if (response.status >= 400) {
      throw new Error(`Game fetch failed (${response.status})`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = response.data as { data?: unknown };

    if (!payload?.data) {
      notFound();
    }

    game = payload.data;
  } catch (error) {
    debugger;
    console.error("Failed to load game detail", error);
    //notFound();
  }

  if (!game) {
    notFound();
  }

  const participants = Array.isArray(game.participants)
    ? game.participants
    : [];

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Link className={styles.backLink} href="/">
            ← Torna alla dashboard
          </Link>
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
        </header>

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
                return (
                  <li key={participant.id} className={styles.participantItem}>
                    <span className={styles.participantName}>
                      {displayName || participant.email || "Partecipante"}
                    </span>
                    <span className={styles.participantRole}>
                      {participant.userType === "parent"
                        ? "Genitore"
                        : "Giocatore"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className={styles.footer}>
          <Link
            className={styles.primaryAction}
            href={`/lista-nomi?game=${encodeURIComponent(game.id)}`}
          >
            La tua lista dei nomi
          </Link>
        </footer>
      </div>
    </div>
  );
}
