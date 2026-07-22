import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import {
  CatalogHeader,
  CatalogSearch,
  CatalogQuickPicks,
  CatalogDesktopFilters,
  CatalogMainPanel,
} from "@/components/catalog";
import { buildCatalogEmptyState } from "@/lib/games/catalog-empty";
import { fetchGames, fetchPublicStatsCached } from "@/lib/games/queries";
import { hasAnyActiveParam, type CatalogOptionLists } from "@/lib/games/catalog-filters";
import { gameFilterSchema } from "@/lib/validations/game";
import { isDatabaseAvailable, prisma } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";

/** ISR — katalog odświeża się co minutę (SEO + świeże dane). */
export const revalidate = 60;

type PageProps = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q?.trim();
  const title = q ? `Szukaj: ${q}` : "Katalog gier";
  const description = q
    ? `Wyniki wyszukiwania „${q}” w bibliotece ${APP_NAME}.`
    : "Przeglądaj gry planszowe oraz podręczniki RPG w bibliotece Zakątka Fantastyki.";

  return {
    title,
    description,
    openGraph: { title: `${title} | ${APP_NAME}`, description },
  };
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = gameFilterSchema.parse({
    q: params.q,
    ean: params.ean,
    category: params.category,
    collectionType: params.collectionType,
    type: params.type,
    difficulty: params.difficulty,
    minPlayers: params.minPlayers,
    maxPlayers: params.maxPlayers,
    minAge: params.minAge,
    maxPlayTime: params.maxPlayTime,
    availability: params.availability,
    tag: params.tag,
    publisher: params.publisher,
    designer: params.designer,
    sort: params.sort,
    page: params.page,
  });

  const dbOk = await isDatabaseAvailable();

  const [result, categories, tags, publishers, designers, stats] = dbOk
    ? await Promise.all([
        fetchGames(filters),
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.tag.findMany({ orderBy: { name: "asc" }, take: 40 }),
        prisma.publisher.findMany({ orderBy: { name: "asc" }, take: 50 }),
        prisma.designer.findMany({ orderBy: { name: "asc" }, take: 50 }),
        fetchPublicStatsCached(),
      ])
    : [{ items: [], total: 0 }, [], [], [], [], { games: 0 }];

  const totalPages = Math.ceil(result.total / filters.pageSize);
  const emptyState = buildCatalogEmptyState(filters, params);

  const lists: CatalogOptionLists = {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    tags: tags.map((t) => ({ slug: t.slug, name: t.name })),
    publishers: publishers.map((p) => ({ slug: p.slug, name: p.name })),
    designers: designers.map((d) => ({ slug: d.slug, name: d.name })),
  };

  const globalTotal = "games" in stats ? stats.games : result.total;
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.set(k, v);
  });
  const activeParams = hasAnyActiveParam(sp);

  return (
    <PageShell className="zf-catalog-page overflow-x-hidden" width="wide">
      <CatalogHeader
        total={globalTotal}
        matching={result.total}
        hasActiveParams={activeParams}
        dbOk={dbOk}
      />

      <div className="zf-catalog-controls">
        <Suspense>
          <CatalogSearch defaultQ={filters.q} defaultEan={filters.ean} />
        </Suspense>
        <Suspense>
          <CatalogQuickPicks />
        </Suspense>
      </div>

      {!dbOk && (
        <div className="mb-8">
          <DbUnavailableBanner />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
        <Suspense>
          <CatalogDesktopFilters lists={lists} />
        </Suspense>

        <Suspense>
          <CatalogMainPanel
            filters={filters}
            params={params}
            lists={lists}
            items={result.items}
            total={result.total}
            totalPages={totalPages}
            emptyState={emptyState}
            dbOk={dbOk}
          />
        </Suspense>
      </div>
    </PageShell>
  );
}
