import type { NextApiRequest, NextApiResponse } from "next";
import { getStrapiConfig } from "../../../lib/env";

type ValidateResponse =
  | { valid: true; name: string; inviteCode: string }
  | { valid: false; error: string };

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

  const { apiUrl } = getStrapiConfig({ required: true });

  try {
    let response: Response | undefined;
    const targets = buildFallbackUrls(
      `${apiUrl}/api/games/validate?code=${encodeURIComponent(inviteCode)}`
    );
    let lastError: unknown;
    for (const target of targets) {
      try {
        response = await fetch(target, {
          cache: "no-store",
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response) {
      if (lastError instanceof Error) {
        const details =
          (lastError as Error & { cause?: { code?: string }; code?: string })
            .cause?.code ??
          (lastError as Error & { code?: string }).code ??
          lastError.message;
        throw new Error(
          `Impossibile contattare Strapi (${targets.join(
            ", "
          )}). Dettagli: ${details}`
        );
      }
      throw new Error(
        `Impossibile contattare Strapi (${targets.join(", ")}).`
      );
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (payload as { error?: string })?.error ??
        (payload as { message?: string })?.message ??
        "Impossibile verificare il codice invito.";
      const status = response.status === 404 ? 404 : response.status || 500;
      return res.status(status).json({
        valid: false,
        error: message,
      });
    }

    const validPayload = payload as { valid?: boolean; name?: string; inviteCode?: string };
    if (!validPayload.valid) {
      return res.status(404).json({
        valid: false,
        error: "Codice invito non valido.",
      });
    }

    return res.status(200).json({
      valid: true,
      name: validPayload.name ?? "Partita Fantanome",
      inviteCode: validPayload.inviteCode ?? inviteCode,
    });
  } catch (error) {
    console.error("Invite validation failed", error);
    return res.status(500).json({
      valid: false,
      error: "Errore durante la verifica del codice invito. Riprova più tardi.",
    });
  }
}
