import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FormEvent, useState } from "react";
import styles from "../../styles/Login.module.css";
import Link from "next/link";
import { Logo } from "components/Logo";

export default function Login() {
  const router = useRouter();
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedIdentifier = credentials.identifier.trim();
    if (!trimmedIdentifier || !credentials.password) {
      setLoginError("Email e password sono obbligatorie");
      return;
    }

    try {
      setIsSubmitting(true);
      setLoginError(null);

      const response = await signIn("credentials", {
        redirect: false,
        identifier: trimmedIdentifier,
        password: credentials.password,
      });

      if (!response) {
        setLoginError("Errore inatteso durante l'accesso");
        return;
      }

      if (response.error) {
        setLoginError(response.error);
        return;
      }

      if (response.ok) {
        await router.replace("/");
      }
    } catch (error) {
      console.error("Login failed", error);
      setLoginError("Impossibile completare il login. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateCredential(field: "identifier" | "password", value: string) {
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (loginError) {
      setLoginError(null);
    }
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Logo />
          <h1 className={styles.title}>Benvenuti su Fantanome!</h1>
          <p className={styles.subtitle}>
            {/* Un gioco per genitori e amici che vogliono indovinare il nome
            perfetto!
            <br />I genitori caricano i loro 10 nomi preferiti, i giocatori
            cercano di scoprirli e guadagnano punti a ogni colpo indovinato. */}
            La sfida dei nomi sta per iniziare! <br />
            Riuscirai a trovare il nome perfetto prima degli altri?
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.var}>
            <div className={styles.labelRow}>
              <label htmlFor="identifier">Email</label>
              <a className={styles.helperLink} href="/password-dimenticata">
                Password dimenticata?
              </a>
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
                id="identifier"
                name="identifier"
                type="email"
                autoComplete="email"
                placeholder="nome@esempio.com"
                value={credentials.identifier}
                className={styles.input}
                onChange={(event) =>
                  updateCredential("identifier", event.target.value)
                }
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
                autoComplete="current-password"
                placeholder="••••••••"
                value={credentials.password}
                className={styles.input}
                onChange={(event) =>
                  updateCredential("password", event.target.value)
                }
              />
            </div>
          </div>
          <div className={styles.error} aria-live="polite">
            {loginError}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Accesso in corso…" : "Accedi"}
            </button>
          </div>
        </form>
        <p className={styles.footer}>
          Non hai ancora un account?
          <Link href="/registrazione">Registrati subito</Link>
        </p>
      </div>
    </div>
  );
}
