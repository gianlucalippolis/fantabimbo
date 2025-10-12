import type { Session } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Logo } from "components/Logo";
import { UserDashboard } from "components/UserDashboard";
import { authOptions } from "../lib/auth";
import { getStrapiConfig } from "../lib/env";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { apiUrl: strapiUrl } = getStrapiConfig({ required: false });

  type SessionWithStrapi = Session & {
    jwt?: string;
  };

  const session = (await getServerSession(
    authOptions
  )) as SessionWithStrapi | null;

  if (!session) {
    return (
      <div className={styles.hero}>
        <div className={styles.card}>
          <div className={styles.logoWrapper}>
            <Logo />
          </div>
          <p className={styles.subtitle}>
            Per iniziare configura il tuo account, crea la squadra e unisciti
            alla lega dei Fantabimbo.
          </p>
          <div className={styles.actions}>
            <Link
              className={`${styles.action} ${styles.primary}`}
              href="/login"
            >
              Accedi
            </Link>
            <Link
              className={`${styles.action} ${styles.secondary}`}
              href="/registrazione"
            >
              Registrati
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let userEmail = session.user?.email ?? null;
  let displayName =
    session.user?.name?.trim() ||
    userEmail?.split("@")[0] ||
    "Allenatore";

  const strapiJwt = session.jwt;
  let requiresProfileCompletion = false;

  if (strapiUrl && strapiJwt) {
    try {
      const response = await fetch(`${strapiUrl}/api/users/me?populate=*`, {
        headers: {
          Authorization: `Bearer ${strapiJwt}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const profile = await response.json();
        const firstName = profile?.firstName ?? "";
        const lastName = profile?.lastName ?? "";
        const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
        if (combined) {
          displayName = combined;
        } else {
          requiresProfileCompletion = true;
        }
        userEmail = profile?.email ?? userEmail;
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  }

  if (requiresProfileCompletion) {
    redirect("/completa-profilo");
  }

  return <UserDashboard displayName={displayName} userEmail={userEmail} />;
}
