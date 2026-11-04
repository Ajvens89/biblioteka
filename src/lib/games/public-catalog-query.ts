import { parseCatalogQuery, type CatalogSearchParams } from "./catalog-query";

/** Public catalog controls have no circulation, stock, EAN or mood filters. */
export function parsePublicCatalogQuery(raw: CatalogSearchParams) {
  const allowed = ["q", "publisher", "page", "pageSize", "collectionType"] as const;
  return parseCatalogQuery(Object.fromEntries(allowed.map((key) => [key, raw[key]])));
}
