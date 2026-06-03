import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

export const metadata = { title: "Statystyki" };

export default async function AdminStatsPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    topBorrowed,
    topReserved,
    activeUsers,
    loansThisMonth,
    overdueCount,
    damagedCopies,
  ] = await Promise.all([
    prisma.loan.groupBy({
      by: ["copyId"],
      _count: { _all: true },
      orderBy: { _count: { copyId: "desc" } },
      take: 5,
    }),
    prisma.game.findMany({
      orderBy: { popularityCount: "desc" },
      take: 5,
      select: { title: true, popularityCount: true },
    }),
    prisma.profile.count({ where: { role: "USER" } }),
    prisma.loan.count({ where: { borrowedAt: { gte: monthStart } } }),
    prisma.loan.count({ where: { status: "OVERDUE" } }),
    prisma.gameCopy.count({ where: { status: "DAMAGED" } }),
  ]);

  const copyIds = topBorrowed.map((t) => t.copyId);
  const copies = await prisma.gameCopy.findMany({
    where: { id: { in: copyIds } },
    include: { game: true },
  });
  const copyMap = Object.fromEntries(copies.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Statystyki</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aktywni użytkownicy</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{activeUsers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Wypożyczenia w miesiącu</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{loansThisMonth}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Przetrzymywane</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{overdueCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uszkodzone egzemplarze</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{damagedCopies}</CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Najczęściej wypożyczane</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {topBorrowed.map((t) => (
                <li key={t.copyId} className="flex justify-between">
                  <span>{copyMap[t.copyId]?.game.title ?? t.copyId}</span>
                  <span>{t._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Najczęściej rezerwowane</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {topReserved.map((g) => (
                <li key={g.title} className="flex justify-between">
                  <span>{g.title}</span>
                  <span>{g.popularityCount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
