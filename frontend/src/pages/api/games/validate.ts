import type { NextApiRequest, NextApiResponse } from "next";
import { getStrapiConfig } from "../../../lib/env";

type ValidateResponse =
  | { valid: true; name: string; inviteCode: string }
  | { valid: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidateResponse>
) {
  const inviteCodeParam = req.method === "GET" ? req.query.code : undefined;
  const codeValue =
    typeof inviteCodeParam === "string"
      ? inviteCodeParam
      : Array.isArray(inviteCodeParam)
      ? inviteCodeParam[0]
      : null;

  if (!codeValue) {
    return res.status(400).json({
      valid: false,
      error: "Codice invito mancante.",
    });
  }

  const inviteCode = codeValue.trim().toUpperCase();

  const { apiUrl, apiToken } = getStrapiConfig({ required: true });

  if (!apiToken) {
    return res.status(500).json({
      valid: false,
      error:
        "STRAPI_API_TOKEN non è configurato. Impossibile validare il codice invito.",
    });
  }

  try {
    const response = await fetch(
      `${apiUrl}/api/games?filters[inviteCode][$eq]=${encodeURIComponent(
        inviteCode
      )}&fields[0]=name&fields[1]=inviteCode`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        cache: "no-store",
      }
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        payload?.error?.message ??
        payload?.message ??
        "Impossibile verificare il codice invito.";
      return res.status(response.status).json({ valid: false, error: message });
    }

    const games = (payload as { data?: Array<{ id: number; attributes?: { name?: string; inviteCode?: string } }> }).data ?? [];

    if (!games.length) {
      return res
        .status(404)
        .json({ valid: false, error: "Codice invito non valido." });
    }

    const [game] = games;
    const gameName = game.attributes?.name ?? "Partita Fantanome";

    return res.status(200).json({
      valid: true,
      name: gameName,
      inviteCode,
    });
  } catch (error) {
    console.error("Invite validation failed", error);
    return res.status(500).json({
      valid: false,
      error: "Errore durante la verifica del codice invito. Riprova più tardi.",
    });
  }
}
