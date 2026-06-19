"use server";

import { revalidatePath } from "next/cache";
import { getActorFromDb, isActorResult, requireActor } from "@/lib/auth/actor";
import { prisma } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/actions/utils";
import { z } from "zod";
import { uuidSchema } from "@/lib/validations/ids";

const PAGE_SIZE = 20;

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await getActorFromDb();
  if (!user) return 0;
  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
}

export async function getNotifications(page = 1) {
  const user = await requireActor();
  if (!isActorResult(user)) return { items: [], total: 0, page: 1, pages: 0 };

  const skip = (page - 1) * PAGE_SIZE;
  const [items, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: user.id } }),
  ]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE) || 1,
  };
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const parsed = z.object({ notificationId: uuidSchema }).safeParse({ notificationId });
  if (!parsed.success) return fail("Nieprawidłowy identyfikator.");

  const user = await requireActor();
  if (!isActorResult(user)) return user;

  const updated = await prisma.notification.updateMany({
    where: { id: parsed.data.notificationId, userId: user.id },
    data: { isRead: true },
  });
  if (updated.count === 0) return fail("Powiadomienie nie istnieje.");

  revalidatePath("/", "layout");
  return ok();
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await requireActor();
  if (!isActorResult(user)) return user;

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/", "layout");
  return ok();
}
