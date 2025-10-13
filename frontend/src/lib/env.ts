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
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}
