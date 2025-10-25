"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/Logo";
import styles from "../../styles/Login.module.css";
import api from "../../lib/axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Inserisci la tua email");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post("/api/auth/forgot-password", {
        email: trimmedEmail,
      });

      setSuccess(true);
    } catch (err) {
      console.error("Forgot password failed", err);
      const error = err as {
        response?: {
          data?: { error?: { message?: string }; message?: string };
        };
      };
      const errorMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Impossibile inviare l'email di reset. Riprova più tardi.";
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
            <Logo />
          </div>

          <div className={styles.card}>
            <div className={styles.successMessage}>
              <h1 className={styles.title}>✉️ Email inviata!</h1>
              <p className={styles.description}>
                Se esiste un account associato a <strong>{email}</strong>,
                riceverai un&apos;email con le istruzioni per reimpostare la
                password.
              </p>
              <p className={styles.hint}>
                Controlla anche la cartella spam se non vedi l&apos;email.
              </p>
              <Link href="/login" className={styles.primaryButton}>
                Torna al login
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.logoContainer}>
          <Logo />
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Password dimenticata?</h1>
          <p className={styles.description}>
            Inserisci la tua email e ti invieremo le istruzioni per reimpostare
            la password.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                className={styles.input}
                placeholder="tuaemail@esempio.com"
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
              {isSubmitting ? "Invio in corso..." : "Invia email di reset"}
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
