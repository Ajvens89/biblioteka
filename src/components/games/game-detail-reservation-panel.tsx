import Link from "next/link";
import { LogIn } from "lucide-react";
import { ReserveButton } from "@/components/games/reserve-button";
import { WaitlistButton } from "@/components/games/waitlist-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  gameId: string;
  gameTitle: string;
  available: number;
  total: number;
  isLoggedIn: boolean;
  loginHref: string;
  waitlistStatus: { position: number; status: string } | null;
};

export function GameDetailReservationPanel({
  gameId,
  gameTitle,
  available,
  total,
  isLoggedIn,
  loginHref,
  waitlistStatus,
}: Props) {
  const noCopies = total === 0;
  const isAvailable = available > 0;

  return (
    <section
      id="rezerwacja"
      className={cn(
        "zf-game-reservation scroll-mt-24",
        isAvailable && "zf-game-reservation--available",
        !isAvailable && !noCopies && "zf-game-reservation--waitlist",
        noCopies && "zf-game-reservation--empty",
      )}
      aria-labelledby="game-reservation-heading"
      data-testid="game-reservation-panel"
    >
      <h2 id="game-reservation-heading" className="sr-only">
        Rezerwacja gry
      </h2>

      {noCopies ? (
        <div className="space-y-3">
          <p className="font-display text-lg font-semibold">Brak egzemplarzy w bibliotece</p>
          <p className="text-sm text-muted-foreground">
            Ta gra nie ma jeszcze przypisanych egzemplarzy. Dodaj ją do listy życzeń — damy znać, gdy pojawi się w
            zbiorze.
          </p>
        </div>
      ) : isAvailable ? (
        <div className="space-y-4">
          <div>
            <p className="font-display text-xl font-bold text-foreground">Zarezerwuj teraz</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {available === 1
                ? "Jeden wolny egzemplarz czeka na Ciebie."
                : `${available} wolne egzemplarze — wybierz termin odbioru po potwierdzeniu.`}
            </p>
          </div>
          {isLoggedIn ? (
            <ReserveButton gameId={gameId} gameTitle={gameTitle} className="w-full sm:w-auto" size="lg" />
          ) : (
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={loginHref}>
                <LogIn className="h-5 w-5" aria-hidden />
                Zaloguj się, aby zarezerwować
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-display text-lg font-semibold">Wszystkie egzemplarze zajęte</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dołącz do listy oczekujących — powiadomimy Cię, gdy gra wróci na półkę.
            </p>
          </div>
          {isLoggedIn ? (
            <WaitlistButton
              gameId={gameId}
              available={available}
              initialStatus={waitlistStatus}
              loginHref={loginHref}
              isLoggedIn
            />
          ) : (
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={loginHref}>
                <LogIn className="h-5 w-5" aria-hidden />
                Zaloguj się, aby dołączyć do listy
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
