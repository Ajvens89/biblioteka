"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveReservation,
  markReadyForPickup,
  cancelReservation,
} from "@/lib/actions/reservations";
import { issueLoanFromReservation } from "@/lib/actions/loans";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ConfirmKind = "cancel" | "issue" | null;

export function ReservationActions({
  reservationId,
  status,
}: {
  reservationId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, successMsg = "Zaktualizowano.") =>
    start(async () => {
      const result = await fn();
      if (result.success) {
        toast.success(successMsg);
        router.refresh();
      } else toast.error(result.error);
    });

  return (
    <>
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
            Gotowe do odbioru
          </Button>
        )}
        {["APPROVED", "READY_FOR_PICKUP", "PENDING"].includes(status) && (
          <Button
            size="sm"
            disabled={pending}
            data-testid="issue-loan"
            onClick={() => setConfirm("issue")}
          >
            Wydaj grę
          </Button>
        )}
        {!["CANCELLED", "RETURNED", "BORROWED", "EXPIRED"].includes(status) && (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            data-testid="cancel-reservation"
            onClick={() => setConfirm("cancel")}
          >
            Anuluj
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "cancel"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Anulować rezerwację?"
        description="Rezerwacja zostanie anulowana. Użytkownik może złożyć nową."
        confirmLabel="Anuluj rezerwację"
        variant="destructive"
        loading={pending}
        onConfirm={() => run(() => cancelReservation(reservationId), "Rezerwacja anulowana.")}
      />
      <ConfirmDialog
        open={confirm === "issue"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Wydać grę?"
        description="Utworzy się wypożyczenie i egzemplarz przejdzie do statusu wypożyczony."
        confirmLabel="Wydaj"
        loading={pending}
        onConfirm={() => run(() => issueLoanFromReservation(reservationId), "Wydano grę.")}
      />
    </>
  );
}
