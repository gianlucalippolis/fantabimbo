"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile } from "../store/user";
import api from "../lib/axios";
import type { Session } from "next-auth";
import LoadingScreen from "../components/LoadingScreen";

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
  userType?: "parent" | "player" | null;
};

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  error: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider globale per l'autenticazione e l'hydration del Redux store.
 * Gestisce una sola volta la sessione e popola il Redux store,
 * evitando chiamate ripetute a /api/auth/session in ogni pagina.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status: sessionStatus } = useSession();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.profile);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function hydrateStore() {
      // Se la sessione sta ancora caricando, aspetta
      if (sessionStatus === "loading") {
        setIsLoading(true);
        return;
      }

      // Se non c'è sessione, termina il loading
      if (!session) {
        setIsLoading(false);
        setIsHydrated(true);
        return;
      }

      // Se lo store è già popolato, non fare nulla
      if (user && user.id) {
        setIsLoading(false);
        setIsHydrated(true);
        return;
      }

      // Se già fatto l'hydration, non ripetere
      if (isHydrated) {
        setIsLoading(false);
        return;
      }

      // Store vuoto ma sessione presente: hydrate!
      try {
        setIsLoading(true);
        setError(null);

        const typedSession = session as SessionWithStrapi;
        const jwt = typedSession.jwt;

        if (!jwt) {
          throw new Error("JWT mancante nella sessione");
        }

        // Fetch user profile from API
        const response = await api.get("/api/users/me?populate=avatar", {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        const userData = response.data;

        // Costruisci il profilo utente
        const userProfile = {
          id: userData.id,
          displayName: userData.username || userData.email || "Utente",
          email: userData.email,
          userType: userData.userType || null,
          jwt: jwt, // Include JWT for API calls
          avatar: userData.avatar
            ? {
                url: userData.avatar.url,
                formats: userData.avatar.formats || null,
              }
            : null,
        };

        // Popola il Redux store
        dispatch(setUserProfile(userProfile));

        // Games will be fetched lazily by components that need them (e.g., home page)
        // No need to fetch here to avoid unnecessary API calls on every page

        setIsHydrated(true);
      } catch (err) {
        console.error("❌ Error hydrating Redux store:", err);
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setIsLoading(false);
      }
    }

    hydrateStore();
  }, [session, sessionStatus, user, dispatch, isHydrated]);

  const contextValue: AuthContextType = {
    isLoading,
    isAuthenticated: !!session && !!user,
    error,
  };

  // Show loading screen while hydrating to prevent 403 errors
  if (isLoading) {
    return (
      <AuthContext.Provider value={contextValue}>
        <LoadingScreen />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
