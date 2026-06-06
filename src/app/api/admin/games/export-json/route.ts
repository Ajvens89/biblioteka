import { NextResponse } from "next/server";
import { getActorFromDb } from "@/lib/auth/actor";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  buildGamesExportFile,
  fetchGamesForExport,
  serializeGamesExport,
} from "@/lib/services/games-json";

export async function GET() {
  const user = await getActorFromDb();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await fetchGamesForExport(prisma);
  const file = buildGamesExportFile(games);
  const json = serializeGamesExport(file);

  await logAudit({
    actorId: user.id,
    action: "EXPORT",
    entityType: "games_json",
    metadata: { count: games.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gry-${stamp}.json"`,
    },
  });
}
