import { Search, Sparkles } from "lucide-react";
import { HomeHeroSearch } from "@/components/games/home-hero-search";
import { GameSection } from "@/components/games/game-section";
import { LandingFaq } from "@/components/home/landing-faq";
import { LandingHero } from "@/components/home/landing-hero";
import { LandingHowItWorks } from "@/components/home/landing-how-it-works";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import { isDatabaseAvailable } from "@/lib/db";
import {
  fetchAvailableNow,
  fetchPublicStats,
  fetchShowcaseGames,
  type GameListItem,
} from "@/lib/games/queries";
import type { HeroShowcaseGame } from "@/components/home/landing-category-showcase";

function toShowcase(games: GameListItem[]): HeroShowcaseGame[] {
  return games.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    coverImageUrl: g.coverImageUrl,
    collectionType: g.collectionType,
  }));
}

export default async function HomePage() {
  const empty: GameListItem[] = [];
  const dbOk = await isDatabaseAvailable();
  const [available, stats, boardShowcase, rpgShowcase] = dbOk
    ? await Promise.all([
        fetchAvailableNow(6),
        fetchPublicStats(),
        fetchShowcaseGames("BOARD_GAME", 4),
        fetchShowcaseGames("RPG", 4),
      ])
    : [empty, { games: 447, copies: 0, available: 0, rpg: 0 }, empty, empty];

  return (
    <div className="overflow-x-hidden">
      <LandingHero
        totalGames={stats.games}
        boardGames={toShowcase(boardShowcase)}
        rpgGames={toShowcase(rpgShowcase)}
      />

      <div className="landing-section-search relative z-10 mx-auto max-w-6xl px-4">
        {!dbOk && (
          <div className="mb-6 pt-4">
            <DbUnavailableBanner />
          </div>
        )}
        <section className="landing-search-card -mt-8 p-6 md:-mt-10 md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/10">
                <Search className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary/80">
                    Szybki start
                  </span>
                </div>
                <h2 className="font-display text-h3 text-foreground">Szybkie wyszukiwanie</h2>
                <p className="text-small mt-0.5 text-muted-foreground">
                  Tytuł, autor, wydawca lub kod EAN z pudełka
                </p>
              </div>
            </div>
          </div>
          <HomeHeroSearch />
        </section>
      </div>

      <div className="landing-section-catalog space-y-16 px-4 py-14 md:space-y-20 md:py-16">
        <div className="mx-auto max-w-6xl space-y-16 md:space-y-20">
          <GameSection
            title="Dostępne teraz"
            description="Gry, które możesz od razu zarezerwować."
            href="/katalog?availability=available"
            games={available}
            showReserve
          />
        </div>
      </div>

      <LandingHowItWorks />
      <LandingFaq />
    </div>
  );
}
