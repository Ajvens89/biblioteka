"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReservation } from "@/lib/actions/reservations";
import { Button } from "@/components/ui/button";

export function ReserveButton({
  gameId,
  disabled,
  label = "Zarezerwuj",
}: {
  gameId: string;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      id="rezerwacja"
      data-testid="reserve-button"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const result = await createReservation(gameId);
          if (result.success) {
            toast.success("Rezerwacja została złożona.");
            router.refresh();
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {pending ? "Rezerwowanie…" : label}
    </Button>
  );
}
