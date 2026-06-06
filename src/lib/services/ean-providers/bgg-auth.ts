export function getBggToken(): string | null {
  const raw = process.env.BGG_TOKEN ?? process.env.BGG_API_TOKEN;
  return raw?.trim() || null;
}

export function isBggConfigured(): boolean {
  return Boolean(getBggToken());
}

/** Nagłówki do XML API BGG (wymaga tokenu od 2025). */
export function getBggRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/xml" };
  const token = getBggToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
