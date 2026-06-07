import { HeroSection } from "@/components/home/hero-section";
import { SearchPanel } from "@/components/home/search-panel";
import { AvailableGamesSection } from "@/components/home/available-games-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { FAQSection } from "@/components/home/faq-section";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import { isDatabaseAvailable } from "@/lib/db";
import {
  fetchAvailableNow,
  fetchPublicStats,
  fetchShowcaseGames,
  type GameListItem,
} from "@/lib/games/queries";
import type { ShowcaseGame } from "@/components/home/types";

function toShowcase(games: GameListItem[]): ShowcaseGame[] {
  return games.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    coverImageUrl: g.coverImageUrl,
    collectionType: g.collectionType,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    minPlayTime: g.minPlayTime,
    maxPlayTime: g.maxPlayTime,
    minAge: g.minAge,
    categoryLabel: g.categories[0]?.category.name ?? null,
  }));
}

/** Statystyki gdy baza niedostępna — jawny fallback (nie udajemy live danych). */
const FALLBACK_STATS = { games: 0, copies: 0, available: 0, rpg: 0 };

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
    : [empty, FALLBACK_STATS, empty, empty];

  return (
    <div className="overflow-x-hidden">
      <HeroSection
        totalGames={stats.games}
        availableCopies={stats.available}
        boardGames={toShowcase(boardShowcase)}
        rpgGames={toShowcase(rpgShowcase)}
      />

      {!dbOk && (
        <div className="relative z-20 mx-auto max-w-7xl px-4 pt-4">
          <DbUnavailableBanner />
        </div>
      )}

      <SearchPanel />

      <div className="zf-section-catalog px-4 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <AvailableGamesSection games={available} />
        </div>
      </div>

      <HowItWorksSection />
      <FAQSection />
    </div>
  );
}
