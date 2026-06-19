import type { CopyStatus } from "@prisma/client";
import { COPY_STATUS_LABELS } from "@/lib/constants";
import { ServiceError } from "@/lib/services/errors";

const TRANSITIONS: Record<CopyStatus, CopyStatus[]> = {
  AVAILABLE: ["RESERVED", "DAMAGED", "LOST", "REPAIR", "RETIRED"],
  RESERVED: ["AVAILABLE", "DAMAGED", "LOST", "REPAIR", "RETIRED"],
  BORROWED: ["DAMAGED", "LOST", "REPAIR"],
  DAMAGED: ["AVAILABLE", "REPAIR", "LOST", "RETIRED"],
  LOST: ["AVAILABLE", "RETIRED"],
  REPAIR: ["AVAILABLE", "DAMAGED", "RETIRED"],
  RETIRED: [],
};

export type CopyStatusContext = {
  hasActiveLoan: boolean;
  hasActiveReservation: boolean;
};

export function isCopyStatusTransitionAllowed(
  from: CopyStatus,
  to: CopyStatus,
  ctx: CopyStatusContext,
): boolean {
  if (from === to) return true;
  if (!TRANSITIONS[from].includes(to)) return false;
  if (to === "AVAILABLE" && (ctx.hasActiveLoan || ctx.hasActiveReservation)) return false;
  if (from === "BORROWED" && !["DAMAGED", "LOST", "REPAIR"].includes(to)) return false;
  return true;
}

export function assertCopyStatusTransition(
  from: CopyStatus,
  to: CopyStatus,
  ctx: CopyStatusContext,
): void {
  if (from === to) return;

  if (!TRANSITIONS[from].includes(to)) {
    throw new ServiceError(
      `Nie można zmienić statusu z „${COPY_STATUS_LABELS[from]}” na „${COPY_STATUS_LABELS[to]}”.`,
      "INVALID_TRANSITION",
    );
  }

  if (to === "AVAILABLE" && ctx.hasActiveLoan) {
    throw new ServiceError("Egzemplarz ma aktywne wypożyczenie — najpierw przyjmij zwrot.", "ACTIVE_LOAN");
  }

  if (to === "AVAILABLE" && ctx.hasActiveReservation) {
    throw new ServiceError(
      "Egzemplarz ma aktywną rezerwację — anuluj ją lub wydaj grę.",
      "ACTIVE_RESERVATION",
    );
  }

  if (from === "BORROWED" && !["DAMAGED", "LOST", "REPAIR"].includes(to)) {
    throw new ServiceError(
      "Przy wypożyczeniu zmień status przez zwrot, nie ręczną edycję.",
      "ACTIVE_LOAN",
    );
  }
}

export function allowedCopyStatusTargets(from: CopyStatus, ctx: CopyStatusContext): CopyStatus[] {
  return TRANSITIONS[from].filter((to) => isCopyStatusTransitionAllowed(from, to, ctx));
}
