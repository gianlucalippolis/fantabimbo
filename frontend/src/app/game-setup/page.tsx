"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "../../components/LoadingScreen";

const GameSetupClient = dynamic(() => import("./GameSetupClient"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function GameSetupPage() {
  return <GameSetupClient />;
}
