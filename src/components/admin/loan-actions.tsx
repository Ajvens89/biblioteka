"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { returnLoan, extendLoan } from "@/lib/actions/loans";
import { Button } from "@/components/ui/button";

export function LoanActions({ loanId, status }: { loanId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!["ACTIVE", "OVERDUE"].includes(status)) return null;

  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        disabled={pending}
        data-testid="return-loan"
        onClick={() =>
          start(async () => {
            const r = await returnLoan(loanId);
            if (r.success) {
              toast.success("Zwrot przyjęty.");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        Zwrot
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await extendLoan(loanId);
            if (r.success) {
              toast.success("Przedłużono.");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        Przedłuż
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await returnLoan(loanId, { markDamaged: true, damageNotes: "Uszkodzenie przy zwrocie" });
            if (r.success) {
              toast.success("Zwrot z uszkodzeniem.");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        Uszkodzony
      </Button>
    </div>
  );
}
