import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Panel administracyjny" };

export default async function AdminDashboardPage() {
  const [
    gamesCount,
    copiesCount,
    activeReservations,
    activeLoans,
    overdueLoans,
    popularGames,
    recentLogs,
  ] = await Promise.all([
    prisma.game.count({ where: { deletedAt: null } }),
    prisma.gameCopy.count(),
    prisma.reservation.count({
      where: { status: { in: ["PENDING", "APPROVED", "READY_FOR_PICKUP"] } },
    }),
    prisma.loan.count({ where: { status: "ACTIVE" } }),
    prisma.loan.count({ where: { status: "OVERDUE" } }),
    prisma.game.findMany({
      where: { deletedAt: null },
      orderBy: { popularityCount: "desc" },
      take: 5,
      select: { title: true, popularityCount: true, slug: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const stats = [
    { label: "Gry", value: gamesCount, href: "/admin/gry" },
    { label: "Egzemplarze", value: copiesCount, href: "/admin/egzemplarze" },
    { label: "Aktywne rezerwacje", value: activeReservations, href: "/admin/rezerwacje" },
    { label: "Aktywne wypożyczenia", value: activeLoans, href: "/admin/wypozyczenia" },
    { label: "Przeterminowane", value: overdueLoans, href: "/admin/wypozyczenia" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Najpopularniejsze gry</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {popularGames.map((g) => (
                <li key={g.slug} className="flex justify-between">
                  <Link href={`/gry/${g.slug}`} className="hover:underline">
                    {g.title}
                  </Link>
                  <span className="text-muted-foreground">{g.popularityCount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ostatnie akcje</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {recentLogs.map((log) => (
                <li key={log.id} className="text-muted-foreground">
                  <span className="text-foreground">{log.action}</span> · {log.entityType}
                  {log.actor?.email && ` · ${log.actor.email}`}
                  <br />
                  <span className="text-xs">{formatDateTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
