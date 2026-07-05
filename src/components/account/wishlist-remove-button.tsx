"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeWishlistItemAction } from "@/lib/actions/wishlist";
import { Button } from "@/components/ui/button";

type Props = { gameId: string; gameTitle: string };

export function WishlistRemoveButton({ gameId, gameTitle }: Props) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Usuń „${gameTitle}” z listy życzeń`}
      data-testid={`wishlist-remove-${gameId}`}
      onClick={() =>
        start(async () => {
          const result = await removeWishlistItemAction(gameId);
          if (result.success) toast.success("Usunięto z listy życzeń.");
          else toast.error(result.error ?? "Nie udało się usunąć.");
        })
      }
    >
      <Trash2 className="h-4 w-4" aria-hidden />
      Usuń
    </Button>
  );
}
