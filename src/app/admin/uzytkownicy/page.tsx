import { requireAdmin } from "@/lib/auth/guards";
import { UserRoleButtons } from "@/components/admin/user-role-buttons";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MobileDataCard } from "@/components/ui/mobile-data-card";
import { Users } from "lucide-react";

export const metadata = { title: "Użytkownicy" };

function buildUserWhere(q?: string): Prisma.ProfileWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { email: { contains: term, mode: "insensitive" } },
      { fullName: { contains: term, mode: "insensitive" } },
    ],
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params);
  const where = buildUserWhere(params.q);

  const result = await paginateQuery(
    () => prisma.profile.count({ where }),
    (skip, take) =>
      prisma.profile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          _count: { select: { loans: true, reservations: true } },
          loans: { where: { status: { in: ["ACTIVE", "OVERDUE"] } }, take: 3 },
        },
      }),
    page,
    pageSize,
  );

  const pageParams = { q: params.q, page: String(page) };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader
        title="Użytkownicy"
        description="Konta czytelników, role i blokady dostępu."
      />

      <form action="/admin/uzytkownicy" method="get" className="flex max-w-full flex-col gap-2 sm:flex-row sm:max-w-md">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Szukaj po imieniu lub e-mailu…"
          className="min-w-0 flex-1"
          data-testid="users-search-input"
        />
        <Button type="submit" className="shrink-0">
          Szukaj
        </Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="Brak użytkowników"
          description={params.q ? "Zmień kryteria wyszukiwania." : "Brak kont w bazie."}
          icon={<Users className="h-7 w-7" />}
        />
      ) : (
        <>
          <div className="grid gap-3">
            {result.items.map((u) => (
              <MobileDataCard key={u.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium break-words">{u.fullName ?? u.email}</p>
                    <p className="text-sm text-muted-foreground break-all">{u.email}</p>
                  </div>
                  <Badge>{ROLE_LABELS[u.role]}</Badge>
                </div>
                {u.isBlocked && <Badge variant="destructive">Zablokowany</Badge>}
                <p className="text-xs text-muted-foreground">
                  Rezerwacje: {u._count.reservations} · Wypożyczenia: {u._count.loans}
                </p>
                {u.adminNotes && (
                  <p className="text-sm italic text-muted-foreground">{u.adminNotes}</p>
                )}
                <UserRoleButtons profileId={u.id} currentRole={u.role} isBlocked={u.isBlocked} />
              </MobileDataCard>
            ))}
          </div>

          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/admin/uzytkownicy"
            params={pageParams}
          />
        </>
      )}
    </div>
  );
}
