import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import styles from "../../styles/Login.module.css";
import { authOptions } from "../../lib/auth";
import { getStrapiConfig } from "../../lib/env";

interface CompleteProfileProps {
  firstName: string;
  lastName: string;
  strapiApiUrl: string | null;
}

export default function CompleteProfile({
  firstName: initialFirstName,
  lastName: initialLastName,
  strapiApiUrl,
}: CompleteProfileProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState({
    firstName: initialFirstName,
    lastName: initialLastName,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: "firstName" | "lastName", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("Nome e cognome sono obbligatori.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (!strapiApiUrl) {
        setError(
          "Configurazione di Strapi non disponibile. Contatta l'assistenza."
        );
        return;
      }

      const typedSession =
        (session as
          | (Record<string, unknown> & {
              jwt?: string | null;
              id?: number | string | null;
            })
          | null) ?? null;
      const strapiJwt =
        typeof typedSession?.jwt === "string" && typedSession.jwt.trim()
          ? typedSession.jwt
          : null;
      const rawUserId = typedSession?.id;
      const numericUserId =
        typeof rawUserId === "number"
          ? rawUserId
          : typeof rawUserId === "string" && rawUserId.trim()
          ? Number.parseInt(rawUserId, 10)
          : NaN;

      if (!strapiJwt || Number.isNaN(numericUserId)) {
        setError(
          "Sessione non valida. Effettua nuovamente l'accesso prima di aggiornare il profilo."
        );
        return;
      }

      const response = await fetch(
        `${strapiApiUrl}/api/users/` + numericUserId,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${strapiJwt}`,
          },
          body: JSON.stringify({
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
          }),
        }
      );

      const payload = (await response.json().catch(() => ({}))) as
        | {
            error?: { message?: string };
            message?: string;
          }
        | Record<string, never>;

      if (!response.ok) {
        const message =
          payload?.error?.message ??
          payload?.message ??
          "Aggiornamento non riuscito. Riprova.";
        setError(message);
        return;
      }

      setSuccess("Profilo aggiornato! Ti reindirizziamo alla dashboard…");

      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (profileError) {
      console.error("Complete profile failed", profileError);
      setError("Impossibile aggiornare il profilo. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Completa il profilo</h1>
          <p className={styles.subtitle}>
            Ci serve solo il tuo nome e cognome per personalizzare
            l&apos;esperienza Fantanome.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="first-name">Nome</label>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z" />
                </svg>
              </span>
              <input
                id="first-name"
                name="first-name"
                type="text"
                autoComplete="given-name"
                placeholder="Mario"
                value={form.firstName}
                className={styles.input}
                onChange={(event) =>
                  updateField("firstName", event.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="last-name">Cognome</label>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5z" />
                </svg>
              </span>
              <input
                id="last-name"
                name="last-name"
                type="text"
                autoComplete="family-name"
                placeholder="Rossi"
                value={form.lastName}
                className={styles.input}
                onChange={(event) =>
                  updateField("lastName", event.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.error} aria-live="polite">
            {error}
          </div>
          {success && (
            <div className={styles.success} aria-live="polite">
              {success}
            </div>
          )}
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvataggio in corso…" : "Salva e continua"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<
  CompleteProfileProps
> = async (context) => {
  const { apiUrl: strapiUrl } = getStrapiConfig({ required: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any = await getServerSession(
    context.req,
    context.res,
    authOptions
  );

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const strapiJwt = session?.jwt as string | undefined;

  let firstName = "";
  let lastName = "";

  if (strapiUrl && strapiJwt) {
    try {
      const response = await fetch(`${strapiUrl}/api/users/me?populate=*`, {
        headers: {
          Authorization: `Bearer ${strapiJwt}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        firstName = profile?.firstName ?? "";
        lastName = profile?.lastName ?? "";
      }
    } catch (error) {
      console.error("Failed to load Strapi profile", error);
    }
  }

  return {
    props: {
      firstName,
      lastName,
      strapiApiUrl: strapiUrl || null,
    },
  };
};
