import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArchiveGameButton } from "@/components/admin/archive-game-button";
import { ImportCsvForm } from "@/components/admin/import-csv-form";

export const metadata = { title: "Gry — admin" };

export default async function AdminGamesPage() {
  await requireAdmin();
  const games = await prisma.game.findMany({
    where: { deletedAt: null },
    include: { copies: true, publisher: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Gry</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/api/admin/games/export">Eksport CSV</a>
          </Button>
          <ImportCsvForm />
          <Button asChild>
            <Link href="/admin/gry/nowa" data-testid="admin-new-game-link">
              Dodaj grę
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Tytuł</th>
              <th className="p-3 text-left">Wydawca</th>
              <th className="p-3 text-left">Egzemplarze</th>
              <th className="p-3 text-left">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3 font-medium">{g.title}</td>
                <td className="p-3">{g.publisher?.name ?? "—"}</td>
                <td className="p-3">{g.copies.length}</td>
                <td className="p-3 flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/gry/${g.id}`}>Edytuj</Link>
                  </Button>
                  <ArchiveGameButton gameId={g.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
