"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { ReserveButton } from "@/components/games/reserve-button";
import { Button } from "@/components/ui/button";

type Props = {
  gameId: string;
  gameTitle: string;
  available: number;
  total: number;
  isLoggedIn: boolean;
  loginHref: string;
};

/** Sticky pasek akcji na mobile — jedno wyraźne CTA zawsze widoczne. */
export function GameMobileActionBar({
  gameId,
  gameTitle,
  available,
  total,
  isLoggedIn,
  loginHref,
}: Props) {
  const noCopies = total === 0;
  const isAvailable = available > 0;

  let statusText: string;
  if (noCopies) statusText = "Brak egzemplarzy w bibliotece";
  else if (isAvailable) statusText = `${available} ${available === 1 ? "egzemplarz" : "egzemplarze"} wolne`;
  else statusText = "Dołącz do listy oczekujących";

  return (
    <div
      className="game-sticky-bar fixed inset-x-0 bottom-0 z-40 lg:hidden"
      role="region"
      aria-label="Szybka akcja rezerwacji"
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{gameTitle}</p>
          <p
            className={cnStatus(isAvailable, noCopies)}
            data-testid="mobile-action-status"
          >
            {statusText}
          </p>
        </div>

        {noCopies ? (
          <Button variant="outline" className="shrink-0 min-h-[44px]" asChild>
            <Link href="#rezerwacja">Szczegóły</Link>
          </Button>
        ) : isAvailable ? (
          isLoggedIn ? (
            <ReserveButton
              gameId={gameId}
              gameTitle={gameTitle}
              size="default"
              className="shrink-0 min-h-[44px] px-5"
            />
          ) : (
            <Button asChild className="shrink-0 min-h-[44px]">
              <Link href={loginHref}>
                <LogIn className="h-4 w-4" aria-hidden />
                Zaloguj się
              </Link>
            </Button>
          )
        ) : (
          <Button asChild className="shrink-0 min-h-[44px]">
            <Link href="#rezerwacja">{isLoggedIn ? "Lista oczekujących" : "Zaloguj się"}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function cnStatus(isAvailable: boolean, noCopies: boolean): string {
  if (noCopies) return "text-xs text-muted-foreground";
  if (isAvailable) return "text-xs font-medium text-success";
  return "text-xs text-muted-foreground";
}
