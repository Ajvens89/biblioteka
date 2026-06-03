"use server";

import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { isActorResult, requireActorAdmin } from "@/lib/auth/actor";
import { parseGamesCsv } from "@/lib/csv/games";
import { prisma } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";

export async function importGamesCsv(formData: FormData): Promise<ActionResult<{ count: number }>> {
  const actorResult = await requireActorAdmin();
  if (!isActorResult(actorResult)) return actorResult;
  const user = actorResult;

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Brak pliku CSV.");

  const content = await file.text();
  let rows;
  try {
    rows = parseGamesCsv(content);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Błąd CSV");
  }

  let count = 0;
  for (const row of rows) {
    const slug =
      row.slug ||
      slugify(row.title, { lower: true, strict: true, locale: "pl" });
    await prisma.game.upsert({
      where: { slug },
      create: {
        title: row.title,
        slug,
        description: row.description,
        shortDescription: row.shortDescription,
        minPlayers: Number(row.minPlayers) || 2,
        maxPlayers: Number(row.maxPlayers) || 4,
        minAge: Number(row.minAge) || 10,
        minPlayTime: Number(row.minPlayTime) || 30,
        maxPlayTime: Number(row.maxPlayTime) || 60,
        difficulty: (row.difficulty as "MEDIUM") || "MEDIUM",
        type: (row.type as "BOARD") || "BOARD",
        yearPublished: row.yearPublished ? Number(row.yearPublished) : null,
      },
      update: {
        title: row.title,
        description: row.description,
        shortDescription: row.shortDescription,
      },
    });
    count++;
  }

  await logAudit({
    actorId: user.id,
    action: "IMPORT",
    entityType: "games",
    metadata: { count },
  });

  revalidatePath("/admin/gry");
  return ok({ count });
}
