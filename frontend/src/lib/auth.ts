import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getStrapiConfig } from "./env";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

interface StrapiAuthResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
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
}

interface StrapiAuthorizedUser {
  id: string;
  name: string;
  email: string;
  jwt: string;
  firstName?: string | null;
  lastName?: string | null;
}

async function authenticateWithStrapi(
  identifier: string,
  password: string
): Promise<StrapiAuthResponse> {
  const response = await fetch(`${STRAPI_API_URL}/api/auth/local`, {
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

  const response = await fetch(`${STRAPI_API_URL}/api/users/me?populate=*`, {
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
  secret: process.env.STRAPI_API_TOKEN,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Strapi",
      credentials: {
        identifier: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier =
          credentials?.identifier ??
          credentials?.email ??
          credentials?.username;

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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const mutableToken = token as Record<string, unknown>;

      if (user) {
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
        } catch (error) {
          console.error("Failed to refresh Strapi profile", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      const jwt = (token as Record<string, unknown>).jwt as string | undefined;
      const id = (token as Record<string, unknown>).id as
        | number
        | string
        | undefined;

      if (session.user && token) {
        session.user.name = token.name as string | undefined;
        session.user.email = token.email as string | undefined;
        session.user.image = (token.picture as string | null) ?? undefined;
        (session as Record<string, unknown>).jwt = jwt;
        (session as Record<string, unknown>).id = id;
      }

      return session;
    },
  },
};
