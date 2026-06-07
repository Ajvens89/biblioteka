import "dotenv/config";
import { lookupGeminiEanByTitle } from "../src/lib/services/ean-providers/gemini-title-ean-provider";

async function main() {
  const key = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (!key) {
    console.log("Brak GOOGLE_GEMINI_API_KEY");
    return;
  }

  const model = process.env.GOOGLE_GEMINI_MODEL?.trim() || "gemini-flash-latest";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: 'Podaj polski EAN-13 gry Messina 1347 (Portal Games). Odpowiedz JSON: {"ean":"...","title":"...","confidence":"high"}',
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
    }),
  });

  console.log("HTTP", res.status);
  const raw = await res.text();
  console.log(raw.slice(0, 2500));

  console.log("\n--- provider ---");
  console.log(await lookupGeminiEanByTitle("Messina 1347"));
}

main().catch(console.error);
