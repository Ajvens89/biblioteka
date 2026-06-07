import type { PrismaClient } from "@prisma/client";
import { findHurtProductByTitle, mapHurtProductToGameData } from "@/lib/hurt-catalog";
import { normalizeEan, validateEanChecksum } from "@/lib/services/ean";
import { isHurtCatalogEnabled } from "./hurt-catalog-config";
import { lookupGeminiEanByTitle, isGeminiTitleEanEnabled } from "./gemini-title-ean-provider";
import { lookupPlanszeoEanByTitle } from "./planszeo-ean";
import { lookupUpcitemdbEanByTitle } from "./upcitemdb-provider";
import type { CoverConfidence } from "./types";
import {
  TITLE_EAN_SOURCE_LABELS,
  type TitleToEanCandidate,
  type TitleToEanResult,
} from "./title-to-ean-types";

function toCandidate(
  source: TitleToEanCandidate["source"],
  ean: string,
  opts: {
    title?: string;
    publisher?: string;
    confidence: CoverConfidence;
    notes?: string;
  },
): TitleToEanCandidate {
  let checksumValid = false;
  try {
    const normalized = normalizeEan(ean);
    checksumValid = validateEanChecksum(normalized);
    ean = normalized;
  } catch {
    checksumValid = false;
  }

  return {
    source,
    ean,
    title: opts.title,
    publisher: opts.publisher,
    confidence: checksumValid ? opts.confidence : "low",
    checksumValid,
    notes: opts.notes,
  };
}

function mergeUnique(candidates: TitleToEanCandidate[]): TitleToEanCandidate[] {
  const map = new Map<string, TitleToEanCandidate>();
  for (const c of candidates) {
    const prev = map.get(c.ean);
    if (!prev || rankConfidence(c) > rankConfidence(prev)) {
      map.set(c.ean, c);
    }
  }
  return [...map.values()];
}

function isPolishEan(ean: string): boolean {
  return ean.startsWith("590") || ean.startsWith("978");
}

function rankConfidence(c: TitleToEanCandidate): number {
  const conf = c.confidence === "high" ? 3 : c.confidence === "medium" ? 2 : 1;
  const checksum = c.checksumValid ? 1 : 0;
  const polish = isPolishEan(c.ean) ? 2 : 0;
  const source =
    c.source === "hurt" ? 5 : c.source === "planszeo" ? 4 : c.source === "gemini" ? 3 : c.source === "upcitemdb" ? 2 : 1;
  return source * 10 + conf * 3 + checksum + polish * 5;
}

function pickBest(candidates: TitleToEanCandidate[]): TitleToEanCandidate | undefined {
  if (!candidates.length) return undefined;
  return [...candidates].sort((a, b) => rankConfidence(b) - rankConfidence(a))[0];
}

/**
 * Tytuł → EAN: hurt.csv → Planszeo → UPCitemdb → Gemini (opcjonalnie).
 */
