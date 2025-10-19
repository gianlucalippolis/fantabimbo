"use client";

import dynamic from "next/dynamic";
import LoadingScreen from "../../components/LoadingScreen";

const PlayClient = dynamic(() => import("./PlayClient"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

export default function PlayPage() {
  return <PlayClient />;
}
