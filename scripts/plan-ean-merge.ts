/**
 * Plan ręcznego scalenia duplikatów EAN (tylko odczyt + raport, bez UPDATE).
 *
 *   npm run plan:ean-merge
 */
import "dotenv/config";
import { PrismaClient, ReservationStatus, LoanStatus } from "@prisma/client";
import { normalizeEan } from "../src/lib/services/ean";

const ACTIVE_RESERVATION: ReservationStatus[] = [
  "PENDING",
  "APPROVED",
  "READY_FOR_PICKUP",
  "BORROWED",
];
const ACTIVE_LOAN: LoanStatus[] = ["ACTIVE", "OVERDUE"];

function createPrisma() {
  const url = process.env.DATABASE_URL?.replace(/[?&]pgbouncer=true/gi, "") ?? process.env.DATABASE_URL;
  return url && url !== process.env.DATABASE_URL
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

const prisma = createPrisma();

type GameRow = {
  id: string;
  title: string;
  slug: string;
  ean: string;
  description: string | null;
  coverImageUrl: string | null;
  publisherId: string | null;
  designerId: string | null;
  createdAt: Date;
  copies: Array<{ id: string; inventoryNumber: string; barcode: string | null }>;
  categories: Array<{ categoryId: string }>;
  tags: Array<{ tagId: string }>;
  reservations: Array<{ id: string; status: ReservationStatus; copyId: string | null }>;
};

function scoreGame(g: GameRow) {
  const activeRes = g.reservations.filter((r) => ACTIVE_RESERVATION.includes(r.status)).length;
  return {
    copies: g.copies.length,
    activeRes,
    createdAt: g.createdAt.getTime(),
  };
}

function pickCanonical(games: GameRow[]): { canonical: GameRow; merge: GameRow[] } {
  const sorted = [...games].sort((a, b) => {
    const sa = scoreGame(a);
    const sb = scoreGame(b);
    if (sb.copies !== sa.copies) return sb.copies - sa.copies;
    if (sb.activeRes !== sa.activeRes) return sb.activeRes - sa.activeRes;
    return sa.createdAt - sb.createdAt;
  });
  return { canonical: sorted[0], merge: sorted.slice(1) };
}

async function loadDuplicateGroups(): Promise<Map<string, GameRow[]>> {
  const games = await prisma.game.findMany({
    where: { ean: { not: null }, deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      ean: true,
      description: true,
      coverImageUrl: true,
      publisherId: true,
      designerId: true,
      createdAt: true,
      copies: { select: { id: true, inventoryNumber: true, barcode: true } },
      categories: { select: { categoryId: true } },
      tags: { select: { tagId: true } },
      reservations: {
        select: { id: true, status: true, copyId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const byEan = new Map<string, GameRow[]>();
  for (const g of games) {
    if (!g.ean) continue;
    const row = g as GameRow;
    const list = byEan.get(g.ean) ?? [];
    list.push(row);
    byEan.set(g.ean, list);
  }

  return new Map([...byEan.entries()].filter(([, list]) => list.length > 1));
}

async function loansForGame(gameId: string) {
  return prisma.loan.findMany({
    where: {
      copy: { gameId },
      status: { in: ACTIVE_LOAN },
    },
    select: {
      id: true,
      copyId: true,
      status: true,
      copy: { select: { inventoryNumber: true } },
    },
  });
}

function fieldsToMerge(canonical: GameRow, other: GameRow): string[] {
  const fields: string[] = [];
  if (!canonical.description?.trim() && other.description?.trim()) fields.push("description");
  if (!canonical.coverImageUrl?.trim() && other.coverImageUrl?.trim()) fields.push("coverImageUrl");
  if (!canonical.publisherId && other.publisherId) fields.push("publisherId");
  if (!canonical.designerId && other.designerId) fields.push("designerId");
  const canonCats = new Set(canonical.categories.map((c) => c.categoryId));
  const newCats = other.categories.filter((c) => !canonCats.has(c.categoryId));
  if (newCats.length) fields.push(`categories (+${newCats.length})`);
  const canonTags = new Set(canonical.tags.map((t) => t.tagId));
  const newTags = other.tags.filter((t) => !canonTags.has(t.tagId));
  if (newTags.length) fields.push(`tags (+${newTags.length})`);
  return fields;
}

function inventoryCollisions(canonical: GameRow, merge: GameRow[]): string[] {
  const canonInv = new Set(canonical.copies.map((c) => c.inventoryNumber));
  const issues: string[] = [];
  for (const g of merge) {
    for (const c of g.copies) {
      if (canonInv.has(c.inventoryNumber)) {
        issues.push(
          `Kolizja: ${c.inventoryNumber} (egzemplarz ${c.id} z gry ${g.id}) — zmień nr przed przepięciem`,
        );
      }
    }
  }
  return issues;
}

function emitSqlBlock(
  ean: string,
  canonical: GameRow,
  merge: GameRow[],
  collisions: string[],
) {
  const lines: string[] = [];
  lines.push("-- ============================================================");
  lines.push(`-- EAN: ${ean}`);
  lines.push(`-- Kanoniczna gra: ${canonical.id} („${canonical.title}”, slug=${canonical.slug})`);
  lines.push("-- NIE URUCHAMIAJ AUTOMATYCZNIE — najpierw backup bazy");
  lines.push("-- ============================================================");
  lines.push("");
  lines.push("BEGIN;  -- opcjonalna transakcja ręczna");
  lines.push("");

  for (const g of merge) {
    lines.push(`-- --- Scalanie duplikatu: ${g.id} („${g.title}”) → ${canonical.id} ---`);

    for (const c of g.copies) {
      const collision = collisions.some((x) => x.includes(c.inventoryNumber));
      if (collision) {
        lines.push(
          `-- UPDATE game_copies SET inventory_number = 'NOWY-UNIKALNY-NR' WHERE id = '${c.id}';`,
        );
      }
      lines.push(
        `-- UPDATE game_copies SET game_id = '${canonical.id}' WHERE id = '${c.id}';`,
      );
    }

    const activeRes = g.reservations.filter((r) => ACTIVE_RESERVATION.includes(r.status));
    for (const r of activeRes) {
      lines.push(
        `-- UPDATE reservations SET game_id = '${canonical.id}' WHERE id = '${r.id}';  -- status=${r.status}`,
      );
    }

    const fields = fieldsToMerge(canonical, g);
    if (fields.includes("description")) {
      lines.push(
        `-- UPDATE games SET description = (SELECT description FROM games WHERE id = '${g.id}') WHERE id = '${canonical.id}' AND (description IS NULL OR description = '');`,
      );
    }
    if (fields.includes("coverImageUrl")) {
      lines.push(
        `-- UPDATE games SET cover_image_url = (SELECT cover_image_url FROM games WHERE id = '${g.id}') WHERE id = '${canonical.id}' AND cover_image_url IS NULL;`,
      );
    }
    if (fields.includes("publisherId")) {
      lines.push(
        `-- UPDATE games SET publisher_id = (SELECT publisher_id FROM games WHERE id = '${g.id}') WHERE id = '${canonical.id}' AND publisher_id IS NULL;`,
      );
    }
    if (fields.some((f) => f.startsWith("categories"))) {
      lines.push(
        `-- INSERT INTO game_categories (game_id, category_id) SELECT '${canonical.id}', category_id FROM game_categories WHERE game_id = '${g.id}' ON CONFLICT DO NOTHING;`,
      );
    }
    if (fields.some((f) => f.startsWith("tags"))) {
      lines.push(
        `-- INSERT INTO game_tags (game_id, tag_id) SELECT '${canonical.id}', tag_id FROM game_tags WHERE game_id = '${g.id}' ON CONFLICT DO NOTHING;`,
      );
    }

    lines.push(`-- UPDATE games SET ean = NULL WHERE id = '${g.id}';`);
    lines.push(`-- UPDATE games SET deleted_at = NOW() WHERE id = '${g.id}';`);
    lines.push("");
  }

  lines.push("-- COMMIT;  -- dopiero po weryfikacji");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`❌ Brak połączenia z bazą: ${msg}`);
    console.error("Uruchom lokalnie: npx prisma dev --detach && npm run plan:ean-merge");
    process.exit(1);
  }

  const groups = await loadDuplicateGroups();

  console.log("\n# Plan ręcznego scalenia duplikatów EAN\n");
  console.log(`Wygenerowano: ${new Date().toISOString()}`);
  console.log(`Liczba EAN z duplikatami: ${groups.size}\n`);

  if (groups.size === 0) {
    console.log("Wynik audytu: **brak duplikatów** `games.ean` (deleted_at IS NULL).");
    console.log("Plan scalenia nie jest potrzebny.\n");
    console.log("To jest plan. Przed wykonaniem zrób backup bazy.");
    return;
  }

  let idx = 0;
  for (const [ean, games] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    idx += 1;
    const { canonical, merge } = pickCanonical(games);
    const sc = scoreGame(canonical);
    const collisions = inventoryCollisions(canonical, merge);

    console.log(`## ${idx}. EAN \`${ean}\` (${games.length} gier)\n`);

    console.log("### 1. Rekord kanoniczny\n");
    console.log(`| Pole | Wartość |`);
    console.log(`|------|---------|`);
    console.log(`| id | \`${canonical.id}\` |`);
    console.log(`| tytuł | ${canonical.title} |`);
    console.log(`| slug | ${canonical.slug} |`);
    console.log(`| egzemplarze | ${sc.copies} |`);
    console.log(`| aktywne rezerwacje | ${sc.activeRes} |`);
    console.log(`| created_at | ${canonical.createdAt.toISOString().slice(0, 10)} |`);
    console.log(`| Kryterium | najwięcej egzemplarzy → rezerwacje → najstarszy created_at |\n`);

    console.log("### 2. Rekordy do scalenia\n");
    for (const g of merge) {
      const sg = scoreGame(g);
      console.log(
        `- \`${g.id}\` — „${g.title}” (slug=${g.slug}, egzemplarzy=${sg.copies}, aktywne rez.=${sg.activeRes}, utworzono=${g.createdAt.toISOString().slice(0, 10)})`,
      );
    }
    console.log("");

    console.log("### 3. Pola do przeniesienia (tylko jeśli u kanonicznej są puste)\n");
    for (const g of merge) {
      const f = fieldsToMerge(canonical, g);
      console.log(`- Z \`${g.id}\`: ${f.length ? f.join(", ") : "— nic do uzupełnienia"}`);
    }
    console.log("");

    console.log("### 4. game_copies do przepięcia\n");
    for (const g of merge) {
      if (g.copies.length === 0) {
        console.log(`- Gra \`${g.id}\`: brak egzemplarzy`);
        continue;
      }
      for (const c of g.copies) {
        console.log(`- \`${c.id}\` nr \`${c.inventoryNumber}\` (barcode=${c.barcode ?? "NULL"}) → gra \`${canonical.id}\``);
      }
    }
    console.log("");

    console.log("### 5. Kolizje inventory_number\n");
    if (collisions.length === 0) {
      console.log("Brak kolizji przy przepięciu (numery inwentarzowe unikalne w obrębie grupy).\n");
    } else {
      for (const c of collisions) console.log(`- ⚠ ${c}`);
      console.log("");
    }

    console.log("### 6. Rezerwacje / wypożyczenia\n");
    for (const g of merge) {
      const activeRes = g.reservations.filter((r) => ACTIVE_RESERVATION.includes(r.status));
      const loans = await loansForGame(g.id);
      console.log(`- Gra \`${g.id}\`: aktywne rezerwacje=${activeRes.length}, aktywne wypożyczenia=${loans.length}`);
      for (const r of activeRes) {
        console.log(`  - rezerwacja \`${r.id}\` status=${r.status} copyId=${r.copyId ?? "NULL"}`);
      }
      for (const l of loans) {
        console.log(`  - wypożyczenie \`${l.id}\` status=${l.status} egz. ${l.copy.inventoryNumber}`);
      }
    }
    const canonLoans = await loansForGame(canonical.id);
    console.log(
      `- Gra kanoniczna \`${canonical.id}\`: aktywne wypożyczenia=${canonLoans.length} (po scaleniu egzemplarze zostają przy copy, loans idą przez copy_id)\n`,
    );

    console.log("### 7. Soft-delete po scaleniu\n");
    for (const g of merge) {
      const activeRes = g.reservations.filter((r) => ACTIVE_RESERVATION.includes(r.status)).length;
      const loans = await loansForGame(g.id);
      const canSoft =
        g.copies.length === 0 && activeRes === 0 && loans.length === 0
          ? "TAK — po przepięciu egzemplarzy i aktualizacji rezerwacji"
          : g.copies.length > 0
            ? "TAK — po przepięciu wszystkich egzemplarzy i zamknięciu/ przeniesieniu rezerwacji"
            : "TAK — po wykonaniu kroków SQL (najpierw ean=NULL, potem deleted_at)";
      console.log(`- \`${g.id}\`: ${canSoft}`);
    }
    console.log("");

    console.log("### 8. Propozycja SQL (zakomentowana)\n");
    console.log("```sql");
    console.log(emitSqlBlock(ean, canonical, merge, collisions));
    console.log("```\n");
  }

  const eanBarcode = await prisma.game.findMany({
    where: { ean: { not: null }, deletedAt: null },
    select: {
      id: true,
      title: true,
      ean: true,
      copies: { select: { id: true, inventoryNumber: true, barcode: true } },
    },
  });
  const bad: string[] = [];
  for (const g of eanBarcode) {
    if (!g.ean) continue;
    let pe: string;
    try {
      pe = normalizeEan(g.ean);
    } catch {
      pe = g.ean.replace(/\D/g, "");
    }
    for (const c of g.copies) {
      if (!c.barcode) continue;
      try {
        if (normalizeEan(c.barcode) === pe) bad.push(`${g.title} copy ${c.id}`);
      } catch {
        if (c.barcode.replace(/\D/g, "") === pe) bad.push(`${g.title} copy ${c.id}`);
      }
    }
  }
  if (bad.length) {
    console.log("## Dodatkowo: EAN w barcode egzemplarza\n");
    for (const b of bad) console.log(`- ${b}`);
    console.log("\nPrzed scaleniem: `-- UPDATE game_copies SET barcode = NULL WHERE id = '...';`\n");
  }

  console.log("\n---\n");
  console.log("To jest plan. Przed wykonaniem zrób backup bazy.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
