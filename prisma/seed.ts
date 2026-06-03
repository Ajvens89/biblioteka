import "dotenv/config";
import { PrismaClient, type UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import slugify from "slugify";
import { DEFAULT_SETTINGS } from "../src/lib/constants";

const prisma = new PrismaClient();

function localAuthUserId(email: string) {
  return `local:${email.toLowerCase()}`;
}

const TEST_USERS = [
  { email: "admin@example.com", password: "Admin123!", role: "ADMIN" as UserRole, fullName: "Admin Testowy" },
  { email: "bibliotekarz@example.com", password: "Bibliotekarz123!", role: "LIBRARIAN" as UserRole, fullName: "Bibliotekarz Testowy" },
  { email: "user@example.com", password: "User123!", role: "USER" as UserRole, fullName: "Użytkownik Testowy" },
];

const GAMES = [
  { title: "Catan", type: "BOARD", difficulty: "MEDIUM", minPlayers: 3, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 120, minAge: 10, featured: true },
  { title: "Carcassonne", type: "BOARD", difficulty: "EASY", minPlayers: 2, maxPlayers: 5, minPlayTime: 30, maxPlayTime: 45, minAge: 7, featured: true },
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
  { title: "Gloomhaven", type: "RPG", difficulty: "EXPERT", minPlayers: 1, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 120, minAge: 14 },
  { title: "Dungeons & Dragons Starter Set", type: "RPG", difficulty: "MEDIUM", minPlayers: 3, maxPlayers: 6, minPlayTime: 120, maxPlayTime: 180, minAge: 12 },
  { title: "Warhammer Age of Sigmar Starter", type: "WARGAME", difficulty: "HARD", minPlayers: 2, maxPlayers: 2, minPlayTime: 60, maxPlayTime: 120, minAge: 12 },
  { title: "Scythe", type: "BOARD", difficulty: "HARD", minPlayers: 1, maxPlayers: 5, minPlayTime: 90, maxPlayTime: 115, minAge: 14 },
  { title: "Root", type: "BOARD", difficulty: "HARD", minPlayers: 2, maxPlayers: 4, minPlayTime: 60, maxPlayTime: 90, minAge: 10 },
  { title: "Everdell", type: "BOARD", difficulty: "MEDIUM", minPlayers: 1, maxPlayers: 4, minPlayTime: 40, maxPlayTime: 80, minAge: 10 },
  { title: "Klask", type: "PARTY", difficulty: "EASY", minPlayers: 2, maxPlayers: 2, minPlayTime: 10, maxPlayTime: 15, minAge: 8 },
  { title: "Biblioteka Zakątka — zestaw edukacyjny", type: "EDUCATIONAL", difficulty: "EASY", minPlayers: 2, maxPlayers: 6, minPlayTime: 20, maxPlayTime: 40, minAge: 6 },
];

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

async function main() {
  console.log("🌱 Seed bazy danych…");

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
      update: { isActive: true, deletedAt: null },
    });

    await prisma.gameCopy.upsert({
      where: { inventoryNumber: `ZF-${String(i + 1).padStart(4, "0")}` },
      create: {
        gameId: game.id,
        inventoryNumber: `ZF-${String(i + 1).padStart(4, "0")}`,
        barcode: `5900000${String(i + 1).padStart(6, "0")}`,
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

  if (userProfile && gameRecords[0]) {
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

  if (librarian) {
    await prisma.auditLog.create({
      data: {
        actorId: librarian.id,
        action: "LOGIN",
        entityType: "system",
        metadata: { seed: true },
      },
    });
  }

  console.log("✅ Seed zakończony.");
  console.log("   Konta testowe:");
  TEST_USERS.forEach((u) => console.log(`   - ${u.email} / ${u.password}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
