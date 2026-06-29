import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { GameMobileActionBar } from "@/components/games/game-mobile-action-bar";
import { GameRatingForm } from "@/components/games/game-rating-form";
import { GameDetailBackLink } from "@/components/games/game-detail-back-link";
import { GameDetailCover } from "@/components/games/game-detail-cover";
import { GameDetailAvailability } from "@/components/games/game-detail-availability";
import {
  buildGameDetailParams,
  GameDetailParams,
} from "@/components/games/game-detail-params";
import { GameDetailReservationPanel } from "@/components/games/game-detail-reservation-panel";
import { GameDetailPickupInfo } from "@/components/games/game-detail-pickup-info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameTypeBadge } from "@/components/ui/game-type-badge";
import { PageShell } from "@/components/ui/page-shell";
import { SectionCard } from "@/components/ui/section-card";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { APP_NAME, COLLECTION_TYPE_LABELS } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth/session";
import { countAvailableCopies } from "@/lib/games/availability";
import { fetchGameBySlug, fetchSimilarGames } from "@/lib/games/queries";
import { getWaitlistStatusAction } from "@/lib/actions/waitlist";
import { getGameRatingSummary, getUserGameRating } from "@/lib/actions/ratings";
import { getAppUrl } from "@/lib/site-url";
import { getAppSettings, getSettingNumber } from "@/lib/settings";
import { prisma } from "@/lib/db";

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
  const total = game.copies.length;
  const isBoard = game.collectionType !== "RPG";
  const categoryIds = game.categories.map((c) => c.categoryId);
  const loginHref = `/login?redirect=${encodeURIComponent(`/gry/${game.slug}#rezerwacja`)}`;

  const [similar, waitlistStatus, ratingSummary, userRating, onWishlist, settings, validityDays] =
    await Promise.all([
      fetchSimilarGames(
        game.id,
        categoryIds,
        game.collectionType,
        4,
        game.publisherId,
        game.designerId,
      ),
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
      getAppSettings(),
      getSettingNumber("reservationValidityDays", 3),
    ]);

  const paramsList = buildGameDetailParams({
    isBoard,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
    minPlayTime: game.minPlayTime,
    maxPlayTime: game.maxPlayTime,
    minAge: game.minAge,
    yearPublished: game.yearPublished,
    difficulty: game.difficulty,
    type: game.type,
  });

  const credits = [game.designer?.name, game.publisher?.name].filter(Boolean);

  return (
    <PageShell className="zf-game-page overflow-x-hidden pb-28 lg:pb-10" width="wide">
      <div className="mb-6">
        <GameDetailBackLink />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <MotionReveal variant="fade-up" className="game-enter-cover">
          <GameDetailCover
            title={game.title}
            coverImageUrl={game.coverImageUrl}
            collectionType={game.collectionType}
            isBoard={isBoard}
            gameId={game.id}
            onWishlist={onWishlist}
            isLoggedIn={Boolean(user)}
            loginHref={loginHref}
            images={game.images}
          />
        </MotionReveal>

        <div className="min-w-0 space-y-6 game-enter-main">
          <header className="space-y-3">
            <div data-testid="game-collection-type">
              <GameTypeBadge collectionType={game.collectionType} size="md" />
            </div>
            <h1 className="zf-game-title break-words">{game.title}</h1>
            {credits.length > 0 && (
              <p className="text-body text-muted-foreground">{credits.join(" · ")}</p>
            )}
            {game.ean && (
              <p className="text-small font-mono text-muted-foreground" data-testid="game-ean">
                EAN: {game.ean}
              </p>
            )}
          </header>

          <GameDetailAvailability available={available} total={total} />

          <GameDetailParams params={paramsList} />

          <GameDetailReservationPanel
            gameId={game.id}
            gameTitle={game.title}
            available={available}
            total={total}
            isLoggedIn={Boolean(user)}
            loginHref={loginHref}
            waitlistStatus={waitlistStatus}
          />

          <GameDetailPickupInfo
            validityDays={validityDays}
            foundationAddress={settings.foundationAddress}
          />
        </div>
      </div>

      {(game.description || game.shortDescription) && (
        <SectionCard title="O grze" className="mt-10">
          {game.shortDescription && game.shortDescription !== game.description && (
            <p className="text-body mb-4 font-medium text-foreground">{game.shortDescription}</p>
          )}
          {game.description && (
            <div className="text-body prose-game max-w-none whitespace-pre-wrap text-muted-foreground">
              {game.description}
            </div>
          )}
        </SectionCard>
      )}

      {(game.categories.length > 0 || game.tags.length > 0) && (
        <div className="mt-6 flex flex-wrap gap-2">
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
        <div className="mt-6">
          <Button variant="outline" className="min-h-11" asChild>
            <a href={game.instructionUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden />
              Instrukcja PDF / link
            </a>
          </Button>
        </div>
      )}

      <SectionCard title="Oceny graczy" className="mt-10">
        <GameRatingForm
          gameId={game.id}
          isLoggedIn={Boolean(user)}
          loginHref={loginHref}
          initialRating={userRating?.rating}
          initialComment={userRating?.comment ?? undefined}
          summary={ratingSummary}
        />
      </SectionCard>

      {similar.length > 0 && (
        <section className="mt-12 space-y-6" aria-labelledby="similar-games-heading">
          <h2 id="similar-games-heading" className="text-h2">
            Podobne gry
          </h2>
          <div className="zf-catalog-grid">
            {similar.map((g) => (
              <GameCard key={g.id} game={g} variant="catalog" showReserve />
            ))}
          </div>
        </section>
      )}

      <GameMobileActionBar
        gameId={game.id}
        gameTitle={game.title}
        available={available}
        total={total}
        isLoggedIn={Boolean(user)}
        loginHref={loginHref}
      />
    </PageShell>
  );
}
