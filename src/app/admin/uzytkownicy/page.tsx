import { requireAdmin } from "@/lib/auth/guards";
import { UserRoleButtons } from "@/components/admin/user-role-buttons";
import { ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Użytkownicy" };

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.profile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { loans: true, reservations: true } },
      loans: { where: { status: { in: ["ACTIVE", "OVERDUE"] } }, take: 3 },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Użytkownicy</h1>
      <div className="space-y-4">
        {users.map((u) => (
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
    </div>
  );
}
