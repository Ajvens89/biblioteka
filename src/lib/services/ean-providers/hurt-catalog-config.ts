export function isHurtCatalogEnabled(): boolean {
  const flag = process.env.HURT_CSV_DISABLED?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "on") return false;
  return true;
}
