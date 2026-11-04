/** This deployment is a public catalog with owner-managed game records, not a lending service. */
export const CATALOG_ONLY_MODE = true;

export const CATALOG_ONLY_MESSAGE =
  "Ta funkcja jest wyłączona. Strona działa wyłącznie jako katalog gier.";

export function circulationDisabledResult(): { success: false; error: string } {
  return { success: false, error: CATALOG_ONLY_MESSAGE };
}
