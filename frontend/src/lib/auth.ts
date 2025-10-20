import type { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { getStrapiConfig } from "./env";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

type ExtendedJWT = JWT & {
  jwt?: string;
  id?: number | string;
  profileFetchedAt?: number;
  userType?: "parent" | "player" | null;
};

type ExtendedSession = Session & {
  jwt?: string;
  id?: number | string;
  userType?: "parent" | "player" | null;
};

interface StrapiAuthResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    userType?: "parent" | "player" | null;
  };
}

interface StrapiUserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: {
    url: string;
  } | null;
  userType?: "parent" | "player" | null;
}

interface StrapiAuthorizedUser {
  id: string;
  name: string;
  email: string;
  jwt: string;
  firstName?: string | null;
  lastName?: string | null;
  userType?: "parent" | "player" | null;
}

async function authenticateWithStrapi(
  identifier: string,
  password: string
): Promise<StrapiAuthResponse> {
  const endpoint = `${STRAPI_API_URL}/api/auth/local`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.message ??
      "Unable to authenticate with Strapi";
    throw new Error(message);
  }

  if (!payload?.jwt || !payload?.user) {
    throw new Error("Malformed Strapi authentication response");
  }

  return payload as StrapiAuthResponse;
}

async function fetchStrapiUserProfile(jwt: string): Promise<StrapiUserProfile> {
  if (!STRAPI_API_URL) {
    throw new Error("Missing STRAPI_API_URL environment variable");
  }

  const endpoint = `${STRAPI_API_URL}/api/users/me?populate=*`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch Strapi user profile");
  }

  return response.json();
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXT_PUBLIC_STRAPI_API_TOKEN,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login", // Reindirizza alla pagina di login in caso di errore
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Strapi",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier;

        if (!identifier || !credentials?.password) {
          throw new Error("Email e password sono obbligatori");
        }

        const { jwt, user } = await authenticateWithStrapi(
          identifier,
          credentials.password
        );

        const displayName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          id: user.id.toString(),
          name: displayName || user.username,
          email: user.email,
          jwt,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const mutableToken = token as ExtendedJWT;

      if (user) {
        // Se è un login con Google
        if (account?.provider === "google") {
          // Registra o recupera l'utente su Strapi
          try {
            const strapiCallbackUrl = `${STRAPI_API_URL}/api/auth/${account.provider}/callback?access_token=${account.access_token}`;

            const strapiResponse = await fetch(strapiCallbackUrl, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            const strapiData = await strapiResponse.json();

            if (!strapiResponse.ok) {
              console.error("Errore risposta Strapi:", strapiData);
              throw new Error(
                strapiData?.error?.message ||
                  "Errore durante la connessione con Strapi"
              );
            }

            if (strapiData.jwt && strapiData.user) {
              // Verifica se firstName e lastName sono presenti
              const hasFirstName =
                strapiData.user.firstName && strapiData.user.firstName.trim();
              const hasLastName =
                strapiData.user.lastName && strapiData.user.lastName.trim();

              // Se mancano nome o cognome, aggiornali con i dati di Google
              if (!hasFirstName || !hasLastName) {
                // Estrai nome e cognome dal nome completo di Google
                const fullName = user.name || "";
                const nameParts = fullName.split(" ");
                const firstName =
                  !hasFirstName && nameParts.length > 0
                    ? nameParts[0]
                    : strapiData.user.firstName;
                const lastName =
                  !hasLastName && nameParts.length > 1
                    ? nameParts.slice(1).join(" ")
                    : strapiData.user.lastName;

                try {
                  // Aggiorna l'utente in Strapi con nome e cognome
                  const updateResponse = await fetch(
                    `${STRAPI_API_URL}/api/users/${strapiData.user.id}`,
                    {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${strapiData.jwt}`,
                      },
                      body: JSON.stringify({
                        firstName: firstName || strapiData.user.firstName,
                        lastName: lastName || strapiData.user.lastName,
                      }),
                    }
                  );

                  if (updateResponse.ok) {
                    const updatedUser = await updateResponse.json();
                    strapiData.user.firstName = updatedUser.firstName;
                    strapiData.user.lastName = updatedUser.lastName;
                  } else {
                    console.warn(
                      "Impossibile aggiornare nome e cognome in Strapi"
                    );
                  }
                } catch (updateError) {
                  console.error(
                    "Errore durante l'aggiornamento dell'utente:",
                    updateError
                  );
                  // Continua comunque con i dati disponibili
                }
              }

              mutableToken.jwt = strapiData.jwt;
              const numericId = Number(strapiData.user.id);
              mutableToken.id = Number.isNaN(numericId)
                ? strapiData.user.id
                : numericId;
              token.name =
                [strapiData.user.firstName, strapiData.user.lastName]
                  .filter(Boolean)
                  .join(" ")
                  .trim() ||
                strapiData.user.username ||
                token.name;
              token.email = strapiData.user.email;
              mutableToken.userType = strapiData.user.userType ?? null;
              mutableToken.profileFetchedAt = Date.now();
            } else {
              console.error("JWT o user mancanti nella risposta di Strapi");
              throw new Error("Risposta Strapi incompleta");
            }
          } catch (error) {
            console.error("Error connecting Google account to Strapi:", error);
            throw new Error("Impossibile collegare l'account Google. Riprova.");
          }
        } else {
          // Login con credenziali
          const strapiUser = user as StrapiAuthorizedUser;
          mutableToken.jwt = strapiUser.jwt;
          const numericId = Number(strapiUser.id);
          mutableToken.id = Number.isNaN(numericId) ? strapiUser.id : numericId;
          const displayName =
            strapiUser.name ||
            [strapiUser.firstName, strapiUser.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
          token.name = displayName || token.name;
          token.email = strapiUser.email;
          mutableToken.profileFetchedAt = 0;
          mutableToken.userType = strapiUser.userType ?? null;
        }
      }

      if (!mutableToken.jwt) {
        return token;
      }

      const lastFetch = Number(mutableToken.profileFetchedAt ?? 0);
      const shouldRefreshProfile =
        Number.isNaN(lastFetch) ||
        lastFetch <= 0 ||
        Date.now() - lastFetch > 5 * 60 * 1000;

      if (shouldRefreshProfile) {
        try {
          const profile = await fetchStrapiUserProfile(
            mutableToken.jwt as string
          );
          const profileDisplayName =
            [profile.firstName, profile.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || profile.username;
          token.name = profileDisplayName;
          token.email = profile.email;
          token.picture = profile.avatar?.url ?? null;
          mutableToken.profileFetchedAt = Date.now();
          mutableToken.userType =
            profile.userType ?? mutableToken.userType ?? null;
        } catch (error) {
          console.error("Failed to refresh Strapi profile", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedJWT;
      const extendedSession = session as ExtendedSession;

      const jwt = extendedToken.jwt;
      const id = extendedToken.id;

      if (extendedSession.user) {
        extendedSession.user.name =
          typeof token.name === "string"
            ? token.name
            : extendedSession.user.name;
        extendedSession.user.email =
          typeof token.email === "string"
            ? token.email
            : extendedSession.user.email;
        extendedSession.user.image =
          typeof token.picture === "string"
            ? token.picture
            : extendedSession.user.image ?? undefined;
      }

      extendedSession.jwt = jwt;
      extendedSession.id = id;
      extendedSession.userType =
        typeof extendedToken.userType === "string"
          ? (extendedToken.userType as "parent" | "player")
          : null;

      return extendedSession;
    },
  },
};
