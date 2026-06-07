import { fetchWithTimeout } from "./image-utils";
import type { CoverConfidence } from "./types";

const GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-flash-latest";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export function isGeminiTitleEanEnabled(): boolean {
  return Boolean(process.env.GOOGLE_GEMINI_API_KEY?.trim());
}

type GeminiTitleEanPayload = {
  ean?: string;
  title?: string;
  publisher?: string;
  confidence?: string;
  notes?: string;
};

/** Parsuje JSON z odpowiedzi Gemini (może być w bloku ```json). */
export function parseGeminiTitleEanResponse(text: string): GeminiTitleEanPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = (fenced?.[1] ?? trimmed).trim();

  try {
    const parsed = JSON.parse(jsonText) as GeminiTitleEanPayload;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    const eanMatch = jsonText.match(/\b(59\d{11}|978\d{10})\b/);
    if (eanMatch) return { ean: eanMatch[1], confidence: "low", notes: "Wyciągnięto EAN z tekstu odpowiedzi." };
  }

  return null;
}

function mapConfidence(value: string | undefined): CoverConfidence {
  const v = value?.toLowerCase();
  if (v === "high") return "high";
  if (v === "medium") return "medium";
  return "low";
}

export async function lookupGeminiEanByTitle(title: string): Promise<{
  ean: string;
  title?: string;
  publisher?: string;
  confidence: CoverConfidence;
  notes?: string;
} | null> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const q = title.trim();
  if (!q) return null;

  const prompt = `Znajdź kod kreskowy EAN-13 (GTIN) polskiego wydania gry planszowej lub RPG.
Preferuj oficjalne polskie wydanie (np. Portal Games, Rebel, Galakta).
Jeśli jest kilka wydań, podaj EAN polskiej edycji bazowej (nie dodatku, chyba że pytanie dotyczy dodatku).

Tytuł gry: ${q}

Odpowiedz WYŁĄCZNIE poprawnym JSON (bez markdown), w formacie:
{"ean":"5901234123457","title":"pełny tytuł polskiego wydania","publisher":"wydawca","confidence":"high|medium|low","notes":"krótkie uzasadnienie"}

Pole ean musi mieć dokładnie 13 cyfr. Jeśli nie znajdziesz pewnego EAN, ustaw confidence na low i w notes wyjaśnij.`;

  try {
    const text = await requestGeminiText(apiKey, prompt, true);
    const groundedText = text ?? (await requestGeminiText(apiKey, prompt, false));
    if (!groundedText) return null;

    const parsed = parseGeminiTitleEanResponse(groundedText);
    const ean = parsed?.ean?.replace(/\D/g, "");
    if (!ean || ean.length !== 13) return null;

    const usedGrounding = Boolean(text);
    return {
      ean,
      title: parsed.title?.trim() || undefined,
      publisher: parsed.publisher?.trim() || undefined,
      confidence: usedGrounding ? mapConfidence(parsed.confidence) : "low",
      notes:
        parsed.notes?.trim() ||
        (usedGrounding
          ? "Propozycja z Gemini (Google Search grounding) — zweryfikuj przed zapisem."
          : "Propozycja z Gemini (bez wyszukiwania — limit grounding) — zweryfikuj przed zapisem."),
    };
  } catch {
    return null;
  }
}

async function requestGeminiText(
  apiKey: string,
  prompt: string,
  withGoogleSearch: boolean,
): Promise<string | null> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };
  if (withGoogleSearch) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetchWithTimeout(
    GEMINI_ENDPOINT,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    },
    25_000,
  );

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("\n")
    .trim();

  return text || null;
}
