import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { WishlistRemoveButton } from "@/components/account/wishlist-remove-button";
import { ProfileForm } from "@/components/account/profile-form";
import { ExtensionRequestButton } from "@/components/loans/extension-request-button";
import { GameCover } from "@/components/ui/game-cover";
import { PageShell } from "@/components/ui/page-shell";
import { UserAccountNav } from "@/components/layout/user-account-nav";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROLE_LABELS } from "@/lib/constants";
import { getNotifications } from "@/lib/actions/notifications";
import { fetchUserLibraryStats } from "@/lib/services/user-stats";
import { getSettingNumber } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Moje konto" };

const ACTIVE_LOAN = ["ACTIVE", "OVERDUE"];

type PageProps = { searchParams: Promise<{ tab?: string }> };

export default async function AccountPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id } });

  const [stats, notifications, wishlist, ratings, loans, activeLoanIds] = await Promise.all([
    fetchUserLibraryStats(prisma, user.id),
    getNotifications(1),
    prisma.wishlistItem.findMany({
      where: { userId: user.id },
      include: { game: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.gameRating.findMany({
      where: { userId: user.id },
      include: {
        game: {
          select: { title: true, slug: true, coverImageUrl: true, collectionType: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    prisma.loan.findMany({
      where: { userId: user.id },
      include: { copy: { include: { game: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.loan.findMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "OVERDUE"] } },
      select: { id: true },
    }),
  ]);

  const pendingRequests = await prisma.loanExtensionRequest.findMany({
    where: {
      userId: user.id,
      status: "PENDING",
      loanId: { in: activeLoanIds.map((l) => l.id) },
    },
    select: { loanId: true },
  });
  const pendingLoanIds = new Set(pendingRequests.map((r) => r.loanId));

  const maxExtensions = await getSettingNumber("maxLoanExtensions", 2);
  const activeLoans = loans.filter((l) => ACTIVE_LOAN.includes(l.status));
  const loanHistory = loans.filter((l) => !ACTIVE_LOAN.includes(l.status));

  const tabs = [
    { id: "profil", label: "Profil", href: "/moje-konto?tab=profil" },
    { id: "zyczenia", label: "Lista odkrywcy", href: "/moje-konto?tab=zyczenia" },
    { id: "oceny", label: "Moje oceny", href: "/moje-konto?tab=oceny" },
    { id: "statystyki", label: "Statystyki wypraw", href: "/moje-konto?tab=statystyki" },
    { id: "powiadomienia", label: "Wiadomości z Zakątka", href: "/moje-konto?tab=powiadomienia" },
    {
      id: "wypozyczenia",
      label: "Twoje aktualne przygody",
      href: "/moje-konto?tab=wypozyczenia",
      deemphasized: true,
    },
  ];
  const activeTab = tab && tabs.some((t) => t.id === tab) ? tab : "profil";

  return (
    <PageShell width="narrow" className="space-y-8 py-8 md:py-10">
      <header className="space-y-4">
        <div>
          <p className="text-eyebrow">Twoje konto</p>
          <h1 className="text-h2 mt-1">Wyrusz po kolejną grę</h1>
          <p className="text-body mt-2 text-muted-foreground">
            {profile.fullName ?? profile.email} · {ROLE_LABELS[profile.role]}
          </p>
        </div>

        {(stats.activeLoans > 0 || stats.activeReservations > 0) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.activeReservations > 0 && (
              <Link
                href="/moje-rezerwacje"
                className="rounded-md border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aktywne rezerwacje
                </p>
                <p className="font-display mt-1 text-2xl font-medium text-primary">
                  {stats.activeReservations}
                </p>
              </Link>
            )}
            {stats.activeLoans > 0 && (
              <Link
                href="/moje-konto?tab=wypozyczenia"
                className="rounded-md border border-accent/25 bg-accent/8 p-4 transition-colors hover:bg-accent/12"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Aktywne wypożyczenia
                </p>
                <p className="font-display mt-1 text-2xl font-medium">{stats.activeLoans}</p>
              </Link>
            )}
          </div>
        )}

        <UserAccountNav items={tabs} activeId={activeTab} />
      </header>

      {activeTab === "profil" && (
        <SectionCard title="Dane profilu" description="Imię, telefon i preferencje powiadomień.">
          <ProfileForm
            fullName={profile.fullName ?? ""}
            phone={profile.phone ?? ""}
            emailNotificationsEnabled={profile.emailNotificationsEnabled}
          />
          <p className="text-small mt-4 text-muted-foreground">
            Rezerwacje:{" "}
            <Link href="/moje-rezerwacje" className="text-primary hover:underline">
              Moje rezerwacje →
            </Link>
          </p>
        </SectionCard>
      )}

      {activeTab === "statystyki" && (
        <SectionCard title="Twoja aktywność">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Stat label="Aktywne rezerwacje" value={stats.activeReservations} />
            <Stat label="Aktywne wypożyczenia" value={stats.activeLoans} />
            <Stat label="Zakończone wypożyczenia" value={stats.completedLoans} />
            <Stat label="Lista życzeń" value={stats.wishlistCount} />
            <Stat label="Twoje oceny" value={stats.ratingsCount} />
            <Stat label="Lista oczekujących" value={stats.waitlistCount} />
          </dl>
        </SectionCard>
      )}

      {activeTab === "powiadomienia" && (
        <SectionCard title="Powiadomienia" description="Ostatnie komunikaty z biblioteki.">
          {notifications.items.length === 0 ? (
            <p className="text-body text-muted-foreground">Brak powiadomień.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.items.map((n) => (
                <li
                  key={n.id}
                  className={`rounded-lg border p-3 ${!n.isRead ? "border-primary/30 bg-primary/5" : "border-border/80"}`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-small text-muted-foreground">{n.body}</p>
                  <time className="text-xs text-muted-foreground" dateTime={n.createdAt.toISOString()}>
                    {formatDateTime(n.createdAt)}
                  </time>
                  {n.linkUrl && (
                    <Link href={n.linkUrl} className="text-small mt-1 block text-primary hover:underline">
                      Zobacz szczegóły →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {activeTab === "zyczenia" && (
        <SectionCard title="Lista życzeń">
          {wishlist.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Pusta lista.{" "}
              <Link href="/katalog" className="text-primary hover:underline">
                Przeglądaj katalog
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {wishlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3 rounded-lg border border-border/80 p-3">
                  <Link href={`/gry/${w.game.slug}`} className="shrink-0">
                    <GameCover
                      src={w.game.coverImageUrl}
                      alt={w.game.title}
                      collectionType={w.game.collectionType}
                      aspect="card"
                      className="h-16 w-12 rounded"
                      sizes="48px"
                    />
                  </Link>
                  <Link href={`/gry/${w.game.slug}`} className="flex-1 font-medium hover:text-primary">
                    {w.game.title}
                  </Link>
                  <WishlistRemoveButton gameId={w.game.id} gameTitle={w.game.title} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {activeTab === "oceny" && (
        <SectionCard title="Moje oceny">
          {ratings.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Nie oceniłeś jeszcze żadnej gry.{" "}
              <Link href="/katalog" className="text-primary hover:underline">
                Przeglądaj katalog
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border/80 p-3">
                  <Link href={`/gry/${r.game.slug}`} className="shrink-0">
                    <GameCover
                      src={r.game.coverImageUrl}
                      alt={r.game.title}
                      collectionType={r.game.collectionType}
                      aspect="card"
                      className="h-16 w-12 rounded"
                      sizes="48px"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/gry/${r.game.slug}`} className="font-medium hover:text-primary">
                      {r.game.title}
                    </Link>
                    <p className="text-small text-muted-foreground">
                      Ocena: {r.rating}/5
                      {r.comment ? ` · ${r.comment}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {activeTab === "wypozyczenia" && (
        <div className="space-y-6">
          <SectionCard title="Aktywne wypożyczenia">
            {activeLoans.length === 0 ? (
              <p className="text-body text-muted-foreground">Brak aktywnych wypożyczeń.</p>
            ) : (
              <ul className="space-y-4">
                {activeLoans.map((l) => (
                  <li key={l.id} className="rounded-lg border border-border/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="font-semibold">{l.copy.game.title}</span>
                      <StatusBadge kind="loan" status={l.status} />
                    </div>
                    <p className="text-small text-muted-foreground">
                      Termin zwrotu: {formatDate(l.dueAt)} · Przedłużeń: {l.extensionCount}/{maxExtensions}
                    </p>
                    <ExtensionRequestButton
                      loanId={l.id}
                      hasPendingRequest={pendingLoanIds.has(l.id)}
                      extensionCount={l.extensionCount}
                      maxExtensions={maxExtensions}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Historia wypożyczeń">
            {loanHistory.length === 0 ? (
              <p className="text-body text-muted-foreground">Brak zakończonych wypożyczeń.</p>
            ) : (
              <ul className="space-y-2">
                {loanHistory.map((l) => (
                  <li key={l.id} className="flex justify-between gap-2 border-b border-border/60 py-2 text-sm last:border-0">
                    <span>{l.copy.game.title}</span>
                    <span className="text-muted-foreground">
                      {formatDate(l.borrowedAt)} – {l.returnedAt ? formatDate(l.returnedAt) : formatDate(l.dueAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/80 p-4">
      <dt className="text-small text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}
