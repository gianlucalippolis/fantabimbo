import type { NextApiRequest, NextApiResponse } from "next";
import { getStrapiConfig } from "../../../lib/env";

const { apiUrl: STRAPI_API_URL } = getStrapiConfig();

interface StrapiRegisterResponse {
  jwt: string;
  user: {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    confirmed?: boolean;
    blocked?: boolean;
  };
}

type ApiSuccess = StrapiRegisterResponse;
type ApiError = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiSuccess | ApiError>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ error: "Metodo non supportato. Usa POST per registrarti." });
  }

  if (!STRAPI_API_URL) {
    return res
      .status(500)
      .json({ error: "STRAPI_API_URL non è configurata sul server." });
  }

  const {
    email,
    password,
  } = req.body ?? {};

  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (
    !trimmedEmail ||
    typeof password !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Email e password sono campi obbligatori." });
  }

  try {
    const response = await fetch(`${STRAPI_API_URL}/api/auth/local/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: trimmedEmail,
        email: trimmedEmail,
        password,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as
      | StrapiRegisterResponse
      | { error?: { message?: string } }
      | { message?: string };

    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } })?.error?.message ??
        (payload as { message?: string })?.message ??
        "Registrazione con Strapi non riuscita.";
      return res.status(response.status).json({ error: message });
    }

    return res.status(200).json(payload as StrapiRegisterResponse);
  } catch (error) {
    console.error("Strapi registration failed", error);
    return res
      .status(500)
      .json({ error: "Errore interno durante la registrazione." });
  }
}
