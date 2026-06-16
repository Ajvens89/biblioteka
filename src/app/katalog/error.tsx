"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/monitoring/report-error";

export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, boundary: "katalog/error" });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
      <Search className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="font-display text-xl font-semibold">Katalog chwilowo niedostępny</h1>
        <p className="text-sm text-muted-foreground">
          Nie udało się załadować listy gier. Może to być problem z połączeniem — spróbuj ponownie.
        </p>
      </div>
      <div className="flex gap-3">
        <Button type="button" onClick={() => reset()}>
          Odśwież katalog
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Strona główna</Link>
        </Button>
      </div>
    </div>
  );
}
