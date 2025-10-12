"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../app/page.module.css";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

interface UserDashboardProps {
  displayName: string;
  userEmail?: string | null;
}

export function UserDashboard({ displayName, userEmail }: UserDashboardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleMenu() {
    setMenuOpen((current) => !current);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>
              <Logo />
            </div>
          </div>
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
          <h1 className={styles.title}>Ciao, {displayName}!</h1>
          <p className={styles.subtitle}>Sei nella tua area Fantanome.</p>
          <section className={styles.tutorial}>
            <h2 className={styles.tutorialTitle}>Come funziona Fantanome</h2>
            <ol className={styles.tutorialList}>
              <li>Crea e personalizza la tua squadra di piccoli campioni.</li>
              <li>Scegli la formazione migliore in base alle partite.</li>
              <li>
                Ottieni punti in base alle prestazioni reali e scala la
                classifica.
              </li>
              <li>
                Sfida gli altri allenatori nelle leghe settimanali e stagionali.
              </li>
            </ol>
            <button
              type="button"
              className={`${styles.action} ${styles.primary} ${styles.tutorialButton}`}
            >
              Avvia il tutorial interattivo
            </button>
          </section>
          <div className={styles.actions}>
            <SignOutButton className={`${styles.action} ${styles.secondary}`}>
              Esci
            </SignOutButton>
          </div>
        </section>
      </main>
    </div>
  );
}
