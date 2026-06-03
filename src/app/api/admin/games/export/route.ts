import { NextResponse } from "next/server";
import { getActorFromDb } from "@/lib/auth/actor";
import { gamesToCsv } from "@/lib/csv/games";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getActorFromDb();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    where: { deletedAt: null },
    include: { publisher: true, designer: true },
    orderBy: { title: "asc" },
  });

  const csv = gamesToCsv(games);
  await logAudit({
    actorId: user.id,
    action: "EXPORT",
    entityType: "games",
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="gry.csv"',
    },
  });
}
