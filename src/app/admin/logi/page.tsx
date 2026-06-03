import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Logi aktywności" };

export default async function AdminLogsPage() {
  await requireAdmin();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { email: true, fullName: true } } },
  });

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
              <th className="p-3 text-left">Użytkownik</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3">
                  {log.entityType}
                  {log.entityId && (
                    <span className="text-xs text-muted-foreground"> · {log.entityId.slice(0, 8)}</span>
                  )}
                </td>
                <td className="p-3">{log.actor?.fullName ?? log.actor?.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
