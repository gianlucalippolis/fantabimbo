import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Logo } from "components/Logo";
import { SignOutButton } from "components/SignOutButton";
import { authOptions } from "../lib/auth";
import { getStrapiConfig } from "../lib/env";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { apiUrl: strapiUrl } = getStrapiConfig({ required: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any = await getServerSession(authOptions);

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

  let userEmail = session?.user?.email;
  let displayName = session?.user?.firstName?.trim();

  const strapiJwt = session?.jwt as string | undefined;
  let requiresProfileCompletion = false;
  if (strapiUrl && strapiJwt) {
    try {
      const response = await fetch(`${strapiUrl}/api/users/me`, {
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
      } else {
        console.error("Failed to fetch profile", response);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  }

  console.log("requiresProfileCompletion", requiresProfileCompletion);

  if (requiresProfileCompletion) {
    redirect("/completa-profilo");
  }

  return (
    <div className={styles.hero}>
      <div className={styles.card}>
        <div className={styles.logoWrapper}>
          <Logo />
        </div>
        <h1 className={styles.title}>Ciao, {displayName}!</h1>
        <p className={styles.subtitle}>
          Sei nella tua area Fantabimbo. Presto potrai gestire la rosa,
          monitorare le prestazioni e sfidare gli altri allenatori.
        </p>
        {userEmail && (
          <dl className={styles.details}>
            <div className={styles.detailRow}>
              <dt>Email</dt>
              <dd>{userEmail}</dd>
            </div>
          </dl>
        )}
        <div className={styles.actions}>
          <button
            className={`${styles.action} ${styles.primary}`}
            type="button"
            disabled
          >
            Gestisci squadra (presto disponibile)
          </button>
          <SignOutButton className={`${styles.action} ${styles.secondary}`}>
            Esci
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
