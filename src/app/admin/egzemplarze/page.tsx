import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { normalizeEan } from "@/lib/services/ean";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import { CopyForm } from "@/components/admin/copy-form";
import { CopyQr } from "@/components/admin/copy-qr";
import { CopiesScanPanel } from "@/components/admin/copies-scan-panel";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Egzemplarze" };

function buildCopySearchWhere(q?: string): Prisma.GameCopyWhereInput | undefined {
  if (!q?.trim()) return undefined;
  const term = q.trim();
  const or: Prisma.GameCopyWhereInput[] = [
    { inventoryNumber: { contains: term, mode: "insensitive" } },
    { barcode: { contains: term, mode: "insensitive" } },
    { game: { title: { contains: term, mode: "insensitive" } } },
  ];
  try {
    or.push({ game: { ean: normalizeEan(term) } });
  } catch {
    or.push({ game: { ean: { contains: term } } });
  }
  return { OR: or };
}

export default async function AdminCopiesPage({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string; scanMode?: string; q?: string; gameId?: string; page?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const { scan, scanMode, q, gameId } = params;
  const { page, pageSize } = parsePageParams(params);
  const listWhere = buildCopySearchWhere(q);

  const [result, games] = await Promise.all([
    paginateQuery(
      () => prisma.gameCopy.count({ where: listWhere }),
      (skip, take) =>
        prisma.gameCopy.findMany({
          where: listWhere,
          include: {
            game: { select: { id: true, title: true, ean: true, slug: true } },
            loans: {
              where: { status: { in: ["ACTIVE", "OVERDUE"] } },
              take: 1,
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
          orderBy: { inventoryNumber: "asc" },
          skip,
          take,
        }),
      page,
      pageSize,
    ),
    prisma.game.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const copies = result.items;
  const pageParams = { q, scan, scanMode, gameId, page: String(page) };

  const highlighted =
    scan && scanMode !== "product_ean"
      ? await prisma.gameCopy.findFirst({
          where: { OR: [{ barcode: scan }, { inventoryNumber: scan }] },
          include: {
            game: { select: { id: true, title: true, ean: true, slug: true } },
            loans: {
              where: { status: { in: ["ACTIVE", "OVERDUE"] } },
              take: 1,
              include: { user: { select: { fullName: true, email: true } } },
            },
          },
        })
      : null;

  let productEanMatch: { id: string; title: string; ean: string | null; slug: string } | null = null;
  if (scan && !highlighted && (scanMode === "product_ean" || !scanMode)) {
    try {
      const normalized = normalizeEan(scan);
      const game = await prisma.game.findFirst({
        where: { ean: normalized, deletedAt: null },
        select: { id: true, title: true, ean: true, slug: true },
      });
      if (game?.ean) productEanMatch = game;
    } catch {
      /* nie EAN */
    }
  }

  const selectedCopy = highlighted;

  return (
    <div className="space-y-8 overflow-x-hidden">
      <PageHeader
        title="Egzemplarze"
        description="Konkretne pudełka w bibliotece — numery inwentarzowe, kody naklejek i statusy."
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/obsluga">Obsługa skanem</Link>
          </Button>
        }
      />

      <CopiesScanPanel defaultScan={scan} />

      {scan && (
        <div
          className="rounded-lg border p-4 text-sm"
          data-testid="scan-result-banner"
        >
          <p className="font-medium">
            Zeskanowano ({scanMode === "product_ean" ? "EAN produktu" : "kod egzemplarza"}):{" "}
            <span className="font-mono">{scan}</span>
          </p>
        </div>
      )}

      {selectedCopy && (
        <SectionCard title="Znaleziony egzemplarz">
          <div className="space-y-3">
            <p className="text-h3">{selectedCopy.game.title}</p>
            <p className="text-small">Nr inw.: <strong>{selectedCopy.inventoryNumber}</strong></p>
            {selectedCopy.barcode && (
              <p className="font-mono text-xs">Kod: {selectedCopy.barcode}</p>
            )}
            <StatusBadge kind="copy" status={selectedCopy.status} />
            {selectedCopy.loans[0] && (
              <p className="text-small text-muted-foreground">
                Wypożyczone: {selectedCopy.loans[0].user.fullName ?? selectedCopy.loans[0].user.email}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link href={`/admin/egzemplarze/${selectedCopy.id}`}>Edytuj</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/egzemplarze?gameId=${selectedCopy.gameId}`}>Dodaj kolejny</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/gry/${selectedCopy.game.slug}`}>Katalog publiczny</Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {productEanMatch && (
        <SectionCard title="EAN produktu — gra w katalogu">
          <p className="text-sm">
            Kod <span className="font-mono">{productEanMatch.ean}</span> należy do „{productEanMatch.title}”.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href={`/admin/egzemplarze?gameId=${productEanMatch.id}`}>Dodaj egzemplarz</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/admin/gry?ean=${productEanMatch.ean}`}>Panel gier</Link>
            </Button>
          </div>
        </SectionCard>
      )}

      {scan && !selectedCopy && !productEanMatch && (
        <p className="text-sm text-muted-foreground">Nie znaleziono wyniku dla tego kodu.</p>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <SectionCard title="Dodaj egzemplarz">
          <CopyForm games={games} defaultGameId={gameId} />
        </SectionCard>
        <SectionCard title="Wyszukaj na liście">
          <form action="/admin/egzemplarze" method="get" className="flex gap-2">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Tytuł, nr inw., barcode, EAN gry…"
              className="flex-1"
              data-testid="copies-search-input"
            />
            <Button type="submit">Szukaj</Button>
          </form>
        </SectionCard>
      </div>

      {copies.length === 0 ? (
        <EmptyState title="Brak egzemplarzy" description="Zmień wyszukiwanie lub dodaj pierwszy egzemplarz." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="admin-table w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nr inw.</th>
                  <th className="p-3 text-left">Gra</th>
                  <th className="p-3 text-left">EAN produktu</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Wypożyczenie</th>
                  <th className="p-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {copies.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-mono">{c.inventoryNumber}</td>
                    <td className="p-3">{c.game.title}</td>
                    <td className="p-3 font-mono text-xs">{c.game.ean ?? "—"}</td>
                    <td className="p-3">
                      <StatusBadge kind="copy" status={c.status} />
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.loans[0]
                        ? c.loans[0].user.fullName ?? c.loans[0].user.email
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/egzemplarze/${c.id}`}>Edytuj</Link>
                        </Button>
                        <CopyQr inventoryNumber={c.inventoryNumber} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {copies.map((c) => (
              <div key={c.id} className="card-elevated p-4 text-sm">
                <p className="font-semibold">{c.game.title}</p>
                <p className="font-mono text-xs">{c.inventoryNumber}</p>
                <StatusBadge kind="copy" status={c.status} className="mt-2" />
                <Button size="sm" className="mt-3" variant="outline" asChild>
                  <Link href={`/admin/egzemplarze/${c.id}`}>Edytuj</Link>
                </Button>
              </div>
            ))}
          </div>

          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/admin/egzemplarze"
            params={pageParams}
          />
        </>
      )}
    </div>
  );
}