export async function lookupEanByTitle(
  prisma: PrismaClient,
  rawTitle: string,
): Promise<TitleToEanResult> {
  const queryTitle = rawTitle.trim();
  if (!queryTitle) {
    return {
      status: "not_found",
      queryTitle: "",
      candidates: [],
      message: "Podaj tytuł gry.",
    };
  }

  const localGame = await prisma.game.findFirst({
    where: {
      deletedAt: null,
      title: { equals: queryTitle, mode: "insensitive" },
    },
    select: { id: true, title: true, slug: true, ean: true },
  });

  if (localGame?.ean) {
    const candidate = toCandidate("local", localGame.ean, {
      title: localGame.title,
      confidence: "high",
      notes: "Gra o tym tytule jest już w bibliotece.",
    });
    return {
      status: "exists",
      queryTitle,
      candidates: [candidate],
      selectedCandidate: candidate,
      message: `„${localGame.title}" jest już w bibliotece (EAN ${localGame.ean}).`,
      game: localGame,
    };
  }

  const candidates: TitleToEanCandidate[] = [];

  if (isHurtCatalogEnabled()) {
    const { loadHurtCatalog } = await import("@/lib/hurt-catalog-loader");
    const catalog = await loadHurtCatalog();
    const hit = findHurtProductByTitle(queryTitle, catalog);
    if (hit?.product.ean) {
      const mapped = mapHurtProductToGameData(hit.product);
      const ean = mapped.ean;
      if (ean) {
        candidates.push(
          toCandidate("hurt", ean, {
            title: mapped.title,
            publisher: mapped.publisherName ?? undefined,
            confidence: hit.score >= 90 ? "high" : "medium",
            notes: `${TITLE_EAN_SOURCE_LABELS.hurt} (dopasowanie ${hit.score}%).`,
          }),
        );
      }
    }
  }

  const planszeo = await lookupPlanszeoEanByTitle(queryTitle);
  if (planszeo) {
    candidates.push(
      toCandidate("planszeo", planszeo.ean, {
        title: planszeo.title,
        confidence: "high",
        notes: `${TITLE_EAN_SOURCE_LABELS.planszeo} (/gry-planszowe/${planszeo.slug}).`,
      }),
    );
  }

  const upc = await lookupUpcitemdbEanByTitle(queryTitle);
  if (upc) {
    candidates.push(
      toCandidate("upcitemdb", upc.ean, {
        title: upc.title,
        publisher: upc.publisher,
        confidence: upc.score >= 85 ? "medium" : "low",
        notes: `${TITLE_EAN_SOURCE_LABELS.upcitemdb} (dopasowanie ${upc.score}%).`,
      }),
    );
  }

  const unique = mergeUnique(candidates);
  const best = pickBest(unique);

  if (best?.confidence === "high" && best.checksumValid) {
    return {
      status: "found",
      queryTitle,
      candidates: unique,
      selectedCandidate: best,
      message: `Znaleziono EAN ${best.ean} (${TITLE_EAN_SOURCE_LABELS[best.source]}).`,
    };
  }

  if (unique.length === 0 || !best || best.confidence !== "high") {
    if (isGeminiTitleEanEnabled()) {
      const gemini = await lookupGeminiEanByTitle(queryTitle);
      if (gemini) {
        const gCandidate = toCandidate("gemini", gemini.ean, {
          title: gemini.title,
          publisher: gemini.publisher,
          confidence: gemini.confidence,
          notes: gemini.notes,
        });
        const merged = mergeUnique([...unique, gCandidate]);
        const mergedBest = pickBest(merged);
        if (mergedBest) {
          const autoFound =
            merged.length === 1 &&
            mergedBest.confidence === "high" &&
            mergedBest.checksumValid;
          return {
            status: autoFound ? "found" : "candidates",
            queryTitle,
            candidates: merged,
            selectedCandidate: mergedBest,
            message:
              mergedBest.source === "gemini"
                ? `Propozycja EAN ${mergedBest.ean} z Gemini — zweryfikuj przed zapisem.`
                : `Znaleziono EAN ${mergedBest.ean} (${TITLE_EAN_SOURCE_LABELS[mergedBest.source]}).`,
          };
        }
      }
    } else if (unique.length === 0) {
      return {
        status: "not_found",
        queryTitle,
        candidates: [],
        message:
          "Nie znaleziono EAN po tytule. Ustaw GOOGLE_GEMINI_API_KEY lub wpisz kod ręcznie.",
      };
    }
  }

  if (unique.length === 0) {
    return {
      status: "not_found",
      queryTitle,
      candidates: [],
      message: "Nie znaleziono EAN po tytule.",
    };
  }

  const autoFound =
    unique.length === 1 && best?.confidence === "high" && best.checksumValid;

  return {
    status: autoFound ? "found" : "candidates",
    queryTitle,
    candidates: unique,
    selectedCandidate: best,
    message: autoFound
      ? `Znaleziono EAN ${best!.ean} (${TITLE_EAN_SOURCE_LABELS[best!.source]}).`
      : "Znaleziono możliwe kody EAN — wybierz właściwy (preferuj polski kod 590…).",
  };
}
