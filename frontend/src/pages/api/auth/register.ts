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
    userType?: "parent" | "player";
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

  const { email, password, userType } = req.body ?? {};

  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (
    !trimmedEmail ||
    typeof password !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Email e password sono campi obbligatori." });
  }

  if (userType !== "parent" && userType !== "player") {
    return res
      .status(400)
      .json({ error: "Specificare se sei genitore o giocatore è obbligatorio." });
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

    const successPayload = payload as StrapiRegisterResponse;

    if (
      userType === "parent" &&
      successPayload?.jwt &&
      successPayload?.user?.id
    ) {
      try {
        const updateResponse = await fetch(
          `${STRAPI_API_URL}/api/users/${successPayload.user.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${successPayload.jwt}`,
            },
            body: JSON.stringify({ userType }),
          }
        );

        const updatePayload = (await updateResponse
          .json()
          .catch(() => ({}))) as { error?: { message?: string }; message?: string };

        if (!updateResponse.ok) {
          const message =
            updatePayload?.error?.message ??
            updatePayload?.message ??
            "Registrazione riuscita ma non è stato possibile aggiornare il ruolo.";
          return res.status(updateResponse.status).json({ error: message });
        }
      } catch (updateError) {
        console.error("Failed to update userType after registration", updateError);
        return res.status(500).json({
          error:
            "Registrazione riuscita, ma non è stato possibile salvare il ruolo genitore. Contatta l'assistenza.",
        });
      }
    }

    return res.status(200).json(successPayload);
  } catch (error) {
    console.error("Strapi registration failed", error);
    return res
      .status(500)
      .json({ error: "Errore interno durante la registrazione." });
  }
}
