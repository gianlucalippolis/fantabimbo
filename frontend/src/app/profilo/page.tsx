"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setUserProfile } from "../../store/user";
import { useReduxHydration } from "../../hooks/useReduxHydration";
import Link from "next/link";
import styles from "./page.module.css";
import api from "../../lib/axios";
import { getStrapiMediaURL } from "../../lib/utils";
import type { AxiosError } from "axios";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session, status } = useSession();
  const user = useAppSelector((state) => state.user.profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook per hydration automatica del Redux store
  const { isLoading: isHydrating } = useReduxHydration();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading" || isHydrating) {
      return;
    }

    if (status === "unauthenticated" || !session) {
      router.push("/login");
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }
  }, [status, session, user, router, isHydrating]);

  if (status === "loading" || isHydrating) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.loading}>Caricamento...</p>
        </div>
      </div>
    );
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

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadAvatar(file);
  }

  async function uploadAvatar(file: File) {
    if (!user) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadSuccess(false);

      const formData = new FormData();
      formData.append("avatar", file);

      console.log("Uploading avatar for user:", user.id);
      console.log("File:", file.name, file.type, file.size);

      const response = await api.post("/api/user-profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload response:", response.data);

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

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <header className={styles.header}>
          <Link className={styles.backLink} href="/">
            ← Torna alla dashboard
          </Link>
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
          <h2 className={styles.sectionTitle}>Informazioni</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Nome</span>
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
        </div>
      </div>
    </div>
  );
}
