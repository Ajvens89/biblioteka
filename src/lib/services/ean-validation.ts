import type { EanValidationStatus } from "@prisma/client";
import { normalizeEan, validateEanChecksum, EanError } from "@/lib/services/ean";

export type EanValidationResult =
  | { ok: true; normalized: string; status: "VALID" }
  | { ok: false; status: EanValidationStatus; message: string; normalized?: string };

export function classifyEan(raw: string | null | undefined): EanValidationResult {
  if (!raw?.trim()) {
    return { ok: false, status: "MISSING", message: "Brak kodu EAN/ISBN." };
  }
  try {
    const normalized = normalizeEan(raw);
    if (!validateEanChecksum(normalized)) {
      return {
        ok: false,
        status: "INVALID_CHECKSUM",
        message: "Nieprawidłowa suma kontrolna EAN/ISBN.",
        normalized,
      };
    }
    return { ok: true, normalized, status: "VALID" };
  } catch (e) {
    const msg = e instanceof EanError ? e.message : "Nieprawidłowy kod EAN/ISBN.";
    return { ok: false, status: "NEEDS_VERIFICATION", message: msg };
  }
}

export function eanValidationMessage(result: EanValidationResult): string {
  return result.ok ? "" : result.message;
}
