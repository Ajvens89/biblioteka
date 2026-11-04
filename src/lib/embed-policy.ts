/** Only public library pages may be framed by the Foundation's website. */
export const LIBRARY_PARENT_ORIGINS = [
  "https://zakatekfantastyki.pl",
  "https://www.zakatekfantastyki.pl",
] as const;

export const PUBLIC_LIBRARY_PATHS = [
  "/",
  "/katalog",
  "/gry/:slug",
  "/jak-wypozyczyc",
  "/kontakt",
  "/regulamin",
] as const;

export function librarySecurityHeaders() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(), geolocation=()",
        },
      ],
    },
    ...["/admin/:path*", "/login", "/reset-hasla/:path*", "/moje-konto", "/api/:path*"].map(
      (source) => ({
        source,
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      }),
    ),
    ...PUBLIC_LIBRARY_PATHS.map((source) => ({
      source,
      headers: [
        {
          key: "Content-Security-Policy",
          value: `frame-ancestors ${LIBRARY_PARENT_ORIGINS.join(" ")}`,
        },
      ],
    })),
  ];
}
