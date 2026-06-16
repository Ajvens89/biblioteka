"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/monitoring/report-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, boundary: "app/error" });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Coś poszło nie tak</h1>
        <p className="text-muted-foreground">
          Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub wróć do katalogu.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Spróbuj ponownie
        </Button>
        <Button variant="outline" asChild>
          <Link href="/katalog">Przejdź do katalogu</Link>
        </Button>
      </div>
    </div>
  );
}
