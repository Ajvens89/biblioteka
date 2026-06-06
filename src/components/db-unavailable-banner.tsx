import Link from "next/link";
import { AlertCircle } from "lucide-react";

type Props = {
  compact?: boolean;
};

export function DbUnavailableBanner({ compact }: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
          : "card-elevated border-warning/30 p-6"
      }
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
        <div className="space-y-2 text-muted-foreground">
          <p className="font-medium text-foreground">Baza danych jest wyłączona</p>
          <p>Katalog i rezerwacje chwilowo niedostępne. Uruchom PostgreSQL lokalnie:</p>
          <ol className="list-decimal space-y-1 pl-5 font-mono text-xs text-foreground">
            <li>npm run dev:db</li>
            <li>npm run db:patch</li>
            <li>Odśwież stronę (F5)</li>
          </ol>
          <p className="text-xs">
            Jeśli błąd wraca:{" "}
            <code className="rounded bg-muted px-1">npx prisma dev stop default</code>, poczekaj 10 s,
            potem ponów krok 1.
          </p>
          {!compact && (
            <p>
              <Link href="/kontakt" className="text-primary underline">
                Kontakt
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
