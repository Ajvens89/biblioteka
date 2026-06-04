import Link from "next/link";
import { Calendar, Library } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { CancelReservationButton } from "@/components/reservations/cancel-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GameCover } from "@/components/ui/game-cover";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Moje konto" };

const ACTIVE_RESERVATION = ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"];
const ACTIVE_LOAN = ["ACTIVE", "OVERDUE"];

export default async function MyReservationsPage() {
  const user = await requireUser();

  const [reservations, loans] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: user.id },
      include: { game: true, copy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.findMany({
      where: { userId: user.id },
      include: { copy: { include: { game: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activeReservations = reservations.filter((r) => ACTIVE_RESERVATION.includes(r.status));
  const pastReservations = reservations.filter((r) => !ACTIVE_RESERVATION.includes(r.status));
  const activeLoans = loans.filter((l) => ACTIVE_LOAN.includes(l.status));
  const loanHistory = loans.filter((l) => !ACTIVE_LOAN.includes(l.status));

  return (
    <PageShell width="narrow" className="space-y-10">
      <header>
        <h1 className="text-display">Moje konto</h1>
        <p className="text-body mt-2 text-muted-foreground">
          Rezerwacje i wypożyczenia w bibliotece Zakątka Fantastyki.
        </p>
      </header>

      <SectionCard title="Moje rezerwacje" description="Aktywne i oczekujące na odbiór.">
        {activeReservations.length === 0 ? (
          <EmptyState
            title="Nie masz jeszcze rezerwacji"
            description="Przeglądaj katalog i zarezerwuj grę, gdy znajdziesz coś dla siebie."
            icon={<Library className="h-7 w-7" />}
            action={{ label: "Przejdź do katalogu", href: "/katalog" }}
          />
        ) : (
          <ul className="space-y-4">
            {activeReservations.map((r) => (
              <li
                key={r.id}
                className="card-elevated flex flex-col gap-4 overflow-hidden sm:flex-row"
                data-testid="reservation-item"
                data-game-title={r.game.title}
                data-status={r.status}
              >
                <Link href={`/gry/${r.game.slug}`} className="shrink-0 sm:w-28">
                  <GameCover
                    src={r.game.coverImageUrl}
                    alt={`Okładka: ${r.game.title}`}
                    collectionType={r.game.collectionType}
                    aspect="card"
                    className="rounded-lg sm:h-36"
                    sizes="112px"
                  />
                </Link>
                <div className="min-w-0 flex-1 space-y-2 p-4 sm:py-4 sm:pr-4 sm:pl-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/gry/${r.game.slug}`} className="text-h3 hover:text-primary">
                      {r.game.title}
                    </Link>
                    <StatusBadge kind="reservation" status={r.status} />
                  </div>
                  <p className="text-small inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" aria-hidden />
                    Złożono: {formatDateTime(r.createdAt)}
                    {r.pickupDeadline && ` · Odbiór do: ${formatDate(r.pickupDeadline)}`}
                  </p>
                  {r.copy && (
                    <p className="text-small text-muted-foreground">
                      Egzemplarz: {r.copy.inventoryNumber}
                    </p>
                  )}
                  {["PENDING", "APPROVED", "READY_FOR_PICKUP"].includes(r.status) && (
                    <CancelReservationButton reservationId={r.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {pastReservations.length > 0 && (
        <SectionCard title="Historia rezerwacji">
          <ul className="text-small space-y-2 text-muted-foreground">
            {pastReservations.map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-border/60 py-2 last:border-0">
                <Link href={`/gry/${r.game.slug}`} className="font-medium text-foreground hover:text-primary">
                  {r.game.title}
                </Link>
                <StatusBadge kind="reservation" status={r.status} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Aktywne wypożyczenia">
        {activeLoans.length === 0 ? (
          <p className="text-body text-muted-foreground">Brak aktywnych wypożyczeń.</p>
        ) : (
          <ul className="space-y-4">
            {activeLoans.map((l) => (
              <li
                key={l.id}
                className={
                  l.status === "OVERDUE"
                    ? "card-elevated flex flex-col gap-3 border-destructive/40 bg-destructive/5 p-4 sm:flex-row"
                    : "card-elevated flex flex-col gap-3 p-4 sm:flex-row"
                }
                data-testid="loan-item"
                data-status={l.status}
              >
                <GameCover
                  src={l.copy.game.coverImageUrl}
                  alt={`Okładka: ${l.copy.game.title}`}
                  collectionType={l.copy.game.collectionType}
                  aspect="card"
                  className="shrink-0 rounded-lg sm:h-24 sm:w-20"
                  sizes="80px"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-semibold">{l.copy.game.title}</span>
                    <StatusBadge kind="loan" status={l.status} />
                  </div>
                  <p className="text-small text-muted-foreground">
                    Wypożyczono: {formatDate(l.borrowedAt)} · Termin zwrotu: {formatDate(l.dueAt)}
                  </p>
                  {l.status === "OVERDUE" && (
                    <p className="text-small font-medium text-destructive" role="alert">
                      Termin zwrotu minął — oddaj grę jak najszybciej.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Historia wypożyczeń">
        {loanHistory.length === 0 ? (
          <p className="text-body text-muted-foreground">Brak zakończonych wypożyczeń.</p>
        ) : (
          <ul className="space-y-3">
            {loanHistory.map((l) => (
              <li key={l.id} className="rounded-lg border border-border/80 p-4">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{l.copy.game.title}</span>
                  <StatusBadge kind="loan" status={l.status} />
                </div>
                <p className="text-small mt-1 text-muted-foreground">
                  {formatDate(l.borrowedAt)} – {l.returnedAt ? formatDate(l.returnedAt) : formatDate(l.dueAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Button variant="outline" className="min-h-11" asChild>
        <Link href="/katalog">Przeglądaj katalog</Link>
      </Button>
    </PageShell>
  );
}
