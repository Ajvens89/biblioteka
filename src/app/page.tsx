import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { GameCard } from "@/components/games/game-card";
import { GameSearch } from "@/components/games/game-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import {
  fetchAvailableNow,
  fetchFeaturedGames,
  fetchPopularGames,
} from "@/lib/games/queries";

async function GameSection({
  title,
  fetcher,
}: {
  title: string;
  fetcher: () => ReturnType<typeof fetchFeaturedGames>;
}) {
  const games = await fetcher();
  if (!games.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.id} game={game} showReserve />
        ))}
      </div>
    </section>
  );
}

function SearchFallback() {
  return <Skeleton className="h-10 w-full max-w-xl" />;
}

export default function HomePage() {
  return (
    <div>
      <section className="gradient-hero px-4 py-16 text-primary-foreground md:py-24">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-sm backdrop-blur">
            <Sparkles className="h-4 w-4" />
            Fundacja Zakątek Fantastyki
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{APP_NAME}</h1>
          <p className="text-lg opacity-95">{APP_DESCRIPTION}</p>
          <div className="mx-auto max-w-xl">
            <Suspense fallback={<SearchFallback />}>
              <div className="rounded-lg bg-card p-1 text-foreground shadow-lg">
                <GameSearch />
              </div>
            </Suspense>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/katalog">
              Przejdź do katalogu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12">
        <GameSection title="Nowości" fetcher={fetchFeaturedGames} />
        <GameSection title="Najczęściej rezerwowane" fetcher={fetchPopularGames} />
        <GameSection title="Dostępne teraz" fetcher={fetchAvailableNow} />
      </div>
    </div>
  );
}
