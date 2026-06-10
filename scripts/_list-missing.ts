import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const games = await prisma.game.findMany({
    where: { deletedAt: null, OR: [{ coverImageUrl: null }, { coverImageUrl: "" }] },
    select: { title: true, ean: true, slug: true },
    orderBy: { title: "asc" },
  });
  for (const g of games) console.log(`${g.ean ?? "—"}|${g.title}|${g.slug}`);
  await prisma.$disconnect();
}

main().catch(console.error);
