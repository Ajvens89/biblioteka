/**
 * Test EAN + typów zbiorów na PostgreSQL.
 *
 *   npm run verify:ean
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildEan13, normalizeEan } from "../src/lib/services/ean";
import {
  assertEanNotDuplicate,
  createGameFromEan,
  findGameByEan,
  lookupByEan,
} from "../src/lib/services/games";
import assert from "node:assert/strict";
import { ServiceError } from "../src/lib/services/errors";
import { parseCollectionType } from "../src/lib/services/collection-type";

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();
const PREFIX = "verify-ean-";
const TEST_EAN = buildEan13("590999000001");
const RPG_EAN = buildEan13("978999000001");

async function cleanup() {
  await prisma.gameCopy.deleteMany({
    where: { game: { slug: { startsWith: PREFIX } } },
  });
  await prisma.game.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ EAN VERIFY FAILED: brak DATABASE_URL");
    process.exit(1);
  }

  await cleanup();

  const admin = await prisma.profile.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("Brak konta ADMIN — uruchom npm run db:seed");

  const game = await createGameFromEan(
    prisma,
    {
      title: "Verify EAN Board",
      ean: TEST_EAN,
      collectionType: "BOARD_GAME",
      type: "BOARD",
      difficulty: "MEDIUM",
      minPlayers: 2,
      maxPlayers: 4,
      minAge: 10,
      minPlayTime: 30,
      maxPlayTime: 60,
      slug: `${PREFIX}board`,
      coverImageUrl: "",
      addCopy: true,
      copyInventoryNumber: `${PREFIX}INV-1`,
    },
    admin.id,
  );

  const copy = await prisma.gameCopy.findFirst({
    where: { gameId: game.id, inventoryNumber: `${PREFIX}INV-1` },
  });
  if (!copy) throw new Error("Brak egzemplarza testowego");
  if (copy.barcode === TEST_EAN) {
    throw new Error("Błąd: EAN produktu trafił do game_copies.barcode");
  }
  assert.equal(copy.barcode, null);

  const found = await findGameByEan(prisma, TEST_EAN);
  if (!found?.id || found.id !== game.id) {
    throw new Error("findGameByEan nie znalazł utworzonej gry");
  }

  try {
    await assertEanNotDuplicate(prisma, TEST_EAN);
    throw new Error("Oczekiwano błędu duplikatu EAN");
  } catch (e) {
    if (!(e instanceof ServiceError) || e.code !== "EAN_DUPLICATE") {
      throw e;
    }
  }

  const lookup = await lookupByEan(prisma, TEST_EAN);
  if (lookup.status !== "exists") {
    throw new Error(`lookup powinien zwrócić exists, jest ${lookup.status}`);
  }
  if (lookup.candidates[0]?.source !== "local") {
    throw new Error(`Oczekiwano źródło local, jest ${lookup.candidates[0]?.source}`);
  }

  const boardUnknown = await lookupByEan(prisma, buildEan13("590111222334"));
  if (boardUnknown.status !== "not_found") {
    throw new Error(`EAN planszówki poza bazą powinien dać not_found, jest ${boardUnknown.status}`);
  }
  if (!boardUnknown.needsTitleHintForBgg) {
    throw new Error("Oczekiwano needsTitleHintForBgg dla planszówki bez tytułu");
  }

  const rpg = await createGameFromEan(
    prisma,
    {
      title: "Verify EAN RPG",
      ean: RPG_EAN,
      collectionType: "RPG",
      type: "RPG",
      difficulty: "MEDIUM",
      slug: `${PREFIX}rpg`,
      minPlayers: 1,
      maxPlayers: 6,
      minAge: 0,
      minPlayTime: 0,
      maxPlayTime: 0,
      coverImageUrl: "",
    },
    admin.id,
  );

  if (rpg.collectionType !== "RPG") throw new Error("Zła collectionType RPG");

  const boardOnly = await prisma.game.count({
    where: { collectionType: "BOARD_GAME", slug: { startsWith: PREFIX } },
  });
  const rpgOnly = await prisma.game.count({
    where: { collectionType: "RPG", slug: { startsWith: PREFIX } },
  });
  if (boardOnly !== 1 || rpgOnly !== 1) {
    throw new Error("Filtr collectionType nie zgadza się");
  }

  assert.equal(
    normalizeEan(` ${TEST_EAN.slice(0, 3)}-${TEST_EAN.slice(3, 7)} ${TEST_EAN.slice(7)} `),
    TEST_EAN,
  );
  assert.equal(parseCollectionType("planszowa"), "BOARD_GAME");

  await cleanup();
  console.log("\n✅ EAN VERIFY OK");
}

main()
  .catch((e) => {
    console.error(`\n❌ EAN VERIFY FAILED: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
