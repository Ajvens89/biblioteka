import { requireAdmin } from "@/lib/auth/guards";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { prisma } from "@/lib/db";
import { paginateQuery, parsePageParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Logi aktywności" };

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params, { defaultPageSize: 50 });

  const result = await paginateQuery(
    () => prisma.auditLog.count(),
    (skip, take) =>
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { actor: { select: { email: true, fullName: true } } },
      }),
    page,
    pageSize,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Log aktywności</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Akcja</th>
              <th className="p-3 text-left">Encja</th>
              <th className="p-3 text-left">Szczegóły</th>
              <th className="p-3 text-left">Użytkownik</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3">
                  {log.entityType}
                  {log.entityId && (
                    <span className="text-xs text-muted-foreground"> · {log.entityId.slice(0, 8)}</span>
                  )}
                </td>
                <td className="p-3 max-w-xs truncate text-xs text-muted-foreground">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
                <td className="p-3">{log.actor?.fullName ?? log.actor?.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/logi"
        params={{ page: String(page) }}
      />
    </div>
  );
}
