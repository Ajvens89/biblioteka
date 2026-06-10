import { CATALOG_COLLECTION_LABELS } from "@/lib/constants";
import type { GameFilterInput } from "@/lib/validations/game";

export type CatalogEmptyState = {
  title: string;
  description: string;
  action: { label: string; href: string };
};

function buildCatalogUrl(
  params: Record<string, string | undefined>,
  omitKeys: string[],
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && !omitKeys.includes(key) && key !== "page") {
      sp.set(key, value);
    }
  }
  const qs = sp.toString();
  return qs ? `/katalog?${qs}` : "/katalog";
}

export function buildCatalogEmptyState(
  filters: GameFilterInput,
  params: Record<string, string | undefined>,
): CatalogEmptyState {
  const onlyAvailable = filters.availability === "available";
  const collectionLabel = filters.collectionType
    ? CATALOG_COLLECTION_LABELS[filters.collectionType]
    : null;

  if (filters.ean) {
    return {
      title: "Nie znaleziono gry o tym EAN",
      description:
        "Sprawdź, czy zeskanowałeś kod z pudełka produktu (nie kod naklejki egzemplarza w bibliotece).",
      action: { label: "Wyczyść filtry", href: "/katalog" },
    };
  }

  if (onlyAvailable && collectionLabel) {
    return {
      title: `Brak dostępnych: ${collectionLabel}`,
      description:
        "Usuń filtr „Tylko dostępne” lub sprawdź katalog później — egzemplarze wracają po wypożyczeniach.",
      action: {
        label: "Pokaż wszystkie w tej kategorii",
        href: buildCatalogUrl(params, ["availability"]),
      },
    };
  }

  if (onlyAvailable) {
    return {
      title: "Brak dostępnych egzemplarzy",
      description:
        "Żadna gra spełnia filtry z wolnym egzemplarzem. Usuń „Tylko dostępne” lub zmień kryteria wyszukiwania.",
      action: {
        label: "Usuń filtr dostępności",
        href: buildCatalogUrl(params, ["availability"]),
      },
    };
  }

  if (collectionLabel && filters.q) {
    return {
      title: "Brak wyników dla tych filtrów",
      description: `Nie znaleziono gier w kategorii „${collectionLabel}” dla „${filters.q}”. Zmień wyszukiwanie lub usuń filtry.`,
      action: { label: "Wyczyść filtry", href: "/katalog" },
    };
  }

  return {
    title: "Nie znaleziono gry",
    description: "Zmień wyszukiwanie lub usuń filtry — w katalogu na pewno jest coś ciekawego.",
    action: { label: "Wyczyść filtry", href: "/katalog" },
  };
}
