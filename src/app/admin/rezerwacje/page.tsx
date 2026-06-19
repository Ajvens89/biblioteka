import Link from "next/link";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import type { ReservationStatus } from "@prisma/client";
import { CalendarCheck } from "lucide-react";

export const metadata = { title: "Rezerwacje" };

const statuses = Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[];
const ACTIVE_STATUSES: ReservationStatus[] = ["PENDING", "APPROVED", "READY_FOR_PICKUP"];

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params);
  const statusFilter = params.status as ReservationStatus | undefined;
  const where = statusFilter ? { status: statusFilter } : undefined;

  const result = await paginateQuery(
    () => prisma.reservation.count({ where }),
    (skip, take) =>
      prisma.reservation.findMany({
        where,
        include: { user: true, game: true, copy: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    page,
    pageSize,
  );

  const pageParams = { status: params.status, page: String(page) };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Rezerwacje"
        description="Obsługa rezerwacji od zgłoszenia do wypożyczenia."
      />

      <div className="flex flex-wrap gap-2">
        <Button variant={!statusFilter ? "default" : "outline"} size="sm" asChild>
          <Link href="/admin/rezerwacje">Wszystkie</Link>
        </Button>
        <Button
          variant={statusFilter && ACTIVE_STATUSES.includes(statusFilter) ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/admin/rezerwacje?status=PENDING">Do obsługi</Link>
        </Button>
        {statuses.map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" asChild>
            <Link href={`/admin/rezerwacje?status=${s}`}>{RESERVATION_STATUS_LABELS[s]}</Link>
          </Button>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="Brak rezerwacji"
          description={statusFilter ? "Brak pozycji w wybranym statusie." : "Nie ma jeszcze żadnych rezerwacji."}
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
                {result.items.map((r) => (
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
                      <ReservationActions
                        reservationId={r.id}
                        status={r.status}
                        pickupDeadline={r.pickupDeadline}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {result.items.map((r) => (
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
                  <ReservationActions
                    reservationId={r.id}
                    status={r.status}
                    pickupDeadline={r.pickupDeadline}
                  />
                </div>
              </SectionCard>
            ))}
          </div>

          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/admin/rezerwacje"
            params={pageParams}
          />
        </>
      )}
    </div>
  );
}
