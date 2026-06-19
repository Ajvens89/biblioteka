"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CopyStatus } from "@prisma/client";
import { updateCopyStatus } from "@/lib/actions/loans";
import { COPY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const QUICK_STATUSES: CopyStatus[] = ["DAMAGED", "LOST", "REPAIR", "RETIRED", "AVAILABLE"];

export function CopyStatusQuickActions({
  copyId,
  currentStatus,
}: {
  copyId: string;
  currentStatus: CopyStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (status: CopyStatus) =>
    start(async () => {
      const result = await updateCopyStatus(copyId, status);
      if (result.success) {
        toast.success(result.message ?? "Zaktualizowano status.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <div className="flex flex-wrap gap-1" data-testid="copy-status-quick-actions">
      {QUICK_STATUSES.filter((s) => s !== currentStatus).map((status) => (
        <Button
          key={status}
          size="sm"
          variant={status === "AVAILABLE" ? "default" : "outline"}
          disabled={pending}
          onClick={() => run(status)}
        >
          {COPY_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}
