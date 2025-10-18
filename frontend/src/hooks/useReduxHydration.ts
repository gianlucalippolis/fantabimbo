import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUserProfile, fetchGames } from "../store/user";
import api from "../lib/axios";
import type { Session } from "next-auth";

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
  userType?: "parent" | "player" | null;
};

/**
 * Hook personalizzato per gestire l'hydration del Redux store
 * quando una pagina viene accessata direttamente (non dalla home).
 *
 * Controlla se il Redux store è vuoto ma la sessione è attiva,
 * e in quel caso carica i dati utente dall'API e popola lo store.
 *
 * @returns {Object} - { isLoading: boolean, error: string | null }
 */
export function useReduxHydration() {
  const { data: session, status: sessionStatus } = useSession();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.profile);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function hydrateStore() {
      // Se la sessione sta ancora caricando, aspetta
      if (sessionStatus === "loading") {
        setIsLoading(true);
        return;
      }

      // Se non c'è sessione, non fare nulla
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Se lo store è già popolato, non fare nulla
      if (user && user.id) {
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
          avatar: userData.avatar
            ? {
                url: userData.avatar.url,
                formats: userData.avatar.formats || null,
              }
            : null,
        };

        // Popola il Redux store
        dispatch(setUserProfile(userProfile));

        // Fetch games - importante per le pagine che mostrano le partite
        if (jwt) {
          dispatch(fetchGames(jwt));
        }

        console.log("✅ Redux store hydrated successfully from session");
      } catch (err) {
        console.error("❌ Error hydrating Redux store:", err);
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
      } finally {
        setIsLoading(false);
      }
    }

    hydrateStore();
  }, [session, sessionStatus, user, dispatch]);

  return { isLoading, error };
}
