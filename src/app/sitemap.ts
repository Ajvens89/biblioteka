import type { MetadataRoute } from "next";
import { ACTIVE_CATALOG_GAME_WHERE } from "@/lib/games/catalog-scope";
import { prisma } from "@/lib/db";
import { getAppUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/katalog`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/kontakt`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/regulamin`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const games = await prisma.game.findMany({
      where: ACTIVE_CATALOG_GAME_WHERE,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });

    const gameRoutes: MetadataRoute.Sitemap = games.map((g) => ({
      url: `${base}/gry/${g.slug}`,
      lastModified: g.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...gameRoutes];
  } catch {
    return staticRoutes;
  }
}
