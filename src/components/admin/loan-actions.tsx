"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { returnLoan, extendLoan } from "@/lib/actions/loans";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type ConfirmKind = "return" | "damaged" | "repair" | null;

export function LoanActions({ loanId, status }: { loanId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  if (!["ACTIVE", "OVERDUE"].includes(status)) return null;

  const doReturn = (options?: { markDamaged?: boolean; markRepair?: boolean }) =>
    start(async () => {
      const r = await returnLoan(loanId, {
        markDamaged: options?.markDamaged,
        markRepair: options?.markRepair,
        damageNotes: options?.markDamaged ? "Uszkodzenie przy zwrocie" : undefined,
      });
      if (r.success) {
        toast.success(options?.markDamaged ? "Zwrot z uszkodzeniem." : "Zwrot przyjęty.");
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          disabled={pending}
          data-testid="return-loan"
          onClick={() => setConfirm("return")}
        >
          Przyjmij zwrot
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await extendLoan(loanId);
              if (r.success) {
                toast.success("Przedłużono wypożyczenie.");
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
          onClick={() => setConfirm("damaged")}
        >
          Uszkodzone
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setConfirm("repair")}
        >
          Do naprawy
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "return"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Przyjąć zwrot?"
        description="Egzemplarz wróci do obiegu jako dostępny (o ile nie oznaczono uszkodzenia)."
        confirmLabel="Przyjmij zwrot"
        loading={pending}
        onConfirm={() => doReturn()}
      />
      <ConfirmDialog
        open={confirm === "damaged"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Zwrot z uszkodzeniem?"
        description="Egzemplarz zostanie oznaczony jako uszkodzony."
        confirmLabel="Potwierdź"
        variant="destructive"
        loading={pending}
        onConfirm={() => doReturn({ markDamaged: true })}
      />
      <ConfirmDialog
        open={confirm === "repair"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Przekazać do naprawy?"
        description="Egzemplarz zostanie oznaczony jako w naprawie po zwrocie."
        confirmLabel="Potwierdź"
        loading={pending}
        onConfirm={() => doReturn({ markRepair: true })}
      />
    </>
  );
}
