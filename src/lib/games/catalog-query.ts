import { gameFilterSchema, type GameFilterInput } from "@/lib/validations/game";

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

const numericFilterKeys = new Set([
  "minPlayers", "maxPlayers", "minAge", "maxPlayTime", "page", "pageSize",
]);
const knownQueryKeys = new Set(Object.keys(gameFilterSchema.shape));

/** URL input is untrusted: ignore a malformed field without losing the other filters. */
export function parseCatalogQuery(raw: CatalogSearchParams): {
  filters: GameFilterInput;
  params: Record<string, string | undefined>;
  navigationParams: Record<string, string | undefined>;
} {
  const params: Record<string, string> = {};
  for (const key of Object.keys(gameFilterSchema.shape) as (keyof typeof gameFilterSchema.shape)[]) {
    const value = Array.isArray(raw[key]) ? raw[key][0] : raw[key];
    if (typeof value !== "string" || !value.trim()) continue;
    const trimmed = key === "category"
      ? [...new Set(value.split(",").map((slug) => slug.trim()).filter(Boolean))].join(",")
      : value.trim();
    if (!trimmed) continue;
    const maxLength = key === "category" ? 1000 : key === "ean" ? 64 : 200;
    if (trimmed.length > maxLength) continue;

    const parsed = gameFilterSchema.shape[key].safeParse(trimmed);
    if (!parsed.success) continue;
    if (numericFilterKeys.has(key)) {
      const number = Number(parsed.data);
      // Prisma's PostgreSQL Int filters must not receive fractions, infinity or an overflowing offset.
      const minimum = key === "minAge" ? 0 : 1;
      const maximum = key === "page" ? Math.floor(2_147_483_647 / 48) : 2_147_483_647;
      if (!Number.isSafeInteger(number) || number < minimum || number > maximum) continue;
      params[key] = String(number);
    } else {
      params[key] = trimmed;
    }
  }
  // Exact EAN search has priority in the database query; the search field and metadata must agree.
  if (params.ean) delete params.q;
  const navigationParams = Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => !knownQueryKeys.has(key))
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  return {
    filters: gameFilterSchema.parse(params),
    params,
    navigationParams: { ...navigationParams, ...params },
  };
}

/** Keep campaign parameters, but never show malformed catalog values as active UI filters. */
export function normalizeCatalogUrlParams(raw: Pick<URLSearchParams, "entries">): URLSearchParams {
  const entries = [...raw.entries()];
  const firstValues = new Map<string, string>();
  for (const [key, value] of entries) {
    if (!firstValues.has(key)) firstValues.set(key, value);
  }
  const { params } = parseCatalogQuery(Object.fromEntries(firstValues));
  const result = new URLSearchParams(entries.filter(([key]) => !knownQueryKeys.has(key)));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) result.set(key, value);
  }
  return result;
}
