import Link from "next/link";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { fetchAdminDashboard } from "@/lib/admin/dashboard";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { DbUnavailableBanner } from "@/components/admin/db-unavailable-banner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Panel administracyjny" };

export default async function AdminDashboardPage() {
  const data = await fetchAdminDashboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Centrum pracy biblioteki — szybkie akcje, statystyki i ostatnia aktywność."
      />

      {!data ? (
        <DbUnavailableBanner />
      ) : (
        <DashboardContent data={data} />
      )}
    </div>
  );
}

function DashboardContent({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof fetchAdminDashboard>>>;
}) {
  const { stats } = data;

  return (
    <>
      <SectionCard title="Szybkie akcje" description="Najczęstsze zadania bibliotekarza">
        <AdminQuickActions />
      </SectionCard>

      <SectionCard
        title="Centrum jakości katalogu"
        description="Braki w metadanych i okładkach — szczegóły, eksport CSV i naprawy w jednym miejscu."
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/jakosc-danych">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Otwórz centrum jakości
            </Link>
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Gry bez EAN"
            value={stats.gamesWithoutEan}
            href="/admin/jakosc-danych"
            tone="warning"
          />
          <StatCard
            label="Gry bez okładki"
            value={stats.gamesWithoutCover}
            href="/admin/jakosc-danych"
            tone="warning"
          />
          <StatCard
            label="Gry bez opisu"
            value={stats.gamesWithoutDescription}
            href="/admin/jakosc-danych"
            tone="warning"
          />
          <StatCard
            label="Gry bez egzemplarzy"
            value={stats.gamesWithoutCopies}
            href="/admin/jakosc-danych"
            tone="warning"
          />
        </div>
      </SectionCard>

      {data.alerts.length > 0 && (
        <SectionCard title="Alerty" description="Wymaga uwagi">
          <ul className="space-y-2">
            {data.alerts.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
                    a.tone === "danger" && "border-destructive/30 bg-destructive/5",
                    a.tone === "warning" && "border-warning/30 bg-warning/5",
                    a.tone === "accent" && "border-accent/30 bg-accent/10",
                  )}
                >
                  <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
                  {a.message}
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div>
        <h2 className="text-h3 mb-4">Statystyki</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Gry łącznie" value={stats.gamesCount} href="/admin/gry" tone="primary" />
          <StatCard label="Egzemplarze" value={stats.copiesCount} href="/admin/egzemplarze" />
          <StatCard label="Dostępne egzemplarze" value={stats.availableCopies} href="/admin/gry?availability=available" tone="success" />
          <StatCard label="Rezerwacje oczekujące" value={stats.pendingReservations} href="/admin/rezerwacje?status=PENDING" tone="accent" />
          <StatCard label="Gotowe do odbioru" value={stats.readyReservations} href="/admin/rezerwacje?status=READY_FOR_PICKUP" />
          <StatCard label="Aktywne wypożyczenia" value={stats.activeLoans} href="/admin/wypozyczenia?status=ACTIVE" />
          <StatCard label="Przeterminowane" value={stats.overdueLoans} href="/admin/wypozyczenia?status=OVERDUE" tone="danger" />
          <StatCard label="Gry bez EAN" value={stats.gamesWithoutEan} href="/admin/gry?missingEan=1" tone="warning" />
          <StatCard label="Gry bez okładki" value={stats.gamesWithoutCover} href="/admin/gry?missingCover=1" tone="warning" />
          <StatCard label="Gry bez opisu" value={stats.gamesWithoutDescription} href="/admin/gry?missingDescription=1" tone="warning" />
          <StatCard label="Gry bez egzemplarzy" value={stats.gamesWithoutCopies} href="/admin/gry?missingCopies=1" tone="warning" />
          <StatCard label="Gry fabularne" value={stats.rpgGames} href="/admin/gry?collectionType=RPG" />
          <StatCard label="Gry planszowe" value={stats.boardGames} href="/admin/gry?collectionType=BOARD_GAME" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Ostatnie rezerwacje"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/rezerwacje">Wszystkie</Link>
            </Button>
          }
        >
          {data.recentReservations.length === 0 ? (
            <p className="text-small text-muted-foreground">Brak rezerwacji.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentReservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{r.game.title}</p>
                    <p className="text-small text-muted-foreground">
                      {r.user.fullName ?? r.user.email}
                      {r.game.ean && <span className="font-mono"> · {r.game.ean}</span>}
                    </p>
                  </div>
                  <StatusBadge kind="reservation" status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Ostatnie wypożyczenia"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/wypozyczenia">Wszystkie</Link>
            </Button>
          }
        >
          {data.recentLoans.length === 0 ? (
            <p className="text-small text-muted-foreground">Brak wypożyczeń.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentLoans.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium">{l.copy.game.title}</p>
                    <p className="text-small text-muted-foreground">{l.user.fullName ?? l.user.email}</p>
                  </div>
                  <StatusBadge kind="loan" status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Ostatnio dodane gry">
          {data.recentGames.length === 0 ? (
            <p className="text-small text-muted-foreground">Brak gier.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentGames.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <Link href={`/admin/gry/${g.id}`} className="font-medium hover:text-primary">
                      {g.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDateTime(g.createdAt)}</p>
                  </div>
                  <GameTypeBadge collectionType={g.collectionType} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Importy i audyty">
          {data.recentAuditLogs.length === 0 ? (
            <p className="text-small text-muted-foreground">
              Brak wpisów — uruchom import lub audyt w{" "}
              <Link href="/admin/import" className="text-primary underline">
                Import / audyt
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.recentAuditLogs.map((log) => (
                <li key={log.id} className="py-3">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-muted-foreground"> · {log.entityType}</span>
                  {log.actorId ? (
                    <span className="text-muted-foreground text-xs"> · wpis w logu</span>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
