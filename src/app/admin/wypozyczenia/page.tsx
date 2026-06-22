import Link from "next/link";
import { LoanActions } from "@/components/admin/loan-actions";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LOAN_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import { formatDate } from "@/lib/utils";
import type { LoanStatus } from "@prisma/client";
import { ClipboardList } from "lucide-react";

export const metadata = { title: "Wypożyczenia" };

const statuses = Object.keys(LOAN_STATUS_LABELS) as LoanStatus[];

export default async function AdminLoansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params);
  const statusFilter = params.status as LoanStatus | undefined;
  const where = statusFilter ? { status: statusFilter } : undefined;

  const result = await paginateQuery(
    () => prisma.loan.count({ where }),
    (skip, take) =>
      prisma.loan.findMany({
        where,
        include: { user: true, copy: { include: { game: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    page,
    pageSize,
  );

  const pageParams = { status: params.status, page: String(page) };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <PageHeader title="Wypożyczenia" description="Aktywne wypożyczenia, zwroty i przeterminowania." />

      <div className="flex flex-wrap gap-2">
        <Button variant={!statusFilter ? "default" : "outline"} size="sm" asChild>
          <Link href="/admin/wypozyczenia">Wszystkie</Link>
        </Button>
        {statuses.map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" asChild>
            <Link href={`/admin/wypozyczenia?status=${s}`}>{LOAN_STATUS_LABELS[s]}</Link>
          </Button>
        ))}
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          title="Brak wypożyczeń"
          description={statusFilter ? "Brak pozycji w wybranym statusie." : "Nie zarejestrowano jeszcze wypożyczeń."}
          icon={<ClipboardList className="h-7 w-7" />}
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <table className="admin-table w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Gra</th>
                  <th className="p-3 text-left">Użytkownik</th>
                  <th className="p-3 text-left">Termin</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((l) => (
                  <tr
                    key={l.id}
                    className={`border-t ${l.status === "OVERDUE" ? "bg-destructive/5" : ""}`}
                    data-testid="admin-loan-row"
                    data-game-title={l.copy.game.title}
                  >
                    <td className="p-3 font-medium">{l.copy.game.title}</td>
                    <td className="p-3">{l.user.fullName ?? l.user.email}</td>
                    <td className="p-3">{formatDate(l.dueAt)}</td>
                    <td className="p-3">
                      <StatusBadge kind="loan" status={l.status} />
                    </td>
                    <td className="p-3">
                      <LoanActions loanId={l.id} status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {result.items.map((l) => (
              <SectionCard key={l.id}>
                <div
                  className="space-y-3"
                  data-testid="admin-loan-row"
                  data-game-title={l.copy.game.title}
                >
                  <div
                    className={`flex items-start justify-between gap-2 rounded-lg p-2 ${
                      l.status === "OVERDUE" ? "border border-destructive/40 bg-destructive/10" : ""
                    }`}
                  >
                    <p className="font-semibold">{l.copy.game.title}</p>
                    <StatusBadge kind="loan" status={l.status} />
                  </div>
                  <p className="text-small text-muted-foreground">{l.user.fullName ?? l.user.email}</p>
                  <p className="text-small">Termin zwrotu: {formatDate(l.dueAt)}</p>
                  <LoanActions loanId={l.id} status={l.status} />
                </div>
              </SectionCard>
            ))}
          </div>

          <AdminPagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/admin/wypozyczenia"
            params={pageParams}
          />
        </>
      )}
    </div>
  );
}
