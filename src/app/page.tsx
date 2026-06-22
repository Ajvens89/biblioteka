import { HeroSection } from "@/components/home/hero-section";
import { AvailableGamesSection } from "@/components/home/available-games-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { FAQSection } from "@/components/home/faq-section";
import { FoundationSection } from "@/components/home/foundation-section";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import { isDatabaseAvailable } from "@/lib/db";
import {
  fetchAvailableNowCached,
  fetchShowcaseGamesCached,
  type GameListItem,
} from "@/lib/games/queries";
import type { ShowcaseGame } from "@/components/home/types";

export const revalidate = 60;

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

export default async function HomePage() {
  const empty: GameListItem[] = [];
  const dbOk = await isDatabaseAvailable();
  const [available, boardShowcase, rpgShowcase] = dbOk
    ? await Promise.all([
        fetchAvailableNowCached(6),
        fetchShowcaseGamesCached("BOARD_GAME", 4),
        fetchShowcaseGamesCached("RPG", 4),
      ])
    : [empty, empty, empty];

  return (
    <div className="overflow-x-hidden">
      <HeroSection boardGames={toShowcase(boardShowcase)} rpgGames={toShowcase(rpgShowcase)} />

      {!dbOk && (
        <div className="mx-auto max-w-7xl px-4 pt-6">
          <DbUnavailableBanner />
        </div>
      )}

      <div className="zf-section-catalog px-4 py-16 md:py-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <AvailableGamesSection games={available} />
        </div>
      </div>

      <HowItWorksSection />
      <FoundationSection />
      <FAQSection />
    </div>
  );
}
