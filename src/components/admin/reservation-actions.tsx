"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveReservation,
  cancelReservation,
  extendReservationPickup,
  markReadyForPickup,
  rejectReservation,
} from "@/lib/actions/reservations";
import { issueLoanFromReservation } from "@/lib/actions/loans";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfirmKind = "cancel" | "issue" | "reject" | null;

export function ReservationActions({
  reservationId,
  status,
  pickupDeadline,
}: {
  reservationId: string;
  status: string;
  pickupDeadline?: Date | string | null;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [rejectReason, setRejectReason] = useState("");

  const run = (fn: () => Promise<{ success: boolean; error?: string; message?: string }>, successMsg?: string) =>
    start(async () => {
      const result = await fn();
      if (result.success) {
        toast.success(successMsg ?? result.message ?? "Zaktualizowano.");
        router.refresh();
      } else toast.error(result.error);
    });

  const canExtendPickup = ["PENDING", "APPROVED", "READY_FOR_PICKUP"].includes(status);

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {status === "PENDING" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              data-testid="approve-reservation"
              onClick={() => run(() => approveReservation(reservationId))}
            >
              Zatwierdź
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              data-testid="reject-reservation"
              onClick={() => setConfirm("reject")}
            >
              Odrzuć
            </Button>
          </>
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
        {canExtendPickup && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            data-testid="extend-pickup"
            onClick={() => run(() => extendReservationPickup(reservationId, 3), "Przedłużono termin odbioru.")}
          >
            +3 dni odbioru
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

      {pickupDeadline && canExtendPickup && (
        <p className="mt-1 text-xs text-muted-foreground">
          Termin odbioru: {new Date(pickupDeadline).toLocaleDateString("pl-PL")}
        </p>
      )}

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
      <ConfirmDialog
        open={confirm === "reject"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Odrzucić rezerwację?"
        description="Rezerwacja zostanie anulowana z powiadomieniem w logu audytu."
        confirmLabel="Odrzuć"
        variant="destructive"
        loading={pending}
        closeOnConfirm={false}
        onConfirm={() => {
          if (rejectReason.trim().length < 3) {
            toast.error("Podaj powód odrzucenia (min. 3 znaki).");
            return;
          }
          run(() => rejectReservation(reservationId, rejectReason), "Rezerwacja odrzucona.");
          setConfirm(null);
          setRejectReason("");
        }}
      >
        <div className="space-y-2 pt-2">
          <Label htmlFor={`reject-reason-${reservationId}`}>Powód</Label>
          <Input
            id={`reject-reason-${reservationId}`}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Np. brak egzemplarza w stanie do wypożyczenia"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
