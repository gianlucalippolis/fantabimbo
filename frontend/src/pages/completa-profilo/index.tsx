import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { FormEvent, useMemo, useState } from "react";
import styles from "../../styles/Login.module.css";
import { authOptions } from "../../lib/auth";
import { getStrapiConfig } from "../../lib/env";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { joinGameByCode, setUserProfile } from "../../store/user";
import { Button } from "components/Button";

type UserType = "parent" | "player" | null;
type Step = "profile" | "invite";

interface CompleteProfileProps {
  firstName: string;
  lastName: string;
  strapiApiUrl: string | null;
  inviteCode: string;
  userType: UserType;
}

export default function CompleteProfile({
  firstName: initialFirstName,
  lastName: initialLastName,
  strapiApiUrl,
  inviteCode,
  userType,
}: CompleteProfileProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const dispatch = useAppDispatch();
  const profileFromStore = useAppSelector((state) => state.user.profile);

  const isPlayer = userType === "player";
  const initialInviteCode = useMemo(
    () => inviteCode.trim().toUpperCase(),
    [inviteCode]
  );

  const [step, setStep] = useState<Step>("profile");
  const [profileCompleted, setProfileCompleted] = useState(false);

  const [form, setForm] = useState({
    firstName: initialFirstName,
    lastName: initialLastName,
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inviteCodeInput, setInviteCodeInput] = useState(initialInviteCode);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  function updateProfileField(field: "firstName" | "lastName", value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (profileError) {
      setProfileError(null);
    }
    if (profileSuccess) {
      setProfileSuccess(null);
    }
  }

  const hydrateProfile = async (jwt: string): Promise<boolean> => {
    if (!strapiApiUrl) {
      return false;
    }

    try {
      const meResponse = await fetch(
        `${strapiApiUrl}/api/users/me?populate=avatar`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (!meResponse.ok) {
        return false;
      }

      const userData = await meResponse.json();

      if (!userData || typeof userData !== "object") {
        return false;
      }

      const avatarData =
        userData.avatar && typeof userData.avatar === "object"
          ? userData.avatar
          : null;

      dispatch(
        setUserProfile({
          id: userData.id,
          displayName: userData.username || userData.email || "Utente",
          email: userData.email ?? null,
          userType: userData.userType ?? null,
          jwt,
          avatar:
            avatarData && "url" in avatarData
              ? {
                  url: (avatarData as { url: string }).url,
                  formats:
                    (avatarData as { formats?: unknown }).formats || null,
                }
              : null,
        })
      );

      return true;
    } catch (error) {
      console.error("Failed to hydrate user profile", error);
      return false;
    }
  };

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setProfileError("Nome e cognome sono obbligatori.");
      return;
    }

    if (!strapiApiUrl) {
      setProfileError(
        "Configurazione di Strapi non disponibile. Contatta l'assistenza."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setProfileError(null);

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
        setProfileError(
          "Sessione non valida. Effettua nuovamente l'accesso prima di aggiornare il profilo."
        );
        return;
      }

      const response = await fetch(
        `${strapiApiUrl}/api/users/${numericUserId}`,
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
        setProfileError(message);
        return;
      }

      const hydrated = await hydrateProfile(strapiJwt);

      if (!hydrated) {
        setProfileError(
          "Profilo aggiornato, ma non è stato possibile sincronizzare i dati. Riprova più tardi."
        );
        return;
      }

      setProfileCompleted(true);

      if (isPlayer) {
        setStep("invite");
        setInviteError(null);
        setInviteSuccess(null);
        return;
      }

      setProfileSuccess("Profilo aggiornato! Ti reindirizziamo alla dashboard…");
      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (error) {
      console.error("Complete profile failed", error);
      setProfileError(
        "Impossibile aggiornare il profilo. Riprova più tardi."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isJoining) {
      return;
    }

    if (!profileCompleted) {
      setInviteError("Completa prima il tuo profilo.");
      return;
    }

    const normalizedCode = inviteCodeInput.trim().toUpperCase();

    if (!normalizedCode) {
      setInviteError("Inserisci un codice invito valido oppure salta l'operazione.");
      return;
    }

    try {
      setIsJoining(true);
      setInviteError(null);
      setInviteSuccess(null);

      await dispatch(
        joinGameByCode({
          inviteCode: normalizedCode,
          userId: profileFromStore?.id ?? null,
        })
      ).unwrap();

      setInviteSuccess("Fatto! Ti reindirizziamo alla dashboard…");
      setTimeout(() => {
        router.replace("/");
      }, 800);
    } catch (error) {
      console.error("Joining game via invite failed", error);
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message || "Impossibile usare il codice invito."
            : "Impossibile usare il codice invito. Riprova più tardi.";
      setInviteError(message);
    } finally {
      setIsJoining(false);
    }
  }

  function handleSkipInvite() {
    router.replace("/");
  }

  return (
    <div className={styles.login}>
      <div className={styles.wrapper}>
        {step === "profile" ? (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Completa il profilo</h1>
              <p className={styles.subtitle}>
                Raccontaci come ti chiami per personalizzare l&apos;esperienza
                Fantanome.
              </p>
            </div>
            <form className={styles.form} onSubmit={handleProfileSubmit}>
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
                      updateProfileField("firstName", event.target.value)
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
                      updateProfileField("lastName", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className={styles.error} aria-live="polite">
                {profileError}
              </div>
              {profileSuccess && (
                <div className={styles.success} aria-live="polite">
                  {profileSuccess}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Salvataggio in corso…" : "Continua"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>Hai un codice invito?</h1>
              <p className={styles.subtitle}>
                Inseriscilo per unirti subito alla tua partita. Puoi anche
                saltare questo passaggio e farlo più tardi.
              </p>
            </div>
            <form className={styles.form} onSubmit={handleInviteSubmit}>
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
                    value={inviteCodeInput}
                    className={styles.input}
                    onChange={(event) => {
                      setInviteCodeInput(event.target.value.toUpperCase());
                      if (inviteError) {
                        setInviteError(null);
                      }
                      if (inviteSuccess) {
                        setInviteSuccess(null);
                      }
                    }}
                    placeholder="ES. FANTA23"
                    autoComplete="off"
                    maxLength={12}
                  />
                </div>
              </div>
              <div className={styles.error} aria-live="polite">
                {inviteError}
              </div>
              {inviteSuccess && (
                <div className={styles.success} aria-live="polite">
                  {inviteSuccess}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  type="submit"
                  disabled={isJoining}
                >
                  {isJoining ? "Verifica in corso…" : "Unisciti alla partita"}
                </button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={handleSkipInvite}
                  disabled={isJoining}
                >
                  Salta per ora
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<
  CompleteProfileProps
> = async (context) => {
  const { apiUrl: strapiUrl } = getStrapiConfig({ required: false });
  const inviteParam = context.query?.invite ?? context.query?.code;
  const inviteCode =
    typeof inviteParam === "string" ? inviteParam.trim().toUpperCase() : "";

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
  let userType: UserType =
    typeof session?.userType === "string" ? session.userType : null;

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
        userType =
          typeof profile?.userType === "string" ? profile.userType : userType;
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
      inviteCode,
      userType,
    },
  };
};
