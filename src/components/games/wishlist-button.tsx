"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  gameId: string;
  initialOnWishlist: boolean;
  isLoggedIn: boolean;
  loginHref: string;
};

export function WishlistButton({ gameId, initialOnWishlist, isLoggedIn, loginHref }: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [onList, setOnList] = useState(initialOnWishlist);

  if (!isLoggedIn) {
    return (
      <Button variant="outline" className="min-h-11" asChild>
        <a href={loginHref}>
          <Heart className="h-4 w-4" aria-hidden />
          Zaloguj się, aby dodać do listy życzeń
        </a>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("min-h-11", onList && "border-primary/50 bg-primary/5")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await toggleWishlistAction(gameId);
          if (result.success && result.data) {
            setOnList(result.data.onWishlist);
            toast.success(result.message ?? "Zaktualizowano listę życzeń.");
            router.refresh();
          } else if (!result.success) {
            toast.error(result.error);
          }
        })
      }
      data-testid="wishlist-button"
      aria-pressed={onList}
    >
      <Heart className={cn("h-4 w-4", onList && "fill-primary text-primary")} aria-hidden />
      {onList ? "Na liście życzeń" : "Dodaj do listy życzeń"}
    </Button>
  );
}
