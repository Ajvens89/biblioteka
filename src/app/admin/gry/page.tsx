import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  buildAdminGamesOrderBy,
  buildAdminGamesWhere,
  gameAvailabilityLabel,
  type AdminGamesSearchParams,
} from "@/lib/admin/games-list";
import { countAvailableCopies } from "@/lib/games/availability";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { GameCover } from "@/components/ui/game-cover";
import { cn } from "@/lib/utils";
import { ArchiveGameButton } from "@/components/admin/archive-game-button";
import { AdminGamesToolbar } from "@/components/admin/admin-games-toolbar";

export const metadata = { title: "Gry — admin" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminGamesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const filters: AdminGamesSearchParams = {
    q: params.q,
    ean: params.ean,
    collectionType: params.collectionType,
    missingEan: params.missingEan,
    missingCover: params.missingCover,
    availability: params.availability,
    sort: params.sort,
  };

  const games = await prisma.game.findMany({
    where: buildAdminGamesWhere(filters),
    include: { copies: true, publisher: true },
    orderBy: buildAdminGamesOrderBy(filters.sort),
  });

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Gry"
        description="Katalog biblioteki — wyszukiwanie, EAN, filtry i szybkie akcje."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/api/admin/games/export-json">Eksport JSON</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/admin/games/export">Eksport CSV</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/import">Import / eksport</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/gry/nowa" data-testid="admin-new-game-link">
                <Plus className="h-4 w-4" />
                Dodaj grę
              </Link>
            </Button>
          </>
        }
      />

      <Suspense>
        <AdminGamesToolbar />
      </Suspense>

      {games.length === 0 ? (
        <EmptyState
          title="Brak gier"
          description="Zmień filtry lub dodaj nową grę."
          action={{ label: "Dodaj grę", href: "/admin/gry/nowa" }}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-14 p-3 text-left">Okładka</th>
                  <th className="p-3 text-left">Tytuł</th>
                  <th className="p-3 text-left">EAN</th>
                  <th className="p-3 text-left">Typ</th>
                  <th className="p-3 text-left">Egzemplarze</th>
                  <th className="p-3 text-left">Dostępne</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => {
                  const available = countAvailableCopies(g.copies);
                  const status = gameAvailabilityLabel(g.copies);
                  return (
                    <tr key={g.id} className="border-t">
                      <td className="p-3">
                        <GameCover
                          src={g.coverImageUrl}
                          alt={g.title}
                          aspect={g.collectionType === "RPG" ? "portrait" : "square"}
                          className={cn(
                            "shrink-0 rounded",
                            g.collectionType === "RPG" ? "h-14 w-10" : "h-12 w-12",
                          )}
                          sizes="40px"
                          collectionType={g.collectionType}
                        />
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{g.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {!g.ean && <Badge variant="warning">Brak EAN</Badge>}
                          {!g.coverImageUrl && <Badge variant="outline">Brak okładki</Badge>}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs">{g.ean ?? "—"}</td>
                      <td className="p-3">
                        <GameTypeBadge collectionType={g.collectionType} />
                      </td>
                      <td className="p-3">{g.copies.length}</td>
                      <td className="p-3">{available}</td>
                      <td className="p-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/gry/${g.id}`}>Edytuj</Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/egzemplarze?gameId=${g.id}`}>+ Egzemplarz</Link>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/gry/${g.slug}`} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                              Katalog
                            </Link>
                          </Button>
                          <ArchiveGameButton gameId={g.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {games.map((g) => {
              const available = countAvailableCopies(g.copies);
              const status = gameAvailabilityLabel(g.copies);
              return (
                <div key={g.id} className="card-elevated space-y-3 p-4">
                  <div className="flex gap-3">
                    <GameCover src={g.coverImageUrl} alt={g.title} className="h-20 w-16 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{g.title}</p>
                      <GameTypeBadge collectionType={g.collectionType} className="mt-1" />
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{g.ean ?? "Brak EAN"}</p>
                      <Badge variant={status.variant} className="mt-2">{status.label}</Badge>
                    </div>
                  </div>
                  <p className="text-small text-muted-foreground">
                    Egzemplarze: {g.copies.length} · dostępne: {available}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/gry/${g.id}`}>Edytuj</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/admin/egzemplarze?gameId=${g.id}`}>Dodaj egzemplarz</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
