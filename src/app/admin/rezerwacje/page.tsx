import Link from "next/link";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import type { ReservationStatus } from "@prisma/client";
import { CalendarCheck } from "lucide-react";

export const metadata = { title: "Rezerwacje" };

const statuses = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const reservations = await prisma.reservation.findMany({
    where: status ? { status: status as ReservationStatus } : undefined,
    include: { user: true, game: true, copy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Rezerwacje"
        description="Obsługa rezerwacji od zgłoszenia do wypożyczenia."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={!status ? "default" : "outline"} size="sm" asChild>
          <Link href="/admin/rezerwacje">Wszystkie</Link>
        </Button>
        {statuses.map((s) => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" asChild>
            <Link href={`/admin/rezerwacje?status=${s}`}>{RESERVATION_STATUS_LABELS[s]}</Link>
          </Button>
        ))}
      </div>

      {reservations.length === 0 ? (
        <EmptyState
          title="Brak rezerwacji"
          description={status ? "Brak pozycji w wybranym statusie." : "Nie ma jeszcze żadnych rezerwacji."}
          icon={<CalendarCheck className="h-7 w-7" />}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
              <th className="p-3 text-left">Gra</th>
              <th className="p-3 text-left">EAN</th>
              <th className="p-3 text-left">Użytkownik</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t"
                    data-testid="admin-reservation-row"
                    data-game-title={r.game.title}
                  >
                <td className="p-3 font-medium">{r.game.title}</td>
                <td className="p-3 font-mono text-xs">{r.game.ean ?? "—"}</td>
                <td className="p-3">{r.user.fullName ?? r.user.email}</td>
                    <td className="p-3">
                      <StatusBadge kind="reservation" status={r.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(r.createdAt)}</td>
                    <td className="p-3">
                      <ReservationActions reservationId={r.id} status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {reservations.map((r) => (
              <SectionCard key={r.id}>
                <div
                  className="space-y-3"
                  data-testid="admin-reservation-row"
                  data-game-title={r.game.title}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{r.game.title}</p>
                    <StatusBadge kind="reservation" status={r.status} />
                  </div>
                  <p className="text-small text-muted-foreground">{r.user.fullName ?? r.user.email}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  <ReservationActions reservationId={r.id} status={r.status} />
                </div>
              </SectionCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
