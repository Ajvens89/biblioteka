"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveExtensionRequestAction,
  rejectExtensionRequestAction,
} from "@/lib/actions/extension-requests";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Request = {
  id: string;
  requestedDays: number;
  reason: string | null;
  createdAt: Date;
  user: { fullName: string | null; email: string };
  loan: {
    dueAt: Date;
    extensionCount: number;
    copy: { game: { title: string } };
  };
};

export function ExtensionRequestsPanel({ requests }: { requests: Request[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">Brak oczekujących próśb o przedłużenie.</p>;
  }

  const act = (id: string, action: "approve" | "reject") =>
    start(async () => {
      const result =
        action === "approve"
          ? await approveExtensionRequestAction(id)
          : await rejectExtensionRequestAction(id);
      if (result.success) {
        toast.success(result.message ?? "Zaktualizowano.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });

  return (
    <ul className="space-y-3">
      {requests.map((r) => (
        <li key={r.id} className="rounded-lg border border-border/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{r.loan.copy.game.title}</p>
              <p className="text-sm text-muted-foreground">
                {r.user.fullName ?? r.user.email} · termin {formatDate(r.loan.dueAt)} · +{r.requestedDays} dni
              </p>
              {r.reason && <p className="text-sm mt-1">{r.reason}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={pending} onClick={() => act(r.id, "approve")}>
                Zatwierdź
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => act(r.id, "reject")}>
                Odrzuć
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
