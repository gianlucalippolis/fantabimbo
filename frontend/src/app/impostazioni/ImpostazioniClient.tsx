"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { updateProfile } from "../../store/user";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./page.module.css";
import LoadingScreen from "../../components/LoadingScreen";
import BackIcon from "../../components/icons/BackIcon";
import { Button } from "../../components/Button";

export default function ImpostazioniClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Get auth status from AuthProvider
  const { isLoading: isHydrating } = useAuth();

  // Safe selector - avoid accessing Redux during SSR
  const user = useAppSelector((state) => state?.user?.profile ?? null);

  // Profile update state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize form with current user data
  useEffect(() => {
    if (user?.displayName) {
      const parts = user.displayName.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [user?.displayName]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrating) {
      return;
    }

    // If hydration is complete but no user in Redux, redirect to login
    if (!user) {
      router.push("/login");
      return;
    }
  }, [user, router, isHydrating]);

  if (isHydrating) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const displayName = user.displayName || "Utente";

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isUpdating) {
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setUpdateError("Nome e cognome sono obbligatori");
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      await dispatch(
        updateProfile({
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
        })
      ).unwrap();

      setUpdateSuccess(true);

      // Hide success message and redirect after 2 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
        router.push("/profilo");
      }, 2000);
    } catch (error) {
      setUpdateError(
        typeof error === "string"
          ? error
          : "Impossibile aggiornare il profilo. Riprova."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Button
            variant="tertiary"
            onClick={() => {
              setIsNavigating(true);
              router.push("/profilo");
            }}
            isLoading={isNavigating}
            className={styles.backLink}
          >
            <BackIcon size={20} /> Torna al profilo
          </Button>
          <h1 className={styles.title}>Impostazioni profilo</h1>
          <p className={styles.subtitle}>Modifica le tue informazioni personali</p>
        </header>

        <div className={styles.currentInfo}>
          <h2 className={styles.sectionTitle}>Informazioni attuali</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nome completo</span>
              <span className={styles.infoValue}>{displayName}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Modifica dati</h2>

          {updateSuccess && (
            <div className={styles.success} role="alert">
              ✓ Profilo aggiornato con successo! Reindirizzamento in corso...
            </div>
          )}

          <form onSubmit={handleProfileUpdate} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.label}>
                Nome
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (updateError) setUpdateError(null);
                }}
                className={styles.input}
                placeholder="Inserisci il tuo nome"
                required
                disabled={isUpdating}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.label}>
                Cognome
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (updateError) setUpdateError(null);
                }}
                className={styles.input}
                placeholder="Inserisci il tuo cognome"
                required
                disabled={isUpdating}
              />
            </div>

            {updateError && (
              <div className={styles.error} role="alert">
                {updateError}
              </div>
            )}

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  setIsNavigating(true);
                  router.push("/profilo");
                }}
                disabled={isUpdating || isNavigating}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isUpdating}
                disabled={isUpdating || isNavigating}
              >
                {isUpdating ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

