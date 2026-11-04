import type { CopyStatus, Prisma, PrismaClient } from "@prisma/client";
import { ServiceError } from "./errors";

type CopyUpdate = Omit<Prisma.GameCopyUpdateManyMutationInput, "status"> & { status: CopyStatus };

/** Preserve circulation changes made since the editor loaded its copy/status context. */
export async function updateCopyIfUnchanged(
  db: PrismaClient,
  copyId: string,
  expectedStatus: CopyStatus,
  data: CopyUpdate,
): Promise<void> {
  const updated = await db.gameCopy.updateMany({
    where: {
      id: copyId,
      status: expectedStatus,
      ...(data.status === "AVAILABLE" ? {
        loans: { none: { status: { in: ["ACTIVE", "OVERDUE"] } } },
        reservations: { none: { status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] } } },
      } : {}),
    },
    data,
  });
  if (updated.count !== 1) {
    throw new ServiceError(
      "Stan egzemplarza został zmieniony. Odśwież stronę i sprawdź rezerwacje oraz wypożyczenia.",
      "COPY_CHANGED",
    );
  }
}
