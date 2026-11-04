export function skipE2eDatabaseChanges(env: Record<string, string | undefined> = process.env): boolean {
  if (env.PLAYWRIGHT_SKIP_DB_SETUP === "1") return true;
  const base = env.PLAYWRIGHT_BASE_URL?.trim();
  if (!base) return false;
  try {
    const url = new URL(base);
    return !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return true;
  }
}
