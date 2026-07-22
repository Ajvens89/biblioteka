import type { MetadataRoute } from "next";
import { ACTIVE_CATALOG_GAME_WHERE } from "@/lib/games/catalog-scope";
import { getAppUrl } from "@/lib/site-url";

/** Zawsze dynamicznie — unikamy SSG z placeholder DB na Firebase build. */
export const dynamic = "force-dynamic";

const FALLBACK_BASE = "https://bookshelf--bibl-2c364.europe-west4.hosted.app";

function staticRoutes(base: string, now: Date): MetadataRoute.Sitemap {
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/katalog`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/kontakt`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/regulamin`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}

/**
 * Sitemap never throws — prod previously returned HTTP 500 when Prisma failed
 * during (or as a result of) generation. Static routes always ship; game slugs
 * are best-effort via runPrismaSafe + lazy prisma import.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const base = getAppUrl();
    const now = new Date();
    const staticOnly = staticRoutes(base, now);

    const games = await loadGameSlugs();
    if (!games?.length) return staticOnly;

    return [
      ...staticOnly,
      ...games.map((g) => ({
        url: `${base}/gry/${g.slug}`,
        lastModified: g.updatedAt instanceof Date ? g.updatedAt : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    try {
      return staticRoutes(getAppUrl(), new Date());
    } catch {
      return staticRoutes(FALLBACK_BASE, new Date());
    }
  }
}

async function loadGameSlugs(): Promise<{ slug: string; updatedAt: Date }[] | null> {
  try {
    // Lazy-load db so sitemap module init never touches PrismaClient.
    const { runPrismaSafe, prisma } = await import("@/lib/db");
    return runPrismaSafe(() =>
      prisma.game.findMany({
        where: ACTIVE_CATALOG_GAME_WHERE,
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
    );
  } catch {
    return null;
  }
}
