"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setUserProfile, updateProfile } from "../../store/user";
import { useAuth } from "../../providers/AuthProvider";
import styles from "./page.module.css";
import api from "../../lib/axios";
import { getStrapiMediaURL } from "../../lib/utils";
import type { AxiosError } from "axios";
import LoadingScreen from "../../components/LoadingScreen";
import BackIcon from "../../components/icons/BackIcon";
import { Button } from "../../components/Button";
import { processImage } from "../../lib/imageUtils";

export default function ProfiloClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  // Get auth status from AuthProvider
  const { isLoading: isHydrating } = useAuth();

  // Safe selector - avoid accessing Redux during SSR
  const user = useAppSelector((state) => state?.user?.profile ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Profile update state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

  const avatarRelativeUrl =
    user.avatar?.formats?.small?.url || user.avatar?.url;
  const avatarUrl = getStrapiMediaURL(avatarRelativeUrl);
  const displayName = user.displayName || "Utente";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Seleziona un file immagine valido.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'immagine deve essere inferiore a 5MB.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Processa l'immagine: corregge orientamento EXIF e ridimensiona
      const processedFile = await processImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        correctOrientation: true,
        resize: true,
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(processedFile);

      // Upload processed file
      await uploadAvatar(processedFile);
    } catch (error) {
      console.error("Error processing image:", error);
      setUploadError("Errore nel processamento dell'immagine. Riprova.");
      setIsUploading(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!user) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.post("/api/user-profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update Redux store with new avatar
      if (response.data?.avatar && user) {
        dispatch(
          setUserProfile({
            ...user,
            avatar: response.data.avatar,
          })
        );
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

      // Clear preview after success
      setTimeout(() => {
        setPreviewUrl(null);
      }, 1500);
    } catch (error) {
      const axiosError = error as AxiosError<{
        error?: { message?: string };
        message?: string;
      }>;
      console.error("Avatar upload failed", axiosError);
      console.error("Error response:", axiosError.response?.data);
      console.error("Error status:", axiosError.response?.status);

      const errorMessage =
        axiosError.response?.data?.error?.message ||
        axiosError.response?.data?.message ||
        "Impossibile caricare l'immagine. Riprova più tardi.";
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

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

      await dispatch(updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      })).unwrap();

      setUpdateSuccess(true);
      setIsEditing(false);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      setUpdateError(
        typeof error === "string" ? error : "Impossibile aggiornare il profilo. Riprova."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  function handleCancelEdit() {
    // Reset form to current values
    if (user?.displayName) {
      const parts = user.displayName.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
    setIsEditing(false);
    setUpdateError(null);
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Button
            variant="tertiary"
            onClick={() => {
              setIsNavigating(true);
              router.push("/");
            }}
            isLoading={isNavigating}
            className={styles.backLink}
          >
            <BackIcon size={20} /> Torna alla dashboard
          </Button>
          <h1 className={styles.title}>Il mio profilo</h1>
        </header>

        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={handleAvatarClick}
              disabled={isUploading}
            >
              {previewUrl || avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl || avatarUrl}
                  alt={displayName}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
              )}
              <div className={styles.avatarOverlay}>
                <span className={styles.avatarOverlayText}>
                  {isUploading ? "Caricamento..." : "Cambia foto"}
                </span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.fileInput}
              disabled={isUploading}
            />
          </div>
          <p className={styles.avatarHint}>
            Clicca sulla foto per cambiarla. Max 5MB.
          </p>
          {uploadError && (
            <p className={styles.error} role="alert">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className={styles.success} role="alert">
              ✓ Foto profilo aggiornata!
            </p>
          )}
        </div>

        <div className={styles.infoSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Informazioni personali</h2>
            {!isEditing && (
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                className={styles.editButton}
              >
                Modifica
              </Button>
            )}
          </div>

          {updateSuccess && (
            <p className={styles.success} role="alert">
              ✓ Profilo aggiornato con successo!
            </p>
          )}

          {isEditing ? (
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
                  required
                  disabled={isUpdating}
                />
              </div>

              {updateError && (
                <p className={styles.error} role="alert">
                  {updateError}
                </p>
              )}

              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isUpdating}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Salvataggio..." : "Salva modifiche"}
                </Button>
              </div>
            </form>
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Nome completo</span>
                <span className={styles.infoValue}>{displayName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{user.email || "N/A"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Tipo account</span>
                <span className={styles.infoValue}>
                  {user.userType === "parent" ? "Genitore" : "Giocatore"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
