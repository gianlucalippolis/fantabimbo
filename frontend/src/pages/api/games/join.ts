import type { NextApiRequest, NextApiResponse } from "next";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { getStrapiConfig } from "../../../lib/env";
import { mapStrapiGame } from "../../../lib/games";
import type { GameSummary } from "../../../types/game";

type JoinResponse = { game: GameSummary } | { error: string };

type SessionWithStrapi = Session & {
  jwt?: string;
  id?: number | string;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: "Metodo non supportato. Usa POST per unirti a una partita.",
    });
  }

  const session = await getServerSession(req, res, authOptions);
  const typedSession = (session ?? {}) as SessionWithStrapi;
  const { apiUrl } = getStrapiConfig({ required: true });

  let strapiJwt = typedSession.jwt ?? null;
  let currentUserId = typedSession.id ?? null;

  const authHeader = req.headers.authorization;
  if ((!strapiJwt || typeof strapiJwt !== "string") && authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      strapiJwt = match[1].trim();
    }
  }

  if (!strapiJwt) {
    return res.status(401).json({ error: "Autenticazione richiesta." });
  }

  if (currentUserId == null) {
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
      };

      currentUserId =
        profile?.id != null ? profile.id : currentUserId ?? null;
    } catch (error) {
      console.error("Failed to resolve Strapi user profile", error);
      return res.status(401).json({ error: "Autenticazione richiesta." });
    }
  }

  const { inviteCode } = req.body ?? {};
  if (!inviteCode || typeof inviteCode !== "string") {
    return res.status(400).json({ error: "Codice invito mancante o non valido." });
  }

  try {
    let response: Response | undefined;
    const targetUrls = buildFallbackUrls(`${apiUrl}/api/games/join`);
    let lastError: unknown;
    for (const target of targetUrls) {
      try {
        response = await fetch(target, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${strapiJwt}`,
          },
          body: JSON.stringify({ inviteCode }),
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      if (lastError instanceof Error) {
        const errorDetails = (lastError as Error & { cause?: { code?: string }; code?: string }).cause?.code ??
          (lastError as Error & { code?: string }).code ??
          lastError.message;
        throw new Error(
          `Impossibile contattare Strapi (${targetUrls.join(", ")}). Dettagli: ${errorDetails}`
        );
      }
      throw new Error(`Impossibile contattare Strapi (${targetUrls.join(", ")}).`);
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        payload?.error?.message ??
        payload?.message ??
        "Impossibile unirsi alla partita con questo codice.";
      return res.status(response.status).json({ error: message });
    }

    const game = mapStrapiGame(
      (payload as { data: never })?.data as never,
      currentUserId ?? null
    );

    return res.status(200).json({ game });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossibile unirsi alla partita.";
    return res.status(500).json({ error: message });
  }
}
