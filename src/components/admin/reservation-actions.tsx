"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveReservation,
  markReadyForPickup,
  cancelReservation,
} from "@/lib/actions/reservations";
import { issueLoanFromReservation } from "@/lib/actions/loans";
import { Button } from "@/components/ui/button";

export function ReservationActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) =>
    start(async () => {
      const result = await fn();
      if (result.success) {
        toast.success("Zaktualizowano.");
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <div className="flex flex-wrap gap-1">
      {status === "PENDING" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          data-testid="approve-reservation"
          onClick={() => run(() => approveReservation(reservationId))}
        >
          Zatwierdź
        </Button>
      )}
      {["APPROVED", "PENDING"].includes(status) && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          data-testid="mark-ready-reservation"
          onClick={() => run(() => markReadyForPickup(reservationId))}
        >
          Gotowe
        </Button>
      )}
      {["APPROVED", "READY_FOR_PICKUP", "PENDING"].includes(status) && (
        <Button
          size="sm"
          disabled={pending}
          data-testid="issue-loan"
          onClick={() => run(() => issueLoanFromReservation(reservationId))}
        >
          Wydaj
        </Button>
      )}
      {!["CANCELLED", "RETURNED", "BORROWED", "EXPIRED"].includes(status) && (
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => cancelReservation(reservationId))}>
          Anuluj
        </Button>
      )}
    </div>
  );
}
