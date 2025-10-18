"use client";

import { SessionProvider } from "next-auth/react";
import { Provider as ReduxProvider } from "react-redux";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { store } from "../store";
import { AuthProvider } from "../providers/AuthProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      (process.env.NODE_ENV === "production" ||
        window.location.hostname === "localhost")
    ) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        } catch (error) {
          console.error("Service worker registration failed", error);
        }
      };

      register();
    }
  }, []);

  return (
    <ReduxProvider store={store}>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
        <AuthProvider>{children}</AuthProvider>
      </SessionProvider>
    </ReduxProvider>
  );
}
