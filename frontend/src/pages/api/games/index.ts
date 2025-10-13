import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getStrapiConfig } from "../../../lib/env";
import { mapStrapiGamesResponse, mapStrapiGame } from "../../../lib/games";
import type { GameSummary } from "../../../types/game";

type DataResponse =
  | { games: GameSummary[] }
  | { game: GameSummary }
  | { error: string };

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
  userType?: string | null;
};

function buildFallbackUrls(url: string): string[] {
  const candidates = new Set<string>([url]);
  if (url.includes("://localhost")) {
    candidates.add(url.replace("://localhost", "://127.0.0.1"));
  } else if (url.includes("://127.0.0.1")) {
    candidates.add(url.replace("://127.0.0.1", "://localhost"));
  }
  return Array.from(candidates);
}

async function fetchWithFallback(
  endpoint: string,
  options: RequestInit
): Promise<Response> {
  let lastError: unknown;
  const attempted: string[] = [];
  for (const candidate of buildFallbackUrls(endpoint)) {
    attempted.push(candidate);
    try {
      return await fetch(candidate, options);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    const errorDetails = (lastError as Error & { cause?: { code?: string }; code?: string }).cause?.code ??
      (lastError as Error & { code?: string }).code ??
      lastError.message;
    throw new Error(
      `Impossibile contattare Strapi (${attempted.join(", ")}). Dettagli: ${errorDetails}`
    );
  }

  throw new Error(
    `Impossibile contattare Strapi (${attempted.join(", ")}).`
  );
}

async function fetchFromStrapi<T>(
  endpoint: string,
  options: RequestInit
): Promise<T> {
  const response = await fetchWithFallback(endpoint, options);
  const payload = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string }; message?: string })?.error
        ?.message ??
      (payload as { message?: string })?.message ??
      "Richiesta a Strapi non riuscita.";
    throw new Error(message);
  }

  return payload;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DataResponse>
) {
  const session = await getServerSession(req, res, authOptions);
  const { apiUrl } = getStrapiConfig({ required: true });

  const typedSession = (session ?? {}) as SessionWithStrapi;

  let strapiJwt = typedSession.jwt ?? null;
  let currentUserId = typedSession.id ?? null;
  let userType = typedSession.userType ?? null;

  const authHeader = req.headers.authorization;
  if ((!strapiJwt || typeof strapiJwt !== "string") && authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      strapiJwt = match[1].trim();
    }
  }

  if (!strapiJwt) {
    return res
      .status(401)
      .json({ error: "Autenticazione richiesta." });
  }

  if (!userType || currentUserId == null) {
    try {
      const profileResponse = await fetch(`${apiUrl}/api/users/me?populate=*`, {
        headers: {
          Authorization: `Bearer ${strapiJwt}`,
        },
        cache: "no-store",
      });

      if (!profileResponse.ok) {
        return res
          .status(401)
          .json({ error: "Autenticazione richiesta." });
      }

      const profile = (await profileResponse.json().catch(() => ({}))) as {
        id?: number | string;
        userType?: string | null;
      };

      currentUserId =
        profile?.id != null ? profile.id : currentUserId ?? null;
      userType =
        typeof profile?.userType === "string"
          ? profile.userType
          : userType ?? null;
    } catch (error) {
      console.error("Failed to resolve Strapi user profile", error);
      return res
        .status(401)
        .json({ error: "Autenticazione richiesta." });
    }
  }

  const normalizedUserType =
    typeof userType === "string" ? userType.toLowerCase() : null;

  if (req.method === "GET") {
    try {
      const payload = await fetchFromStrapi<{
        data: unknown;
      }>(`${apiUrl}/api/games?populate[owner]=*&populate[participants]=*`, {
        headers: {
          Authorization: `Bearer ${strapiJwt}`,
        },
        cache: "no-store",
      });

      const games = mapStrapiGamesResponse(
        payload as { data: never[] },
        currentUserId ?? null
      );
      return res.status(200).json({ games });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile recuperare le partite.";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === "POST") {
    if (normalizedUserType !== "parent") {
      return res
        .status(403)
        .json({ error: "Solo i genitori possono creare una partita." });
    }

    const { name, description } = req.body ?? {};

    if (!name || typeof name !== "string") {
      return res
        .status(400)
        .json({ error: "Il nome della partita è obbligatorio." });
    }

    try {
      const payload = await fetchFromStrapi<{ data: unknown }>(
        `${apiUrl}/api/games`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${strapiJwt}`,
          },
          body: JSON.stringify({
            name,
            description: typeof description === "string" ? description : null,
          }),
        }
      );

      const game = mapStrapiGame(
        (payload as { data: never })?.data as never,
        currentUserId ?? null
      );
      return res.status(201).json({ game });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile creare la partita.";
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Metodo non supportato." });
}
