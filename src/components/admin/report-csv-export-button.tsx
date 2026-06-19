"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { exportWeeklyReportCsvAction } from "@/lib/actions/reports";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ReportCsvExportButton() {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const csv = await exportWeeklyReportCsvAction();
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `raport-braki-katalogu-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Pobrano CSV.");
          } catch {
            toast.error("Nie udało się wyeksportować raportu.");
          }
        })
      }
    >
      <Download className="h-4 w-4" aria-hidden />
      Eksportuj CSV
    </Button>
  );
}
