import "dotenv/config";
import { PrismaClient, type UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { DEFAULT_SETTINGS } from "../src/lib/constants";
import { buildEan13 } from "../src/lib/services/ean";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isStaging = args.includes("--staging");
const resetSeedData = args.includes("--reset-seed-data");

/** Blokuje przypadkowe uruchomienie seeda na produkcji. */
function assertSeedAllowed(): void {
  if (process.env.SEED_FORCE === "true") return;

  if (process.env.NODE_ENV === "production" && !isStaging) {
    console.error(
      "❌ Seed zablokowany: NODE_ENV=production. Ustaw SEED_FORCE=true tylko świadomie.",
    );
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL ?? "";
  const prodMarkers = ["neon.tech", ".hosted.app", "production"];
  if (
    prodMarkers.some((marker) => dbUrl.toLowerCase().includes(marker)) &&
    process.env.SEED_FORCE !== "true"
  ) {
    console.error(
      "❌ Seed zablokowany: DATABASE_URL wygląda na produkcję. Ustaw SEED_FORCE=true tylko świadomie.",
    );
    process.exit(1);
  }
}

function localAuthUserId(email: string) {
  return `local:${email.toLowerCase()}`;
}

const TEST_USERS = [
  { email: "admin@example.com", password: "Admin123!", role: "ADMIN" as UserRole, fullName: "Admin Testowy" },
  { email: "bibliotekarz@example.com", password: "Bibliotekarz123!", role: "LIBRARIAN" as UserRole, fullName: "Bibliotekarz Testowy" },
  { email: "user@example.com", password: "User123!", role: "USER" as UserRole, fullName: "Użytkownik Testowy" },
];

/** Fikcyjne kody testowe (suma kontrolna wyliczona algorytmem EAN-13). */
const TEST_EAN = {
  catan: buildEan13("590123412345"),
  carcassonne: buildEan13("590123412346"),
  dnd: buildEan13("978078696559"),
  gloomhaven: buildEan13("978099785487"),
} as const;

const GAMES = [
  { title: "Catan", type: "BOARD", collectionType: "BOARD_GAME" as const, ean: TEST_EAN.catan, difficulty: "MEDIUM", minPlayers: 3, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 120, minAge: 10, featured: true },
  { title: "Carcassonne", type: "BOARD", collectionType: "BOARD_GAME" as const, ean: TEST_EAN.carcassonne, difficulty: "EASY", minPlayers: 2, maxPlayers: 5, minPlayTime: 30, maxPlayTime: 45, minAge: 7, featured: true },
  { title: "Ticket to Ride", type: "BOARD", difficulty: "EASY", minPlayers: 2, maxPlayers: 5, minPlayTime: 30, maxPlayTime: 60, minAge: 8 },
  { title: "Pandemic", type: "BOARD", difficulty: "MEDIUM", minPlayers: 2, maxPlayers: 4, minPlayTime: 45, maxPlayTime: 60, minAge: 8 },
  { title: "Dixit", type: "PARTY", difficulty: "EASY", minPlayers: 3, maxPlayers: 8, minPlayTime: 30, maxPlayTime: 30, minAge: 8 },
  { title: "7 Wonders", type: "CARD", difficulty: "MEDIUM", minPlayers: 2, maxPlayers: 7, minPlayTime: 30, maxPlayTime: 30, minAge: 10 },
  { title: "Azul", type: "BOARD", difficulty: "EASY", minPlayers: 2, maxPlayers: 4, minPlayTime: 30, maxPlayTime: 45, minAge: 8, featured: true },
  { title: "Wingspan", type: "BOARD", difficulty: "MEDIUM", minPlayers: 1, maxPlayers: 5, minPlayTime: 40, maxPlayTime: 70, minAge: 10 },
  { title: "Splendor", type: "BOARD", difficulty: "EASY", minPlayers: 2, maxPlayers: 4, minPlayTime: 30, maxPlayTime: 30, minAge: 10 },
  { title: "King of Tokyo", type: "FAMILY", difficulty: "EASY", minPlayers: 2, maxPlayers: 6, minPlayTime: 20, maxPlayTime: 30, minAge: 8 },
  { title: "Codenames", type: "PARTY", difficulty: "EASY", minPlayers: 2, maxPlayers: 8, minPlayTime: 15, maxPlayTime: 15, minAge: 10 },
  { title: "Terraforming Mars", type: "BOARD", difficulty: "HARD", minPlayers: 1, maxPlayers: 5, minPlayTime: 90, maxPlayTime: 120, minAge: 12 },
  { title: "Gloomhaven", type: "RPG", collectionType: "RPG" as const, ean: TEST_EAN.gloomhaven, difficulty: "EXPERT", minPlayers: 1, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 120, minAge: 14 },
  { title: "Dungeons & Dragons Starter Set", type: "RPG", collectionType: "RPG" as const, ean: TEST_EAN.dnd, difficulty: "MEDIUM", minPlayers: 3, maxPlayers: 6, minPlayTime: 120, maxPlayTime: 180, minAge: 12 },
  { title: "Warhammer Age of Sigmar Starter", type: "WARGAME", difficulty: "HARD", minPlayers: 2, maxPlayers: 2, minPlayTime: 60, maxPlayTime: 120, minAge: 12 },
  { title: "Scythe", type: "BOARD", difficulty: "HARD", minPlayers: 1, maxPlayers: 5, minPlayTime: 90, maxPlayTime: 115, minAge: 14 },
  { title: "Root", type: "BOARD", difficulty: "HARD", minPlayers: 2, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 90, minAge: 10 },
  { title: "Everdell", type: "BOARD", difficulty: "MEDIUM", minPlayers: 1, maxPlayers: 4, minPlayTime: 40, maxPlayTime: 80, minAge: 10 },
  { title: "Klask", type: "PARTY", difficulty: "EASY", minPlayers: 2, maxPlayers: 2, minPlayTime: 10, maxPlayTime: 15, minAge: 8 },
  { title: "Biblioteka Zakątka — zestaw edukacyjny", type: "EDUCATIONAL", difficulty: "EASY", minPlayers: 2, maxPlayers: 6, minPlayTime: 20, maxPlayTime: 40, minAge: 6 },
];

const SEED_GAME_SLUGS = GAMES.map((g) =>
  slugify(g.title, { lower: true, strict: true, locale: "pl" }),
);

/**
 * Usuwa tylko dane z seeda (gry demo + egzemplarze ZF-*).
 * Wymaga jawnej flagi --reset-seed-data. Nie dotyka importu products.json ani ręcznych gier.
 */
async function resetSeedCatalogOnly() {
  console.log("⚠️  --reset-seed-data: usuwanie gier i egzemplarzy z seeda…");
  const seedGames = await prisma.game.findMany({
    where: { slug: { in: SEED_GAME_SLUGS } },
    select: { id: true },
  });
  const gameIds = seedGames.map((g) => g.id);
  if (gameIds.length === 0) {
    console.log("   Brak gier seed do usunięcia.");
    return;
  }

  await prisma.loan.deleteMany({ where: { copy: { gameId: { in: gameIds } } } });
  await prisma.reservation.deleteMany({ where: { gameId: { in: gameIds } } });
  await prisma.gameCopy.deleteMany({
    where: {
      OR: [
        { gameId: { in: gameIds } },
        { inventoryNumber: { startsWith: "ZF-" } },
      ],
    },
  });
  await prisma.gameCategory.deleteMany({ where: { gameId: { in: gameIds } } });
  await prisma.gameTag.deleteMany({ where: { gameId: { in: gameIds } } });
  await prisma.gameImage.deleteMany({ where: { gameId: { in: gameIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  console.log(`   Usunięto ${gameIds.length} gier seed.`);
}

/** Zawsze: konta z hasłem w PostgreSQL (tryb AUTH_PROVIDER=local). */
async function seedLocalUsers() {
  console.log("👤 Tworzenie kont lokalnych (passwordHash w bazie)…");
  for (const u of TEST_USERS) {
    const email = u.email.toLowerCase();
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.profile.upsert({
      where: { email },
      create: {
        authUserId: localAuthUserId(email),
        email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
      },
      update: {
        role: u.role,
        fullName: u.fullName,
        passwordHash,
        isBlocked: false,
      },
    });
  }
}

/** Opcjonalnie: powiązanie z Supabase Auth (AUTH_PROVIDER=supabase). */
async function seedSupabaseUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("[PROJECT") || url.includes("placeholder")) {
    console.log("ℹ️  Supabase pominięty — używasz logowania lokalnego (AUTH_PROVIDER=local).");
    return;
  }

  console.log("🔗 Tworzenie / aktualizacja kont w Supabase Auth…");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  for (const u of TEST_USERS) {
    const email = u.email.toLowerCase();
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((x) => x.email?.toLowerCase() === email);

    let authUserId = existing?.id;
    if (!authUserId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (error) {
        console.error(`  ✗ ${u.email}: ${error.message}`);
        continue;
      }
      authUserId = data.user?.id;
    }

    if (authUserId) {
      await prisma.profile.update({
        where: { email },
        data: { authUserId },
      });
      console.log(`  ✓ ${u.email} → Supabase`);
    }
  }
}

async function seedDemoReservations(
  userProfile: { id: string },
  gameRecords: { id: string }[],
) {
  if (gameRecords.length < 3) return;

  const existingPending = await prisma.reservation.findFirst({
    where: { userId: userProfile.id, gameId: gameRecords[0].id, status: "PENDING" },
  });
  if (!existingPending) {
    const copy = await prisma.gameCopy.findFirst({
      where: { gameId: gameRecords[0].id, status: "AVAILABLE" },
    });
    if (copy) {
      await prisma.gameCopy.update({ where: { id: copy.id }, data: { status: "RESERVED" } });
      await prisma.reservation.create({
        data: {
          userId: userProfile.id,
          gameId: gameRecords[0].id,
          copyId: copy.id,
          status: "PENDING",
          pickupDeadline: new Date(Date.now() + 3 * 86400000),
        },
      });
    }
  }

  const existingReady = await prisma.reservation.findFirst({
    where: { userId: userProfile.id, gameId: gameRecords[1].id, status: "READY_FOR_PICKUP" },
  });
  if (!existingReady) {
    const copy2 = await prisma.gameCopy.findFirst({
      where: { gameId: gameRecords[1].id, status: "AVAILABLE" },
    });
    if (copy2) {
      await prisma.reservation.create({
        data: {
          userId: userProfile.id,
          gameId: gameRecords[1].id,
          copyId: copy2.id,
          status: "READY_FOR_PICKUP",
          pickupDeadline: new Date(Date.now() + 2 * 86400000),
          approvedAt: new Date(),
          readyAt: new Date(),
        },
      });
      await prisma.gameCopy.update({ where: { id: copy2.id }, data: { status: "RESERVED" } });
    }
  }

  const existingLoan = await prisma.loan.findFirst({
    where: { userId: userProfile.id, copy: { gameId: gameRecords[2].id } },
  });
  if (!existingLoan) {
    const borrowedCopy = await prisma.gameCopy.findFirst({
      where: { gameId: gameRecords[2].id },
    });
    if (borrowedCopy) {
      await prisma.gameCopy.update({ where: { id: borrowedCopy.id }, data: { status: "BORROWED" } });
      const due = new Date();
      due.setDate(due.getDate() - 2);
      await prisma.loan.create({
        data: {
          userId: userProfile.id,
          copyId: borrowedCopy.id,
          status: "OVERDUE",
          dueAt: due,
        },
      });
    }
  }
}

async function main() {
  assertSeedAllowed();

  if (isStaging) {
    console.log("🌱 Seed STAGING (idempotentny upsert, bez usuwania danych)…");
  } else {
    console.log("🌱 Seed bazy danych…");
  }

  if (resetSeedData) {
    await resetSeedCatalogOnly();
  } else if (isStaging) {
    console.log("   Pominięto usuwanie — aby wyczyścić katalog seed, użyj: npm run db:seed:staging -- --reset-seed-data");
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  const categories = await Promise.all(
    ["Strategia", "Kooperacja", "Imprezowe", "RPG", "Rodzinne", "Edukacyjne"].map((name) =>
      prisma.category.upsert({
        where: { slug: slugify(name, { lower: true, strict: true }) },
        create: { name, slug: slugify(name, { lower: true, strict: true }) },
        update: {},
      }),
    ),
  );

  const tags = await Promise.all(
    ["fantastyka", "sci-fi", "dedukcja", "ekonomia", "budowanie", "wojenne"].map((name) =>
      prisma.tag.upsert({
        where: { slug: name },
        create: { name, slug: name },
        update: {},
      }),
    ),
  );

  const publishers = await Promise.all(
    ["Rebel", "Galakta", "Portal Games", "CD Projekt Red", "Asmodee"].map((name) =>
      prisma.publisher.upsert({
        where: { slug: slugify(name, { lower: true, strict: true }) },
        create: { name, slug: slugify(name, { lower: true, strict: true }) },
        update: {},
      }),
    ),
  );

  const designers = await Promise.all(
    ["Klaus Teuber", "Klaus-Jürgen Wrede", "Matt Leacock", "Jamey Stegmaier"].map((name) =>
      prisma.designer.upsert({
        where: { slug: slugify(name, { lower: true, strict: true }) },
        create: { name, slug: slugify(name, { lower: true, strict: true }) },
        update: {},
      }),
    ),
  );

  const gameRecords = [];
  for (let i = 0; i < GAMES.length; i++) {
    const g = GAMES[i];
    const slug = slugify(g.title, { lower: true, strict: true, locale: "pl" });
    const game = await prisma.game.upsert({
      where: { slug },
      create: {
        title: g.title,
        slug,
        ean: "ean" in g ? (g as { ean?: string }).ean : null,
        collectionType: "collectionType" in g ? (g as { collectionType?: "BOARD_GAME" | "RPG" }).collectionType ?? "BOARD_GAME" : "BOARD_GAME",
        description: `${g.title} — przykładowa gra w bibliotece Zakątka Fantastyki.`,
        shortDescription: `Popularna gra planszowa: ${g.title}.`,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        minAge: g.minAge,
        minPlayTime: g.minPlayTime,
        maxPlayTime: g.maxPlayTime,
        difficulty: g.difficulty as never,
        type: g.type as never,
        publisherId: publishers[i % publishers.length].id,
        designerId: designers[i % designers.length].id,
        yearPublished: 2015 + (i % 10),
        isFeatured: "featured" in g && g.featured,
        popularityCount: Math.floor(Math.random() * 50),
        categories: {
          create: [{ categoryId: categories[i % categories.length].id }],
        },
        tags: {
          create: [{ tagId: tags[i % tags.length].id }],
        },
      },
      update: {
        isActive: true,
        deletedAt: null,
        ean: "ean" in g ? (g as { ean?: string }).ean : undefined,
        collectionType: "collectionType" in g ? (g as { collectionType?: "BOARD_GAME" | "RPG" }).collectionType : undefined,
      },
    });

    await prisma.gameCopy.upsert({
      where: { inventoryNumber: `ZF-${String(i + 1).padStart(4, "0")}` },
      create: {
        gameId: game.id,
        inventoryNumber: `ZF-${String(i + 1).padStart(4, "0")}`,
        barcode: `ZF-EGZ-${String(i + 1).padStart(4, "0")}`,
        status: i % 5 === 0 ? "BORROWED" : i % 7 === 0 ? "RESERVED" : "AVAILABLE",
        location: "Regał A",
      },
      update: {},
    });

    if (i < 5) {
      await prisma.gameCopy.create({
        data: {
          gameId: game.id,
          inventoryNumber: `ZF-${String(i + 1).padStart(4, "0")}-B`,
          status: "AVAILABLE",
          location: "Regał B",
        },
      });
    }

    gameRecords.push(game);
  }

  await seedLocalUsers();
  await seedSupabaseUsers();

  const userProfile = await prisma.profile.findUnique({ where: { email: "user@example.com" } });
  const librarian = await prisma.profile.findUnique({ where: { email: "bibliotekarz@example.com" } });

  if (userProfile && gameRecords.length > 0) {
    await seedDemoReservations(userProfile, gameRecords);
  }

  if (librarian) {
    const recentLogin = await prisma.auditLog.findFirst({
      where: { actorId: librarian.id, action: "LOGIN", entityType: "system" },
      orderBy: { createdAt: "desc" },
    });
    if (!recentLogin?.metadata || !(recentLogin.metadata as { seed?: boolean }).seed) {
      await prisma.auditLog.create({
        data: {
          actorId: librarian.id,
          action: "LOGIN",
          entityType: "system",
          metadata: { seed: true },
        },
      });
    }
  }

  console.log("✅ Seed zakończony.");
  console.log("   Konta testowe (hasła — README / docs/STAGING.md, nie logujemy haseł):");
  TEST_USERS.forEach((u) => console.log(`   - ${u.email} (${u.role})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
