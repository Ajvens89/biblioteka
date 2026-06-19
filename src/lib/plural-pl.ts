/**
 * Polska odmiana liczebników: 1 → one, 2–4 (z wyjątkami 12–14) → few, reszta → many.
 */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (n === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
