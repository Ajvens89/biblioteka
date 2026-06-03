import Link from "next/link";
import { Suspense } from "react";
import { GameCard } from "@/components/games/game-card";
import { GameSearch } from "@/components/games/game-search";
import { CatalogFilters } from "@/components/games/catalog-filters";
import { Button } from "@/components/ui/button";
import { fetchGames } from "@/lib/games/queries";
import { gameFilterSchema } from "@/lib/validations/game";
import { prisma } from "@/lib/db";

export const metadata = { title: "Katalog gier" };

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = gameFilterSchema.parse({
    q: params.q,
    category: params.category,
    type: params.type,
    difficulty: params.difficulty,
    minPlayers: params.minPlayers,
    availability: params.availability,
    tag: params.tag,
    sort: params.sort,
    page: params.page,
  });

  const [result, categories, tags] = await Promise.all([
    fetchGames(filters),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, take: 30 }),
  ]);

  const totalPages = Math.ceil(result.total / filters.pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold">Katalog gier</h1>
        <Suspense>
          <GameSearch defaultValue={filters.q} />
        </Suspense>
        <CatalogFilters categories={categories} tags={tags} current={filters} />
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Brak wyników. Spróbuj zmienić filtry lub wyszukiwanie.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((game) => (
            <GameCard key={game.id} game={game} showReserve />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {filters.page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/katalog?${buildPageParams(params, filters.page - 1)}`}>
                Poprzednia
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Strona {filters.page} z {totalPages}
          </span>
          {filters.page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/katalog?${buildPageParams(params, filters.page + 1)}`}>
                Następna
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function buildPageParams(params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && k !== "page") sp.set(k, v);
  });
  sp.set("page", String(page));
  return sp.toString();
}
