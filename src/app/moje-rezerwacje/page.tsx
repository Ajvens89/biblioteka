import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { CancelReservationButton } from "@/components/reservations/cancel-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOAN_STATUS_LABELS, RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Moje rezerwacje" };

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

  const active = reservations.filter((r) =>
    ["PENDING", "APPROVED", "READY_FOR_PICKUP", "BORROWED"].includes(r.status),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold">Moje rezerwacje</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Aktywne rezerwacje</h2>
        {active.length === 0 ? (
          <p className="text-muted-foreground">Brak aktywnych rezerwacji.</p>
        ) : (
          <ul className="space-y-3">
            {active.map((r) => (
              <li
                key={r.id}
                className="rounded-lg border p-4"
                data-testid="reservation-item"
                data-game-title={r.game.title}
                data-status={r.status}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/gry/${r.game.slug}`} className="font-medium hover:underline">
                      {r.game.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Złożono: {formatDateTime(r.createdAt)}
                      {r.pickupDeadline && ` · Odbiór do: ${formatDate(r.pickupDeadline)}`}
                    </p>
                    {r.copy && (
                      <p className="text-xs text-muted-foreground">
                        Egzemplarz: {r.copy.inventoryNumber}
                      </p>
                    )}
                  </div>
                  <Badge>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                </div>
                {["PENDING", "APPROVED", "READY_FOR_PICKUP"].includes(r.status) && (
                  <div className="mt-3">
                    <CancelReservationButton reservationId={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Historia wypożyczeń</h2>
        {loans.length === 0 ? (
          <p className="text-muted-foreground">Brak wypożyczeń.</p>
        ) : (
          <ul className="space-y-3">
            {loans.map((l) => (
              <li key={l.id} className="rounded-lg border p-4">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{l.copy.game.title}</span>
                  <Badge variant={l.status === "OVERDUE" ? "destructive" : "secondary"}>
                    {LOAN_STATUS_LABELS[l.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wypożyczono: {formatDate(l.borrowedAt)} · Termin: {formatDate(l.dueAt)}
                  {l.returnedAt && ` · Zwrócono: ${formatDate(l.returnedAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button variant="outline" asChild>
        <Link href="/katalog">Przeglądaj katalog</Link>
      </Button>
    </div>
  );
}
