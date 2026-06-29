"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReservation } from "@/lib/actions/reservations";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = {
  gameId: string;
  gameTitle?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: ButtonProps["size"];
};

export function ReserveButton({
  gameId,
  gameTitle,
  disabled,
  label = "Zarezerwuj",
  className,
  size = "default",
}: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      data-testid="reserve-button"
      disabled={disabled || pending}
      loading={pending}
      size={size}
      className={className}
      aria-live="polite"
      onClick={() =>
        start(async () => {
          const result = await createReservation(gameId);
          if (result.success) {
            toast.success("Rezerwacja złożona!", {
              description: gameTitle
                ? `Gra „${gameTitle}” czeka na potwierdzenie w bibliotece.`
                : "Potwierdzimy rezerwację w bibliotece.",
              action: {
                label: "Moje rezerwacje",
                onClick: () => router.push("/moje-rezerwacje"),
              },
            });
            router.refresh();
          } else {
            toast.error(result.error ?? "Nie udało się złożyć rezerwacji. Spróbuj ponownie.");
          }
        })
      }
    >
      {label}
    </Button>
  );
}
