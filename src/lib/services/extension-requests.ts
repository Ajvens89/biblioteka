import type { PrismaClient } from "@prisma/client";
import { notifyUser } from "@/lib/notifications";
import { getSettingNumber } from "@/lib/settings";
import { ServiceError } from "@/lib/services/errors";

export async function requestLoanExtension(
  db: PrismaClient,
  userId: string,
  loanId: string,
  reason?: string,
  requestedDays = 7,
): Promise<{ requestId: string }> {
  const loan = await db.loan.findFirst({
    where: { id: loanId, userId },
    include: { copy: { include: { game: true } } },
  });
  if (!loan) throw new ServiceError("Wypożyczenie nie istnieje.", "NOT_FOUND");
  if (!["ACTIVE", "OVERDUE"].includes(loan.status)) {
    throw new ServiceError("Nie można przedłużyć tego wypożyczenia.", "INVALID_STATUS");
  }

  const maxExt = await getSettingNumber("maxLoanExtensions", 2);
  if (loan.extensionCount >= maxExt) {
    throw new ServiceError(`Osiągnięto limit przedłużeń (${maxExt}).`, "LIMIT");
  }

  const pending = await db.loanExtensionRequest.findFirst({
    where: { loanId, userId, status: "PENDING" },
  });
  if (pending) throw new ServiceError("Masz już oczekującą prośbę o przedłużenie.", "DUPLICATE");

  const created = await db.loanExtensionRequest.create({
    data: {
      loanId,
      userId,
      reason: reason?.trim() || null,
      requestedDays,
      status: "PENDING",
    },
  });

  return { requestId: created.id };
}

export async function approveExtensionRequest(
  db: PrismaClient,
  requestId: string,
  reviewerId: string,
): Promise<void> {
  const request = await db.loanExtensionRequest.findUnique({
    where: { id: requestId },
    include: {
      loan: { include: { copy: { include: { game: true } } } },
      user: true,
    },
  });
  if (!request || request.status !== "PENDING") {
    throw new ServiceError("Prośba nie istnieje lub została już rozpatrzona.", "NOT_FOUND");
  }

  const loan = request.loan;
  const maxExt = await getSettingNumber("maxLoanExtensions", 2);
  if (!["ACTIVE", "OVERDUE"].includes(loan.status)) {
    throw new ServiceError("Wypożyczenie nie jest aktywne.", "INVALID_STATUS");
  }
  if (loan.extensionCount >= maxExt) {
    throw new ServiceError(`Osiągnięto limit przedłużeń (${maxExt}).`, "LIMIT");
  }

  const newDue = new Date(loan.dueAt);
  newDue.setDate(newDue.getDate() + request.requestedDays);

  await db.$transaction([
    db.loanExtension.create({
      data: {
        loanId: loan.id,
        previousDue: loan.dueAt,
        newDue,
        reason: request.reason ?? "Prośba użytkownika — zatwierdzona",
      },
    }),
    db.loan.update({
      where: { id: loan.id },
      data: {
        dueAt: newDue,
        extensionCount: { increment: 1 },
        status: "ACTIVE",
      },
    }),
    db.loanExtensionRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: reviewerId,
      },
    }),
  ]);

  const gameTitle = loan.copy.game.title;
  await notifyUser({
    userId: request.userId,
    email: request.user.email,
    type: "EXTENSION_APPROVED",
    title: "Przedłużenie wypożyczenia zatwierdzone",
    body: `„${gameTitle}" — nowy termin zwrotu: ${newDue.toLocaleDateString("pl-PL")}.`,
    linkUrl: "/moje-konto?tab=wypozyczenia",
    emailSubject: "Przedłużenie wypożyczenia — zatwierdzone",
    emailHtml: `<p>Twoja prośba o przedłużenie wypożyczenia <strong>${gameTitle}</strong> została zatwierdzona.</p>
<p>Nowy termin zwrotu: <strong>${newDue.toLocaleDateString("pl-PL")}</strong>.</p>`,
  });
}

export async function rejectExtensionRequest(
  db: PrismaClient,
  requestId: string,
  reviewerId: string,
): Promise<void> {
  const request = await db.loanExtensionRequest.findUnique({
    where: { id: requestId },
    include: {
      loan: { include: { copy: { include: { game: true } } } },
      user: true,
    },
  });
  if (!request || request.status !== "PENDING") {
    throw new ServiceError("Prośba nie istnieje lub została już rozpatrzona.", "NOT_FOUND");
  }

  await db.loanExtensionRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    },
  });

  const gameTitle = request.loan.copy.game.title;
  await notifyUser({
    userId: request.userId,
    email: request.user.email,
    type: "EXTENSION_REJECTED",
    title: "Prośba o przedłużenie odrzucona",
    body: `„${gameTitle}" — skontaktuj się z bibliotekarzem, jeśli potrzebujesz pomocy.`,
    linkUrl: "/moje-konto?tab=wypozyczenia",
  });
}
