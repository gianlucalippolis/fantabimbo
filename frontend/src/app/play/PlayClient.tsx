"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingScreen from "../../components/LoadingScreen";
import { useAuth } from "../../providers/AuthProvider";
import { useAppSelector } from "../../store/hooks";
import ParentPlayClient from "./ParentPlayClient";
import PlayerPlayClient from "./PlayerPlayClient";

function PlayContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams?.get("game");

  const { isLoading: isHydrating } = useAuth();
  const userProfile = useAppSelector((state) => state.user.profile);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isHydrating || !mounted) {
    return <LoadingScreen />;
  }

  if (!gameId) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>ID partita mancante</p>
      </div>
    );
  }

  // Determina quale componente utilizzare basandosi sul tipo di utente
  const isParent = userProfile?.userType === "parent";

  if (isParent) {
    return <ParentPlayClient gameId={gameId} />;
  } else {
    return <PlayerPlayClient gameId={gameId} />;
  }
}

// Componente principale con Suspense boundary
export default function PlayPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayContent />
    </Suspense>
  );
}
