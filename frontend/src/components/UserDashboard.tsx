"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "../app/page.module.css";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { GamesManager } from "./GamesManager";
import { useAppSelector } from "../store/hooks";
import Avatar from "./Avatar";
import { getStrapiMediaURL } from "../lib/utils";

interface UserDashboardProps {
  displayName: string;
  userEmail?: string | null;
  userId: string | number;
  inviteBaseUrl: string;
  canCreateGames: boolean;
  userType: "parent" | "player" | null;
}

export function UserDashboard({
  displayName,
  userEmail,
  userId,
  inviteBaseUrl,
  canCreateGames,
  userType,
}: UserDashboardProps) {
  const games = useAppSelector((state) => state.user.games);
  const userProfile = useAppSelector((state) => state.user.profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const avatarRelativeUrl =
    userProfile?.avatar?.formats?.small?.url || userProfile?.avatar?.url;
  const avatarUrl = getStrapiMediaURL(avatarRelativeUrl);

  const tutorialSteps = useMemo(
    () => [
      {
        title: "Crea o unisciti a una partita",
        description: canCreateGames
          ? "Come genitore, crea una nuova partita e condividi il codice invito con i partecipanti. Imposta quando il nome verrà rivelato!"
          : "Inserisci il codice invito ricevuto dai genitori per unirti alla partita e iniziare a indovinare!",
      },
      {
        title: "Compila la tua lista di nomi",
        description:
          "Scegli fino a 10 nomi e disponili nell'ordine che preferisci. La posizione è importante per il punteggio finale!",
      },
      {
        title: "Sistema di punteggio",
        description:
          "Guadagni: 100 punti se indovini il nome esatto del bambino al 1° posto, 50 punti se lo indovini in qualsiasi altra posizione, 20 punti per ogni nome nella posizione corretta, 10 punti se un nome è a una sola posizione di distanza.",
      },
      {
        title: "Rivelazione e classifica",
        description:
          "Allo scadere del countdown, il nome del bambino viene rivelato e puoi vedere la classifica con i punteggi di tutti i partecipanti!",
      },
    ],
    [canCreateGames]
  );

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function openTutorial() {
    setTutorialStep(0);
    setTutorialOpen(true);
    setMenuOpen(false);
  }

  function closeTutorial() {
    setTutorialOpen(false);
  }

  function goToNextStep() {
    setTutorialStep((current) =>
      Math.min(current + 1, tutorialSteps.length - 1)
    );
  }

  function goToPreviousStep() {
    setTutorialStep((current) => Math.max(current - 1, 0));
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <Logo />
            </div>
            <Link href="/profilo" className={styles.headerAvatarLink}>
              <Avatar imageUrl={avatarUrl} name={displayName} size="small" />
            </Link>
            <div className={styles.brandText}>
              <span className={styles.brandGreeting}>Ciao,</span>
              <span className={styles.brandName}>{displayName}</span>
              {userEmail ? (
                <span className={styles.brandEmail}>{userEmail}</span>
              ) : null}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={`${styles.headerTutorial} ${styles.primary}`}
              onClick={openTutorial}
            >
              Apri tutorial
            </button>
            <button
              type="button"
              className={`${styles.hamburger} ${
                menuOpen ? styles.hamburgerOpen : ""
              }`}
              onClick={toggleMenu}
              aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
              aria-expanded={menuOpen}
              aria-controls="dashboard-menu"
            >
              <span className={styles.hamburgerLine} />
            </button>
          </div>
          <nav
            id="dashboard-menu"
            className={`${styles.menu} ${menuOpen ? styles.menuOpen : ""}`}
            aria-label="Menu principale"
          >
            <ul className={styles.menuList}>
              <li className={styles.menuItem}>
                <Link href="/" className={styles.menuLink} onClick={closeMenu}>
                  Dashboard
                </Link>
              </li>
              <li className={styles.menuItem}>
                <Link
                  href="/profilo"
                  className={styles.menuLink}
                  onClick={closeMenu}
                >
                  Il mio profilo
                </Link>
              </li>
              <li className={styles.menuItem}>
                <button
                  type="button"
                  className={styles.menuButton}
                  onClick={openTutorial}
                >
                  Tutorial
                </button>
              </li>
              <li className={styles.menuItem}>
                <button type="button" className={styles.menuButton} disabled>
                  Gestisci squadra (presto)
                </button>
              </li>
              <li className={styles.menuItem}>
                <SignOutButton className={styles.menuButton}>
                  Esci
                </SignOutButton>
              </li>
            </ul>
            {userEmail ? <p className={styles.menuEmail}>{userEmail}</p> : null}
          </nav>
        </div>
      </header>
      {menuOpen ? (
        <button
          type="button"
          className={styles.menuOverlay}
          aria-hidden="true"
          onClick={closeMenu}
        />
      ) : null}
      <main className={styles.main}>
        <section className={styles.dashboardCard}>
          <div className={styles.dashboardGrid}>
            <div className={styles.dashboardIntro}>
              <div className={styles.dashboardHeader}>
                <Link href="/profilo" className={styles.avatarLink}>
                  <Avatar
                    imageUrl={avatarUrl}
                    name={displayName}
                    size="large"
                  />
                  <span className={styles.avatarEditHint}>Modifica foto</span>
                </Link>
                <div>
                  <h1 className={styles.title}>Ciao, {displayName}!</h1>
                  {userType ? (
                    <span
                      className={`${styles.roleBadge} ${
                        userType === "parent"
                          ? styles.roleBadgeParent
                          : styles.roleBadgePlayer
                      }`}
                    >
                      Ruolo:&nbsp;
                      {userType === "parent" ? "Genitore" : "Giocatore"}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className={styles.subtitle}>
                Sei nella tua area Fantanome. Presto potrai gestire la rosa,
                monitorare le prestazioni e sfidare gli altri allenatori.
              </p>
            </div>
            <section
              className={`${styles.tutorial} ${styles.dashboardTutorial}`}
            >
              <h2 className={styles.tutorialTitle}>Come funziona Fantanome</h2>
              <ol className={styles.tutorialList}>
                <li>
                  {canCreateGames
                    ? "Crea una partita e condividi il codice invito con amici e parenti."
                    : "Unisciti a una partita usando il codice invito ricevuto dai genitori."}
                </li>
                <li>
                  Compila la tua lista con fino a 10 nomi, l&apos;ordine è
                  importante!
                </li>
                <li>
                  Guadagna punti indovinando il nome del bambino e la posizione
                  dei nomi.
                </li>
                <li>
                  Quando scade il countdown, scopri il nome del bambino e la
                  classifica finale!
                </li>
              </ol>
              <button
                type="button"
                className={`${styles.action} ${styles.primary} ${styles.tutorialButton}`}
                onClick={openTutorial}
              >
                Scopri di più
              </button>
            </section>
          </div>
          <GamesManager
            games={games}
            userId={userId}
            inviteBaseUrl={inviteBaseUrl}
            canCreateGames={canCreateGames}
          />
        </section>
      </main>
      {tutorialOpen ? (
        <>
          <div className={styles.tutorialBackdrop} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-dialog-title"
            className={styles.tutorialDialog}
          >
            <header className={styles.tutorialDialogHeader}>
              <div>
                <span className={styles.tutorialDialogProgress}>
                  Passo {tutorialStep + 1} di {tutorialSteps.length}
                </span>
                <h2
                  id="tutorial-dialog-title"
                  className={styles.tutorialDialogTitle}
                >
                  {tutorialSteps[tutorialStep].title}
                </h2>
              </div>
              <button
                type="button"
                className={styles.tutorialDialogClose}
                onClick={closeTutorial}
                aria-label="Chiudi tutorial"
              >
                ×
              </button>
            </header>
            <div className={styles.tutorialDialogBody}>
              <p>{tutorialSteps[tutorialStep].description}</p>
            </div>
            <footer className={styles.tutorialDialogFooter}>
              <button
                type="button"
                className={styles.tutorialDialogSecondary}
                onClick={tutorialStep === 0 ? closeTutorial : goToPreviousStep}
              >
                {tutorialStep === 0 ? "Esci" : "Indietro"}
              </button>
              <button
                type="button"
                className={styles.tutorialDialogPrimary}
                onClick={
                  tutorialStep === tutorialSteps.length - 1
                    ? closeTutorial
                    : goToNextStep
                }
              >
                {tutorialStep === tutorialSteps.length - 1
                  ? "Ho capito!"
                  : "Avanti"}
              </button>
            </footer>
          </div>
        </>
      ) : null}
    </div>
  );
}
