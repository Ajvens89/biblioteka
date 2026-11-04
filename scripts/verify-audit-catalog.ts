import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { fetchGames } from "../src/lib/games/queries";
import { suggestGames } from "../src/lib/games/suggest-games";
import { gameFilterSchema } from "../src/lib/validations/game";

const database = new URL(process.env.DATABASE_URL || "");
if (database.hostname !== "127.0.0.1" || database.port !== "51222"
  || database.searchParams.get("schema") !== "library_audit_20261104"
  || process.env.DIRECT_URL !== process.env.DATABASE_URL) {
  throw new Error("Only the explicitly isolated local audit schema is permitted");
}

async function main() {
  const token = randomUUID().replaceAll("-", "");
  const titleQuery = `Title${token}`;
  const publisherQuery = `Press${token}`;
  const descriptionQuery = `Description${token}`;
  const ids: string[] = [];
  const publisher = await prisma.publisher.create({ data: { name: publisherQuery, slug: `audit-${token}` } });
  try {
    const first = await prisma.game.create({ data: { title: `Gra ${titleQuery}`, slug: `audit-a-${token}` } });
    ids.push(first.id);
    const second = await prisma.game.create({ data: { title: `Druga ${token}`, slug: `audit-b-${token}`, publisherId: publisher.id } });
    ids.push(second.id);
    const inactive = await prisma.game.create({ data: { title: `Ukryta ${titleQuery}`, slug: `audit-c-${token}`, publisherId: publisher.id, isActive: false } });
    ids.push(inactive.id);
    const unrelated = await prisma.game.create({ data: {
      title: `Inna ${token}`, slug: `audit-d-${token}`,
      description: `${descriptionQuery} ${titleQuery} ${publisherQuery}`,
      shortDescription: `${titleQuery} ${publisherQuery}`,
    } });
    ids.push(unrelated.id);
    const search = (q: string, extra = {}) => fetchGames(gameFilterSchema.parse({ q, ...extra }));
    assert.deepEqual((await search(titleQuery.toLowerCase())).items.map(g => g.id), [first.id]);
    assert.deepEqual((await search(publisherQuery.toLowerCase())).items.map(g => g.id), [second.id]);
    assert.equal((await search(descriptionQuery)).total, 0);
    assert.equal((await search(titleQuery, { publisher: publisher.slug })).total, 0);
    assert.deepEqual((await fetchGames(gameFilterSchema.parse({ publisher: publisher.slug }))).items.map(g => g.id), [second.id]);
    assert.equal((await prisma.gameCopy.count({ where: { gameId: first.id } })), 0);
    assert.equal((await suggestGames(titleQuery))[0]?.slug, first.slug);
    assert.equal((await suggestGames(publisherQuery))[0]?.matchKind, "publisher");
    assert.equal((await suggestGames(descriptionQuery)).length, 0);
    assert.equal((await suggestGames(token, 1)).length, 1);
    assert.equal((await suggestGames(token, Number.NaN)).length, 3);
    console.log(JSON.stringify({ kind: "catalog_only_local_db_verification", passed: 11,
      title_and_publisher_only: true, inactive_excluded: true, games_without_copies_visible: true }));
  } finally {
    await prisma.game.deleteMany({ where: { id: { in: ids } } });
    await prisma.publisher.delete({ where: { id: publisher.id } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
