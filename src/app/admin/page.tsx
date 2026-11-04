import Link from "next/link";
import { fetchAdminDashboard } from "@/lib/admin/dashboard";
import { requireAdmin } from "@/lib/auth/guards";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { DbUnavailableBanner } from "@/components/admin/db-unavailable-banner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Panel właściciela katalogu" };

export default async function AdminDashboardPage() {
  await requireAdmin();
  const data = await fetchAdminDashboard();
  return (
    <div className="space-y-8" data-testid="catalog-owner-dashboard">
      <PageHeader title="Twój katalog gier" description="Dodawaj nowe tytuły, uzupełniaj wydawców, opisy i okładki." />
      <SectionCard title="Zarządzaj katalogiem"><AdminQuickActions /></SectionCard>
      {!data ? <DbUnavailableBanner /> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Wszystkie tytuły" value={data.stats.gamesCount} href="/admin/gry" tone="primary" />
          <StatCard label="Widoczne w katalogu" value={data.stats.publishedGames} href="/katalog" />
          <StatCard label="Ukryte tytuły" value={data.stats.hiddenGames} href="/admin/gry" />
          <StatCard label="Bez okładki" value={data.stats.gamesWithoutCover} href="/admin/gry?missingCover=1" tone="warning" />
        </div>
        <SectionCard title="Dane do uzupełnienia" description="Lepszy opis i poprawny wydawca ułatwiają odnalezienie gry.">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Bez EAN" value={data.stats.gamesWithoutEan} href="/admin/gry?missingEan=1" />
            <StatCard label="Bez opisu" value={data.stats.gamesWithoutDescription} href="/admin/gry?missingDescription=1" />
            <StatCard label="Jakość metadanych" value="Sprawdź katalog" href="/admin/jakosc-danych" />
          </div>
        </SectionCard>
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Ostatnio dodane gry">
            {!data.recentGames.length ? <p className="text-sm text-muted-foreground">Dodaj pierwszy tytuł do katalogu.</p> :
              <ul className="divide-y divide-border">{data.recentGames.map((game) => (
                <li key={game.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={"/admin/gry/" + game.id} className="font-medium hover:text-primary">{game.title}</Link>
                    <p className="text-xs text-muted-foreground">{game.publisher?.name || "Wydawca do uzupełnienia"} · {formatDateTime(game.createdAt)}</p>
                  </div>
                  <Badge variant={game.isActive ? "secondary" : "outline"}>{game.isActive ? "Widoczna" : "Ukryta"}</Badge>
                </li>
              ))}</ul>}
          </SectionCard>
          <SectionCard title="Ostatnie zmiany w katalogu">
            {!data.recentAuditLogs.length ? <p className="text-sm text-muted-foreground">Brak zapisanych zmian.</p> :
              <ul className="divide-y divide-border text-sm">{data.recentAuditLogs.map((entry) => (
                <li key={entry.id} className="py-3"><span className="font-medium">{entry.action}</span>
                  <span className="text-muted-foreground"> · {entry.entityType}</span>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}</ul>}
          </SectionCard>
        </div>
      </>}
    </div>
  );
}
