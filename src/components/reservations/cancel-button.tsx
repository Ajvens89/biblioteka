"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelReservation } from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await cancelReservation(reservationId);
          if (result.success) {
            toast.success("Rezerwacja anulowana.");
            router.refresh();
          } else toast.error(result.error);
        })
      }
    >
      Anuluj rezerwację
    </Button>
  );
}
