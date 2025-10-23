import type { Session } from "next-auth";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { Suspense, useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "../store";
import { AuthProvider } from "../providers/AuthProvider";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session | null }>) {
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
      <SessionProvider
        session={session}
        refetchInterval={0}
        refetchOnWindowFocus={false}
      >
        <AuthProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Component {...pageProps} />
          </Suspense>
        </AuthProvider>
      </SessionProvider>
    </ReduxProvider>
  );
}
