"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "../../components/Logo";
import styles from "../../styles/Login.module.css";
import api from "../../lib/axios";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Link di reset non valido. Richiedi un nuovo link.");
    }
  }, [code]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !code) {
      return;
    }

    if (!password || !passwordConfirmation) {
      setError("Compila tutti i campi");
      return;
    }

    if (password.length < 6) {
      setError("La password deve essere lunga almeno 6 caratteri");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Le password non coincidono");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post("/api/auth/reset-password", {
        code,
        password,
        passwordConfirmation,
      });

      setSuccess(true);

      // Reindirizza al login dopo 2 secondi
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("Reset password failed", err);
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Impossibile reimpostare la password. Il link potrebbe essere scaduto.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <Logo size={80} />
          </div>

          <div className={styles.card}>
            <div className={styles.successMessage}>
              <h1 className={styles.title}>✅ Password reimpostata!</h1>
              <p className={styles.description}>
                La tua password è stata reimpostata con successo. Verrai
                reindirizzato alla pagina di login...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!code) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.logoContainer}>
            <Logo size={80} />
          </div>

          <div className={styles.card}>
            <h1 className={styles.title}>❌ Link non valido</h1>
            <p className={styles.error} role="alert">{error}</p>
            <Link href="/forgot-password" className={styles.primaryButton}>
              Richiedi nuovo link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <Logo size={80} />
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Reimposta la password</h1>
          <p className={styles.description}>
            Inserisci la tua nuova password.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                Nuova password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className={styles.input}
                placeholder="Almeno 6 caratteri"
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="passwordConfirmation" className={styles.label}>
                Conferma password
              </label>
              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirmation}
                onChange={(e) => {
                  setPasswordConfirmation(e.target.value);
                  if (error) setError(null);
                }}
                className={styles.input}
                placeholder="Ripeti la password"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Salvataggio..." : "Reimposta password"}
            </button>
          </form>

          <div className={styles.footer}>
            <Link href="/login" className={styles.link}>
              ← Torna al login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <main className={styles.main}>
          <div className={styles.container}>
            <div className={styles.logoContainer}>
              <Logo size={80} />
            </div>
            <div className={styles.card}>
              <p className={styles.description}>Caricamento...</p>
            </div>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

