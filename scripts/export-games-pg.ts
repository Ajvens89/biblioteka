/**
 * Eksport przez pg (obejście prepared statement w Prisma Dev)
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const LOCAL_URL =
  process.env.LOCAL_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const outArg = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".json"));
const outPath = path.resolve(outArg ?? "./data/games.json");

async function main() {
  const client = new pg.Client({ connectionString: LOCAL_URL });
  await client.connect();

  const games = await client.query(`
    SELECT g.*, p.name AS publisher_name, d.name AS designer_name
    FROM games g
    LEFT JOIN publishers p ON g.publisher_id = p.id
    LEFT JOIN designers d ON g.designer_id = d.id
    WHERE g.deleted_at IS NULL
    ORDER BY g.title
  `);
  const copies = await client.query(
    "SELECT * FROM game_copies ORDER BY inventory_number",
  );
  const cats = await client.query(`
    SELECT gc.game_id, c.name FROM game_categories gc
    JOIN categories c ON gc.category_id = c.id
  `);
  const tags = await client.query(`
    SELECT gt.game_id, t.name FROM game_tags gt
    JOIN tags t ON gt.tag_id = t.id
  `);

  const copiesByGame: Record<string, typeof copies.rows> = {};
  for (const cp of copies.rows) {
    (copiesByGame[cp.game_id] ??= []).push(cp);
  }
  const catsByGame: Record<string, string[]> = {};
  for (const row of cats.rows) {
    (catsByGame[row.game_id] ??= []).push(row.name);
  }
  const tagsByGame: Record<string, string[]> = {};
  for (const row of tags.rows) {
    (tagsByGame[row.game_id] ??= []).push(row.name);
  }

  const file = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "biblioteka-export-pg",
    games: games.rows.map((g) => ({
      title: g.title,
      slug: g.slug,
      ean: g.ean,
      collectionType: g.collection_type,
      description: g.description,
      shortDescription: g.short_description,
      minPlayers: g.min_players,
      maxPlayers: g.max_players,
      minAge: g.min_age,
      minPlayTime: g.min_play_time,
      maxPlayTime: g.max_play_time,
      difficulty: g.difficulty,
      type: g.type,
      yearPublished: g.year_published,
      coverImageUrl: g.cover_image_url,
      coverImageSource: g.cover_image_source,
      instructionUrl: g.instruction_url,
      isActive: g.is_active,
      isFeatured: g.is_featured,
      publisher: g.publisher_name,
      designer: g.designer_name,
      categories: catsByGame[g.id] ?? [],
      tags: tagsByGame[g.id] ?? [],
      copies: (copiesByGame[g.id] ?? []).map((cp) => ({
        inventoryNumber: cp.inventory_number,
        barcode: cp.barcode,
        status: cp.status,
        condition: cp.condition,
        location: cp.location,
        notes: cp.notes,
      })),
    })),
  };

  await writeFile(outPath, JSON.stringify(file, null, 2), "utf8");
  const withCover = games.rows.filter((g) => g.cover_image_url).length;
  console.log(`✅ Zapisano ${file.games.length} gier → ${outPath} (okładki: ${withCover})`);
  await client.end();
}

main().catch((e) => {
  console.error(`❌ EXPORT FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
