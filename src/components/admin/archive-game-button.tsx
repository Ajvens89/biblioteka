"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveGame } from "@/lib/actions/games";
import { Button } from "@/components/ui/button";

export function ArchiveGameButton({ gameId }: { gameId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Zarchiwizować grę?")) return;
        start(async () => {
          const r = await archiveGame(gameId);
          if (r.success) {
            toast.success("Gra zarchiwizowana.");
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      Archiwizuj
    </Button>
  );
}
