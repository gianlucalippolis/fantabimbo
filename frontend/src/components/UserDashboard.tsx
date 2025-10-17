"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "../app/page.module.css";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";
import { GamesManager } from "./GamesManager";
import { useAppSelector } from "../store/hooks";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const tutorialSteps = useMemo(
    () => [
      {
        title: "Prepara la rosa",
        description:
          "Seleziona i tuoi giovani talenti e bilancia i ruoli: avrai bisogno di portieri affidabili, difensori solidi e attaccanti fantasiosi.",
      },
      {
        title: "Imposta la formazione",
        description:
          "Ogni giornata scegli modulo, titolari e riserve. Controlla lo stato di forma e gli avversari reali per massimizzare il punteggio.",
      },
      {
        title: "Guadagna punti reali",
        description:
          "Le prestazioni sul campo diventano punti Fantanome: goal, assist, parate e tanto altro alimentano la tua classifica.",
      },
      {
        title: "Scala la classifica",
        description:
          "Sfida gli altri allenatori nelle leghe settimanali e stagionali, completa missioni extra e conquista i premi esclusivi.",
      },
    ],
    []
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
              <h1 className={styles.title}>Ciao, {displayName}!</h1>
              <p className={styles.subtitle}>
                Sei nella tua area Fantanome. Presto potrai gestire la rosa,
                monitorare le prestazioni e sfidare gli altri allenatori.
              </p>
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
              <div className={styles.actions}>
                <button
                  className={`${styles.action} ${styles.primary}`}
                  type="button"
                  disabled
                >
                  Gestisci squadra (presto disponibile)
                </button>
                <SignOutButton
                  className={`${styles.action} ${styles.secondary}`}
                >
                  Esci
                </SignOutButton>
              </div>
            </div>
            <section
              className={`${styles.tutorial} ${styles.dashboardTutorial}`}
            >
              <h2 className={styles.tutorialTitle}>Come funziona Fantanome</h2>
              <ol className={styles.tutorialList}>
                <li>Crea e personalizza la tua squadra di piccoli campioni.</li>
                <li>Scegli la formazione migliore in base alle partite.</li>
                <li>
                  Ottieni punti in base alle prestazioni reali e scala la
                  classifica.
                </li>
                <li>
                  Sfida gli altri allenatori nelle leghe settimanali e
                  stagionali.
                </li>
              </ol>
              <button
                type="button"
                className={`${styles.action} ${styles.primary} ${styles.tutorialButton}`}
                onClick={openTutorial}
              >
                Avvia il tutorial interattivo
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
