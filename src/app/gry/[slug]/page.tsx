import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock, ExternalLink, Users } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { GameMobileActionBar } from "@/components/games/game-mobile-action-bar";
import { ReserveButton } from "@/components/games/reserve-button";
import { WaitlistButton } from "@/components/games/waitlist-button";
import { WishlistButton } from "@/components/games/wishlist-button";
import { GameRatingForm } from "@/components/games/game-rating-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameCover } from "@/components/ui/game-cover";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { APP_NAME, COLLECTION_TYPE_LABELS, DIFFICULTY_LABELS, GAME_TYPE_LABELS } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { countAvailableCopies, getAvailabilityLabel } from "@/lib/games/availability";
import { copyStatusCounts } from "@/lib/games/copy-stats";
import { fetchGameBySlug, fetchSimilarGames } from "@/lib/games/queries";
import { getWaitlistStatusAction } from "@/lib/actions/waitlist";
import { getGameRatingSummary, getUserGameRating } from "@/lib/actions/ratings";
import { getAppUrl } from "@/lib/site-url";
import { prisma } from "@/lib/db";
import Image from "next/image";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = await fetchGameBySlug(slug);
  if (!game || game._slugRedirect) {
    return { title: "Gra" };
  }

  const description =
    game.shortDescription?.trim() ||
    game.description?.slice(0, 160).trim() ||
    `${game.title} — ${COLLECTION_TYPE_LABELS[game.collectionType]} w bibliotece ${APP_NAME}.`;

  const base = getAppUrl();
  const cover = game.coverImageUrl?.startsWith("http")
    ? game.coverImageUrl
    : game.coverImageUrl
      ? `${base}${game.coverImageUrl.startsWith("/") ? "" : "/"}${game.coverImageUrl}`
      : undefined;

  return {
    title: game.title,
    description,
    openGraph: {
      title: `${game.title} | ${APP_NAME}`,
      description,
      type: "website",
      url: `${base}/gry/${game.slug}`,
      images: cover ? [{ url: cover, alt: `Okładka: ${game.title}` }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: game.title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = await fetchGameBySlug(slug);
  if (!result) notFound();

  const slugRedirect = "_slugRedirect" in result ? result._slugRedirect : null;
  if (slugRedirect && slugRedirect !== slug) {
    redirect(`/gry/${slugRedirect}`);
  }

  const game = result;

  const user = await getSessionUser();
  const available = countAvailableCopies(game.copies);
  const avail = getAvailabilityLabel(available, game.copies.length);
  const stats = copyStatusCounts(game.copies);
  const isBoard = game.collectionType !== "RPG";
  const categoryIds = game.categories.map((c) => c.categoryId);
  const similar = await fetchSimilarGames(
    game.id,
    categoryIds,
    game.collectionType,
    4,
    game.publisherId,
    game.designerId,
  );
  const loginHref = `/login?redirect=${encodeURIComponent(`/gry/${game.slug}#rezerwacja`)}`;

  const [waitlistStatus, ratingSummary, userRating, onWishlist] = await Promise.all([
    user ? getWaitlistStatusAction(game.id) : Promise.resolve(null),
    getGameRatingSummary(game.id),
    user ? getUserGameRating(game.id, user.id) : Promise.resolve(null),
    user
      ? prisma.wishlistItem
          .findUnique({
            where: { userId_gameId: { userId: user.id, gameId: game.id } },
          })
          .then(Boolean)
      : Promise.resolve(false),
  ]);

  const infoRows = [
    { label: "Typ zbioru", value: COLLECTION_TYPE_LABELS[game.collectionType] },
    isBoard && { label: "Gracze", value: `${game.minPlayers}–${game.maxPlayers}` },
    isBoard && { label: "Czas gry", value: `${game.minPlayTime}–${game.maxPlayTime} min` },
    { label: "Wiek", value: `${game.minAge}+` },
    { label: "Wydawca", value: game.publisher?.name },
    { label: "Autor", value: game.designer?.name },
    { label: "Rok", value: game.yearPublished?.toString() },
    isBoard && { label: "Trudność", value: DIFFICULTY_LABELS[game.difficulty] },
    isBoard && { label: "Rodzaj", value: GAME_TYPE_LABELS[game.type] },
  ].filter((r): r is { label: string; value: string | undefined } => Boolean(r));

  const titleBlock = (
    <div className="space-y-3">
      <div data-testid="game-collection-type">
        <GameTypeBadge collectionType={game.collectionType} size="md" />
      </div>
      <h1 className="text-display break-words">{game.title}</h1>
      {game.ean && (
        <p className="text-small font-mono text-muted-foreground" data-testid="game-ean">
          EAN produktu: {game.ean}
        </p>
      )}
      <Badge variant={avail.variant} className="text-sm" aria-label={`Status: ${avail.label}`}>
        {avail.label}
      </Badge>
    </div>
  );

  return (
    <PageShell className="overflow-x-hidden pb-24 lg:pb-0">
      <div className="mb-6 lg:hidden">{titleBlock}</div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <div className="space-y-4">
          <GameCover
            src={game.coverImageUrl}
            alt={`Okładka gry ${game.title}`}
            collectionType={game.collectionType}
            aspect={isBoard ? "square" : "portrait"}
            priority
            className="rounded-xl"
            sizes="(max-width: 1024px) 100vw, 352px"
          />
          {game.images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {game.images.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={img.url}
                    alt={img.alt ?? `Zdjęcie gry ${game.title}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <div className="hidden lg:block">{titleBlock}</div>

          <div className="flex flex-wrap gap-3">
            <WishlistButton
              gameId={game.id}
              initialOnWishlist={onWishlist}
              isLoggedIn={Boolean(user)}
              loginHref={loginHref}
            />
          </div>

          <SectionCard title="Opis">
            <p className="text-body whitespace-pre-wrap">{game.description}</p>
          </SectionCard>

          <SectionCard title="Dostępność">
            <p className="text-body">
              <strong>{available}</strong> z {stats.total} egzemplarzy można zarezerwować teraz.
            </p>
            <dl className="text-small mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Wszystkie</dt>
                <dd className="text-lg font-semibold">{stats.total}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dostępne</dt>
                <dd className="text-lg font-semibold text-success">{stats.available}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Zarezerwowane</dt>
                <dd className="text-lg font-semibold">{stats.reserved}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Wypożyczone</dt>
                <dd className="text-lg font-semibold">{stats.borrowed}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Informacje">
            <dl className="grid gap-3 sm:grid-cols-2">
              {infoRows.map(
                (row) =>
                  row.value && (
                    <div key={row.label}>
                      <dt className="text-small font-medium text-muted-foreground">{row.label}</dt>
                      <dd className="text-body font-medium">{row.value}</dd>
                    </div>
                  ),
              )}
            </dl>
            {isBoard && (
              <div className="text-small mt-4 flex flex-wrap gap-4 text-muted-foreground lg:hidden">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-4 w-4" aria-hidden />
                  {game.minPlayers}–{game.maxPlayers} graczy
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden />
                  {game.minPlayTime}–{game.maxPlayTime} min
                </span>
              </div>
            )}
          </SectionCard>

          {(game.categories.length > 0 || game.tags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {game.categories.map((c) => (
                <Badge key={c.categoryId} variant="secondary">
                  {c.category.name}
                </Badge>
              ))}
              {game.tags.map((t) => (
                <Badge key={t.tagId} variant="outline">
                  {t.tag.name}
                </Badge>
              ))}
            </div>
          )}

          {game.instructionUrl && (
            <Button variant="outline" className="min-h-11" asChild>
              <a href={game.instructionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden />
                Instrukcja PDF / link
              </a>
            </Button>
          )}

          <SectionCard
            title="Rezerwacja"
            description={
              available > 0
                ? "Zarezerwuj egzemplarz — potwierdzimy w bibliotece."
                : "Obecnie brak wolnych egzemplarzy."
            }
          >
            <div id="rezerwacja" className="scroll-mt-24 space-y-4">
              {user ? (
                available > 0 ? (
                  <ReserveButton gameId={game.id} />
                ) : (
                  <>
                    <p
                      className="text-body rounded-lg border border-warning/30 bg-warning/10 p-4"
                      role="status"
                    >
                      Wszystkie egzemplarze są zajęte. Dołącz do listy oczekujących lub sprawdź katalog później.
                    </p>
                    <WaitlistButton
                      gameId={game.id}
                      available={available}
                      initialStatus={waitlistStatus}
                      loginHref={loginHref}
                      isLoggedIn
                    />
                  </>
                )
              ) : (
                <p className="text-body">
                  <Link
                    href={loginHref}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Zaloguj się
                  </Link>
                  , aby zarezerwować tę grę.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Oceny">
            <GameRatingForm
              gameId={game.id}
              isLoggedIn={Boolean(user)}
              loginHref={loginHref}
              initialRating={userRating?.rating}
              initialComment={userRating?.comment ?? undefined}
              summary={ratingSummary}
            />
          </SectionCard>
        </div>
      </div>

      {similar.length > 0 && (
        <section className="mt-12 space-y-6">
          <h2 className="text-h2">Podobne gry</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      )}

      <GameMobileActionBar
        gameTitle={game.title}
        available={available}
        isLoggedIn={Boolean(user)}
        loginHref={loginHref}
      />
    </PageShell>
  );
}
