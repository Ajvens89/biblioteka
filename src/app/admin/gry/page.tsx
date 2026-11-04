import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { buildAdminGamesOrderBy, buildAdminGamesWhere, type AdminGamesSearchParams } from "@/lib/admin/games-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { GameCover } from "@/components/ui/game-cover";
import { ArchiveGameButton } from "@/components/admin/archive-game-button";
import { AdminGamesToolbar } from "@/components/admin/admin-games-toolbar";
import { MobileDataCard, MobileDataCardGrid } from "@/components/ui/mobile-data-card";

export const metadata = { title: "Gry — panel właściciela" };
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminGamesPage({ searchParams }: PageProps) {
  await requireAdmin();
  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  const filters: AdminGamesSearchParams = {
    q: params.q, ean: params.ean, collectionType: params.collectionType,
    missingEan: params.missingEan, missingCover: params.missingCover,
    missingDescription: params.missingDescription, sort: params.sort,
  };
  const games = await prisma.game.findMany({
    where: buildAdminGamesWhere(filters), include: { publisher: true },
    orderBy: buildAdminGamesOrderBy(filters.sort),
  });
  return <div className="space-y-6 overflow-x-hidden">
    <PageHeader title="Gry" description="Dodawaj tytuły i uzupełniaj dane widoczne w publicznym katalogu." actions={<>
      <Button variant="outline" asChild><a href="/api/admin/games/export-json">Eksport JSON</a></Button>
      <Button variant="outline" asChild><a href="/api/admin/games/export">Eksport CSV</a></Button>
      <Button variant="outline" asChild><Link href="/admin/import">Import / eksport</Link></Button>
      <Button asChild><Link href="/admin/gry/nowa?mode=manual" data-testid="admin-new-game-link"><Plus className="h-4 w-4" aria-hidden />Dodaj grę</Link></Button>
    </>} />
    <Suspense><AdminGamesToolbar key={(params.q || "") + ":" + (params.ean || "")} /></Suspense>
    {!games.length ? <EmptyState title="Brak gier" description="Zmień wyszukiwanie lub dodaj nowy tytuł." action={{ label: "Dodaj grę", href: "/admin/gry/nowa?mode=manual" }} /> : <>
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="admin-table w-full text-sm"><thead className="bg-muted/50"><tr>
          <th className="w-16 p-3 text-left">Okładka</th><th className="p-3 text-left">Tytuł</th>
          <th className="p-3 text-left">Wydawca</th><th className="p-3 text-left">EAN</th>
          <th className="p-3 text-left">Widoczność</th><th className="p-3 text-left">Akcje</th>
        </tr></thead><tbody>{games.map((game) => <tr key={game.id} className="border-t">
          <td className="p-3"><GameCover src={game.coverImageUrl} alt={game.title} className="h-14 w-12 shrink-0 rounded" sizes="48px" collectionType={game.collectionType} /></td>
          <td className="p-3"><Link href={"/admin/gry/" + game.id} className="font-medium hover:text-primary">{game.title}</Link>
            <div className="mt-1"><GameTypeBadge collectionType={game.collectionType} /></div></td>
          <td className="p-3">{game.publisher?.name || "Do uzupełnienia"}</td>
          <td className="p-3 font-mono text-xs">{game.ean || "—"}</td>
          <td className="p-3"><Badge variant={game.isActive ? "secondary" : "outline"}>{game.isActive ? "Widoczna" : "Ukryta"}</Badge></td>
          <td className="p-3"><div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" asChild><Link href={"/admin/gry/" + game.id}>Edytuj</Link></Button>
            {game.isActive && <Button size="sm" variant="ghost" asChild><Link href={"/gry/" + game.slug} target="_blank" rel="noopener"><ExternalLink className="h-3 w-3" aria-hidden />Podgląd</Link></Button>}
            <ArchiveGameButton gameId={game.id} />
          </div></td>
        </tr>)}</tbody></table>
      </div>
      <MobileDataCardGrid>{games.map((game) => <MobileDataCard key={game.id}>
        <div className="flex gap-3"><GameCover src={game.coverImageUrl} alt={game.title} className="h-20 w-16 shrink-0" />
          <div className="min-w-0"><Link href={"/admin/gry/" + game.id} className="font-semibold">{game.title}</Link>
            <p className="mt-1 text-sm text-muted-foreground">{game.publisher?.name || "Wydawca do uzupełnienia"}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{game.ean || "Brak EAN"}</p>
            <Badge variant={game.isActive ? "secondary" : "outline"} className="mt-2">{game.isActive ? "Widoczna" : "Ukryta"}</Badge>
          </div>
        </div>
        <Button size="sm" variant="outline" asChild><Link href={"/admin/gry/" + game.id}>Edytuj grę</Link></Button>
      </MobileDataCard>)}</MobileDataCardGrid>
    </>}
  </div>;
}
