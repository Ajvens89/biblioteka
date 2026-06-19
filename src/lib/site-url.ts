/** Canonical public URL for SEO, sitemap and Open Graph. */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}
