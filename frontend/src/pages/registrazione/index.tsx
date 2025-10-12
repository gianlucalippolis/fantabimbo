import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import styles from "../../styles/Login.module.css";
import Link from "next/link";

const MIN_PASSWORD_LENGTH = 8;

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(
    field: "email" | "password" | "confirmPassword",
    value: string
  ) {
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

    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedEmail || !form.password || !form.confirmPassword) {
      setError("Compila tutti i campi richiesti.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Inserisci un indirizzo e-mail valido.");
      return;
    }

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `La password deve contenere almeno ${MIN_PASSWORD_LENGTH} caratteri.`
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Le password non coincidono.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: form.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload as { error?: string })?.error ??
          "Registrazione non riuscita. Riprova.";
        setError(message);
        return;
      }

      setSuccess("Registrazione completata! Completiamo il tuo profilo…");

      const signInResult = await signIn("credentials", {
        redirect: false,
        identifier: trimmedEmail,
        password: form.password,
      });

      if (signInResult?.error) {
        setError(signInResult.error);
        return;
      }

      if (signInResult?.ok) {
        await router.replace("/completa-profilo");
      }
    } catch (registrationError) {
      console.error("Registration failed", registrationError);
      setError("Impossibile completare la registrazione. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Crea il tuo account</h1>
          <p className={styles.subtitle}>
            Iscriviti per entrare nel mondo Fantabimbo.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="email">Email</label>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v.217l8 5.053 8-5.053V7H4zm16 10V9.617l-7.445 4.7a1 1 0 0 1-1.11 0L4 9.617V17h16z" />
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nome@esempio.com"
                value={form.email}
                className={styles.input}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
          </div>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="password">Password</label>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1zm2-3v3h6V7a3 3 0 0 0-6 0zm7 5H8v6h8v-6z" />
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                className={styles.input}
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="confirm-password">Conferma password</label>
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputIcon} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  role="img"
                  focusable="false"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1zm2-3v3h6V7a3 3 0 0 0-6 0zm7 5H8v6h8v-6zm-6 2v2h4v-2H10z" />
                </svg>
              </span>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Ripeti la password"
                value={form.confirmPassword}
                className={styles.input}
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
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
              {isSubmitting ? "Registrazione in corso…" : "Registrati"}
            </button>
          </div>
        </form>
        <p className={styles.footer}>
          Hai già un account?
          <Link href="/login">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
