interface StrapiConfigOptions {
  required?: boolean;
}

export function getStrapiConfig(options: StrapiConfigOptions = {}): {
  apiUrl: string;
  apiToken: string | null;
} {
  const { required = true } = options;

  const rawUrl =
    process.env.STRAPI_API_URL ?? process.env.NEXT_PUBLIC_STRAPI_API_URL ?? "";
  const apiUrl = rawUrl ? rawUrl.replace(/\/$/, "") : "";

  const apiToken =
    process.env.STRAPI_API_TOKEN ??
    process.env.NEXT_PUBLIC_STRAPI_API_TOKEN ??
    null;

  if (!apiUrl && required) {
    throw new Error(
      "STRAPI_API_URL non è configurato. Imposta STRAPI_API_URL (o NEXT_PUBLIC_STRAPI_API_URL) nel file .env."
    );
  }

  return { apiUrl, apiToken };
}

export function getAppBaseUrl(): string {
  // Lato client: usa l'origin del browser
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Lato server: usa solo variabili d'ambiente (mai localhost in produzione)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "";

  // Se non c'è una URL configurata, ritorna stringa vuota invece di localhost
  // L'app dovrà gestire questo caso
  if (!siteUrl) {
    console.warn(
      "NEXT_PUBLIC_SITE_URL o NEXTAUTH_URL non configurati. Imposta una di queste variabili nel file .env per i link di invito."
    );
    return "";
  }

  return siteUrl;
}
