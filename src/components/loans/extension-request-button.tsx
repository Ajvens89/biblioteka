"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestLoanExtensionAction } from "@/lib/actions/extension-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  loanId: string;
  hasPendingRequest: boolean;
  extensionCount: number;
  maxExtensions: number;
};

export function ExtensionRequestButton({
  loanId,
  hasPendingRequest,
  extensionCount,
  maxExtensions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  if (extensionCount >= maxExtensions) {
    return (
      <p className="text-small text-muted-foreground">Wykorzystano limit przedłużeń ({maxExtensions}).</p>
    );
  }

  if (hasPendingRequest) {
    return (
      <p className="text-small font-medium text-muted-foreground" role="status">
        Prośba o przedłużenie oczekuje na decyzję bibliotekarza.
      </p>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Poproś o przedłużenie
      </Button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-border/80 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await requestLoanExtensionAction(loanId, reason);
          if (result.success) {
            toast.success(result.message ?? "Prośba wysłana.");
            setOpen(false);
            router.refresh();
          } else {
            toast.error(result.error);
          }
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`ext-reason-${loanId}`}>Powód (opcjonalnie)</Label>
        <Input
          id={`ext-reason-${loanId}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Np. potrzebuję więcej czasu na kampanię"
          maxLength={500}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Wyślij prośbę
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
