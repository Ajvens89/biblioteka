import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/guards";
import { UserRoleButtons } from "@/components/admin/user-role-buttons";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Użytkownicy</h1>

      <form action="/admin/uzytkownicy" method="get" className="flex max-w-md gap-2">
        <Input
          name="q"
          defaultValue={params.q}
          placeholder="Szukaj po imieniu lub e-mailu…"
          className="flex-1"
          data-testid="users-search-input"
        />
        <Button type="submit">Szukaj</Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          title="Brak użytkowników"
          description={params.q ? "Zmień kryteria wyszukiwania." : "Brak kont w bazie."}
          icon={<Users className="h-7 w-7" />}
        />
      ) : (
        <>
          <div className="space-y-4">
            {result.items.map((u) => (
              <div key={u.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{u.fullName ?? u.email}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    {u.isBlocked && <Badge variant="destructive">Zablokowany</Badge>}
                  </div>
                  <Badge>{ROLE_LABELS[u.role]}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Rezerwacje: {u._count.reservations} · Wypożyczenia: {u._count.loans}
                </p>
                {u.adminNotes && (
                  <p className="mt-1 text-sm italic text-muted-foreground">{u.adminNotes}</p>
                )}
                <div className="mt-3">
                  <UserRoleButtons profileId={u.id} currentRole={u.role} isBlocked={u.isBlocked} />
                </div>
              </div>
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
