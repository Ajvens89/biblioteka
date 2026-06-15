import {
  checkSuggestRateLimit,
  clientKeyFromRequest,
} from "@/lib/rate-limit/suggest-rate-limit";
import { suggestGames } from "@/lib/games/suggest-games";

export async function GET(request: Request) {
  const clientKey = clientKeyFromRequest(request);
  if (!checkSuggestRateLimit(clientKey)) {
    return Response.json({ error: "Zbyt wiele zapytań. Spróbuj za chwilę." }, { status: 429 });
  }

  const raw = new URL(request.url).searchParams.get("q") ?? "";
  const items = await suggestGames(raw);
  return Response.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, max-age=15",
      },
    },
  );
}
