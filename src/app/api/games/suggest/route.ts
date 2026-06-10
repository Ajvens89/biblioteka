import { suggestGames } from "@/lib/games/suggest-games";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const items = await suggestGames(q);
  return Response.json({ items });
}
