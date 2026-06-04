import { validateCoverImageUrl } from "@/lib/services/ean-providers/image-utils";

/**
 * Docelowo: kopiuje okładkę do Supabase Storage.
 * MVP: zwraca zewnętrzny URL, jeśli jest poprawny.
 */
export async function copyCoverToStorage(
  externalUrl: string,
): Promise<{ url: string; stored: boolean; message: string }> {
  const safe = validateCoverImageUrl(externalUrl);
  if (!safe) {
    return {
      url: "",
      stored: false,
      message: "Nieprawidłowy URL okładki.",
    };
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasStorage =
    bucket &&
    serviceKey &&
    !bucket.includes("placeholder") &&
    !bucket.includes("[PROJECT");

  if (!hasStorage) {
    return {
      url: safe,
      stored: false,
      message:
        "Supabase Storage nie jest skonfigurowany — zapisany zostanie zewnętrzny URL okładki.",
    };
  }

  // TODO: upload do bucketu game-images po skonfigurowaniu Storage
  return {
    url: safe,
    stored: false,
    message:
      "Kopiowanie do Storage będzie dostępne po włączeniu uploadu — na razie używany jest zewnętrzny URL.",
  };
}
