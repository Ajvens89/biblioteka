"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/report-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, boundary: "global-error" });
  }, [error]);

  return (
    <html lang="pl">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-sans">
        <h1 className="text-xl font-semibold">Błąd aplikacji</h1>
        <p className="max-w-md text-center text-sm text-neutral-600">
          Przepraszamy — wystąpił krytyczny błąd. Odśwież stronę lub spróbuj później.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white"
        >
          Spróbuj ponownie
        </button>
      </body>
    </html>
  );
}
