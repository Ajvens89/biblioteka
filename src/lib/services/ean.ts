/** Normalizacja i walidacja kodów EAN / ISBN (tylko cyfry). */

export class EanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EanError";
  }
}

const VALID_LENGTHS = [8, 13] as const;

/** Usuwa spacje, myślniki itd.; zostawia cyfry. Rzuca EanError przy złej długości. */
export function normalizeEan(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new EanError("Kod EAN jest pusty.");

  const illegal = trimmed.replace(/[0-9\s\-]/g, "");
  if (illegal.length > 0) {
    throw new EanError("Kod zawiera niedozwolone znaki (dozwolone: cyfry, spacje, myślniki).");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) throw new EanError("Kod nie zawiera cyfr.");

  if (!VALID_LENGTHS.includes(digits.length as 8 | 13)) {
    throw new EanError(
      `Nieprawidłowa długość kodu (${digits.length} cyfr). Oczekiwano 8 (EAN-8) lub 13 (EAN-13 / ISBN-13).`,
    );
  }

  return digits;
}

/** Buduje pełny EAN-13 z 12 cyfr bazowych (np. do seeda). */
export function buildEan13(base12: string): string {
  const digits = base12.replace(/\D/g, "");
  if (digits.length !== 12) throw new EanError("Baza EAN musi mieć 12 cyfr.");
  return digits + String(checksumDigit(digits));
}

function checksumDigit(body: string): number {
  const nums = body.split("").map(Number);
  const sum = nums.reduce((acc, n, i) => {
    const weight = body.length === 7 || body.length === 12 ? (i % 2 === 0 ? 1 : 3) : (i % 2 === 0 ? 3 : 1);
    return acc + n * weight;
  }, 0);
  return (10 - (sum % 10)) % 10;
}

/** Suma kontrolna EAN-13 / EAN-8 (ISBN-13 używa tego samego algorytmu). */
export function validateEanChecksum(normalized: string): boolean {
  if (normalized.length !== 8 && normalized.length !== 13) return false;
  const body = normalized.slice(0, -1);
  const check = Number(normalized.slice(-1));
  return checksumDigit(body) === check;
}

export function isIsbn13(normalized: string): boolean {
  return normalized.length === 13 && (normalized.startsWith("978") || normalized.startsWith("979"));
}
