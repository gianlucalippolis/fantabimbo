export function getStrapiURL() {
  return (
    process.env.STRAPI_API_URL ??
    process.env.NEXT_PUBLIC_STRAPI_API_URL ??
    "http://localhost:1337/api"
  );
}

/**
 * Get the full URL for a Strapi media file
 * @param url - The relative or absolute URL from Strapi
 * @returns The complete URL including the base URL if needed
 */
export function getStrapiMediaURL(url: string | null | undefined): string {
  if (!url) return "";

  // If URL is already absolute, return it as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Otherwise, prepend the Strapi base URL (remove /api from the end)
  const strapiURL = getStrapiURL().replace(/\/api\/?$/, "");
  return `${strapiURL}${url}`;
}
