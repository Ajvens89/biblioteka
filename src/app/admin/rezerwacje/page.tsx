import { ReservationActions } from "@/components/admin/reservation-actions";
import { Badge } from "@/components/ui/badge";
import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Rezerwacje" };

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const reservations = await prisma.reservation.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      user: true,
      game: true,
      copy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rezerwacje</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Gra</th>
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
                <td className="p-3">{r.game.title}</td>
                <td className="p-3">{r.user.fullName ?? r.user.email}</td>
                <td className="p-3">
                  <Badge>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
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
    </div>
  );
}
