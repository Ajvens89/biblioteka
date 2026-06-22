"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  gameTitle: string;
  available: number;
  isLoggedIn: boolean;
  loginHref: string;
};

/** Sticky pasek akcji na mobile — przewija do sekcji rezerwacji */
export function GameMobileActionBar({ gameTitle, available, isLoggedIn, loginHref }: Props) {
  if (available <= 0) return null;

  return (
    <div className="game-sticky-bar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{gameTitle}</p>
          <p className="text-xs text-success">Dostępna do rezerwacji</p>
        </div>
        <Button asChild className="shrink-0 min-h-[44px]">
          <Link href={isLoggedIn ? "#rezerwacja" : loginHref}>
            {isLoggedIn ? "Zarezerwuj" : "Zaloguj się"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
