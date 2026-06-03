"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { importGamesCsv } from "@/lib/actions/import-games";
import { Button } from "@/components/ui/button";

export function ImportCsvForm() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex items-center gap-2"
      action={(fd) =>
        start(async () => {
          const r = await importGamesCsv(fd);
          if (r.success) {
            toast.success(`Zaimportowano ${r.data?.count ?? 0} gier.`);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <input type="file" name="file" accept=".csv" className="text-xs" required />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Import CSV
      </Button>
    </form>
  );
}
