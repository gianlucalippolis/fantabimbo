"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import styles from "../../styles/Login.module.css";
import { Button } from "components/Button";
import api from "../../lib/axios";
import { joinGame } from "../../lib/games";

const MIN_PASSWORD_LENGTH = 8;

type RegisterFormState = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: "parent" | "player" | "";
};

function RegisterContent() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const initialInviteCode = useMemo(() => {
    const codeFromQueryParams = searchParams?.get("code") || "";
    const inviteFromQueryParams = searchParams?.get("invite") || "";
    const initialCode =
      codeFromQueryParams.trim().toUpperCase() ??
      inviteFromQueryParams.trim().toUpperCase() ??
      "";

    if (typeof initialCode === "string") {
      return initialCode.trim().toUpperCase();
    }
    return "";
  }, [searchParams]);
  const [form, setForm] = useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingInvite, setIsCheckingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteGameName, setInviteGameName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const isInviteValid =
    form.accountType === "parent"
      ? true
      : Boolean(
          inviteCode && inviteGameName && !inviteError && !isCheckingInvite
        );

  useEffect(() => {
    setInviteCode(initialInviteCode);
  }, [initialInviteCode]);

  useEffect(() => {
    if (form.accountType !== "player") {
      setInviteError(null);
      setInviteGameName(null);
      setIsCheckingInvite(false);
      return;
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      setInviteError(null);
      setInviteGameName(null);
      setIsCheckingInvite(false);
      return;
    }

    let isMounted = true;

    async function validateInvite(code: string) {
      setIsCheckingInvite(true);
      setInviteError(null);
      setInviteGameName(null);
      try {
        const response = await api.get(
          `/api/games/validate?code=${encodeURIComponent(code)}`
        );
        if (!isMounted) {
          return;
        }

        if (response.status !== 200 || response.data.data.valid === false) {
          setInviteError("Codice invito non valido o scaduto.");
          return;
        }

        const gameName = response.data.data.name ?? "Partita Fantanome";
        setInviteGameName(gameName);
        setInviteError(null);
      } catch (validateError) {
        console.error("Invite validation failed", validateError);
        if (isMounted) {
          setInviteError(
            "Impossibile verificare il codice invito. Riprova più tardi."
          );
        }
      } finally {
        if (isMounted) {
          setIsCheckingInvite(false);
        }
      }
    }

    validateInvite(normalizedCode);

    return () => {
      isMounted = false;
    };
  }, [inviteCode, form.accountType]);

  function updateField<K extends keyof RegisterFormState>(
    field: K,
    value: RegisterFormState[K]
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
    if (field === "accountType") {
      const typedValue = value as RegisterFormState["accountType"];
      setInviteError(null);
      setInviteGameName(null);
      setIsCheckingInvite(false);
      if (typedValue === "parent") {
        setInviteCode("");
      } else if (typedValue === "player") {
        setInviteCode((current) => (current ? current : initialInviteCode));
      } else {
        setInviteCode(initialInviteCode);
      }
    }
  }

  function resetAccountType() {
    updateField("accountType", "" as RegisterFormState["accountType"]);
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

    const normalizedInviteCode = inviteCode.trim().toUpperCase();

    if (form.accountType === "player") {
      if (!normalizedInviteCode) {
        setError("Inserisci un codice invito valido.");
        return;
      }

      if (isCheckingInvite) {
        setError("Attendi la verifica del codice invito prima di procedere.");
        return;
      }

      if (inviteError) {
        setError(inviteError);
        return;
      }

      if (!inviteGameName) {
        setError("Codice invito non valido o non verificato.");
        return;
      }
    }

    if (form.accountType !== "parent" && form.accountType !== "player") {
      setError("Seleziona se sei genitore o giocatore.");
      return;
    }

    const selectedAccountType = form.accountType;

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
          userType: selectedAccountType,
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
        if (form.accountType === "player" && normalizedInviteCode) {
          try {
            const joinResponse = joinGame(normalizedInviteCode);
          } catch (joinError) {
            console.error("Failed to join via invite code", joinError);
            setError(
              "Registrazione completata, ma non è stato possibile usare il codice invito. Contatta chi ti ha invitato."
            );
            return;
          }
        }
        await router.replace("/completa-profilo");
      }
    } catch (registrationError) {
      console.error("Registration failed", registrationError);
      setError("Impossibile completare la registrazione. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!form.accountType) {
    return (
      <div className={styles.login}>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <h1 className={styles.title}>Che tipo di account vuoi creare?</h1>
            <p className={styles.subtitle}>
              Se sei un genitore puoi creare nuove partite; i giocatori hanno
              bisogno del codice invito ricevuto da un genitore.
            </p>
          </div>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="account-type-step"
                value="parent"
                onChange={() => updateField("accountType", "parent")}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>Sono un genitore</span>
                <span className={styles.radioDescription}>
                  Posso creare partite e invitare altri partecipanti.
                </span>
              </div>
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="account-type-step"
                value="player"
                onChange={() => updateField("accountType", "player")}
              />
              <div className={styles.radioContent}>
                <span className={styles.radioTitle}>Sono un giocatore</span>
                <span className={styles.radioDescription}>
                  Ho un codice invito per entrare in una partita esistente.
                </span>
              </div>
            </label>
          </div>
          <div className={styles.stepActions}>
            <Button href="/login" variant="secondary" fullWidth>
              Torna al login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>Crea il tuo account</h1>
          <p className={styles.subtitle}>
            Iscriviti per entrare nel mondo Fantanome.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <span>Tipo di account</span>
              <button
                type="button"
                className={styles.helperLink}
                onClick={resetAccountType}
              >
                Cambia
              </button>
            </div>
            <div className={styles.notice}>
              <p className={styles.noticeText}>
                Stai registrando un account{" "}
                <strong>
                  {form.accountType === "parent" ? "genitore" : "giocatore"}
                </strong>
                .
              </p>
              {form.accountType === "parent" ? (
                <p className={styles.noticeInfo}>
                  Non serve alcun codice invito: dopo l&apos;accesso potrai
                  creare una nuova partita e invitare chi vuoi tu.
                </p>
              ) : (
                <p className={styles.noticeInfo}>
                  Inserisci il codice invito ricevuto da un genitore per
                  completare la registrazione.
                </p>
              )}
            </div>
          </div>
          {form.accountType === "player" ? (
            <div className={styles.var}>
              <div className={styles.labelRow}>
                <label htmlFor="invite-code">Codice invito</label>
              </div>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    role="img"
                    focusable="false"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17 3a4 4 0 0 1 2.906 6.781l-1.47 1.471-1.414-1.414 1.47-1.47A2 2 0 0 0 17 5a2 2 0 0 0-1.414.586l-4.95 4.95A2 2 0 0 0 10 12a2 2 0 0 0 .586 1.414l1 1-1.414 1.414-1-1A4 4 0 0 1 9 12a4 4 0 0 1 1.172-2.828l4.95-4.95A4 4 0 0 1 17 3zm-5 7a4 4 0 0 1 1.172 2.828A4 4 0 0 1 12 15.828l-1.47 1.47 1.414 1.414 1.47-1.47A2 2 0 0 0 15 14a2 2 0 0 0-.586-1.414l-1-1L14.828 10l1 1A4 4 0 0 1 16 14a4 4 0 0 1-1.172 2.828l-4.95 4.95A4 4 0 0 1 6 20a4 4 0 0 1-2.906-6.781l1.47-1.47 1.414 1.414-1.47 1.47A2 2 0 0 0 6 18a2 2 0 0 0 1.414-.586l4.95-4.95A2 2 0 0 0 12 12a2 2 0 0 0-.586-1.414l-1-1L11.828 8l1 1z" />
                  </svg>
                </span>
                <input
                  id="invite-code"
                  name="invite-code"
                  type="text"
                  value={inviteCode}
                  className={styles.input}
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  placeholder="ES. FANTA23"
                  autoComplete="off"
                  maxLength={12}
                />
              </div>
              {isCheckingInvite ? (
                <p className={styles.noticeInfo}>
                  Verifica del codice in corso…
                </p>
              ) : inviteError ? (
                <p className={styles.noticeError}>{inviteError}</p>
              ) : inviteGameName ? (
                <p className={styles.noticeSuccess}>
                  Codice valido! Ti unirai a <strong>{inviteGameName}</strong>.
                </p>
              ) : null}
            </div>
          ) : null}
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
          <label className={styles.privacyConsent}>
            <input
              type="checkbox"
              checked={acceptedPrivacy}
              onChange={(event) => setAcceptedPrivacy(event.target.checked)}
            />
            <span>
              Dichiaro di aver letto e accettato la{" "}
              <a
                href="https://www.iubenda.com/privacy-policy/35656956"
                className="iubenda-white iubenda-noiframe iubenda-embed"
                title="Privacy Policy"
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>
          <div className={styles.actions}>
            <Button
              type="submit"
              disabled={isSubmitting || !isInviteValid || !acceptedPrivacy}
              fullWidth
            >
              {isSubmitting ? "Registrazione in corso…" : "Registrati"}
            </Button>
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

export default function Register() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
