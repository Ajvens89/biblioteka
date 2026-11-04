import { buildEan13, normalizeEan } from "./ean";

export function isValidBarcodeLength(digits: string): boolean {
  return [8, 12, 13, 14].includes(digits.length);
}

/** Barcode normalization shared by catalog search and imports; no filesystem or provider dependencies. */
export function normalizeProductBarcode(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits || !isValidBarcodeLength(digits)) return null;

  try {
    if (digits.length === 12) return buildEan13(digits);
    if (digits.length === 14 && digits.startsWith("0")) return normalizeEan(digits.slice(1));
    if (digits.length === 13 || digits.length === 8) return normalizeEan(digits);
    return digits;
  } catch {
    if (digits.length === 13 || digits.length === 8) return digits;
    return null;
  }
}
