import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/ui/page-shell";
import { DbUnavailableBanner } from "@/components/db-unavailable-banner";
import {
  CatalogHero,
  CatalogMainPanel,
  CatalogSidebarPanel,
} from "@/components/catalog";
import { buildCatalogEmptyState } from "@/lib/games/catalog-empty";
import { fetchGames } from "@/lib/games/queries";
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
    : "Przeglądaj i rezerwuj gry planszowe oraz podręczniki RPG w bibliotece Zakątka Fantastyki.";

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

  const [result, categories, tags, publishers, designers] = dbOk
    ? await Promise.all([
        fetchGames(filters),
        prisma.category.findMany({ orderBy: { name: "asc" } }),
        prisma.tag.findMany({ orderBy: { name: "asc" }, take: 40 }),
        prisma.publisher.findMany({ orderBy: { name: "asc" }, take: 50 }),
        prisma.designer.findMany({ orderBy: { name: "asc" }, take: 50 }),
      ])
    : [{ items: [], total: 0 }, [], [], [], []];

  const totalPages = Math.ceil(result.total / filters.pageSize);
  const emptyState = buildCatalogEmptyState(filters, params);

  return (
    <PageShell className="overflow-x-hidden" width="wide">
      <CatalogHero total={result.total} dbOk={dbOk} />

      {!dbOk && (
        <div className="mb-8">
          <DbUnavailableBanner />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-8">
        <CatalogSidebarPanel
          categories={categories}
          tags={tags}
          publishers={publishers}
          designers={designers}
          current={filters}
        />

        <Suspense>
          <CatalogMainPanel
            filters={filters}
            params={params}
            categories={categories}
            tags={tags}
            publishers={publishers}
            designers={designers}
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
