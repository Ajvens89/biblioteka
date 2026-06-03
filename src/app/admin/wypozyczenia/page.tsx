import { LoanActions } from "@/components/admin/loan-actions";
import { Badge } from "@/components/ui/badge";
import { LOAN_STATUS_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Wypożyczenia" };

export default async function AdminLoansPage() {
  const loans = await prisma.loan.findMany({
    include: {
      user: true,
      copy: { include: { game: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Wypożyczenia</h1>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
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
            {loans.map((l) => (
              <tr
                key={l.id}
                className="border-t"
                data-testid="admin-loan-row"
                data-game-title={l.copy.game.title}
              >
                <td className="p-3">{l.copy.game.title}</td>
                <td className="p-3">{l.user.fullName ?? l.user.email}</td>
                <td className="p-3">{formatDate(l.dueAt)}</td>
                <td className="p-3">
                  <Badge variant={l.status === "OVERDUE" ? "destructive" : "secondary"}>
                    {LOAN_STATUS_LABELS[l.status]}
                  </Badge>
                </td>
                <td className="p-3">
                  <LoanActions loanId={l.id} status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
