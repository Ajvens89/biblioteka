import Link from "next/link";
import { AlertCircle, Database } from "lucide-react";

type Props = {
  compact?: boolean;
};

export function DbUnavailableBanner({ compact }: Props) {
  const isProd = process.env.NODE_ENV === "production";

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-warning/35 bg-warning/10 p-4 text-sm shadow-sm"
          : "landing-db-banner rounded-2xl p-5 md:p-6"
      }
      role="alert"
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          {isProd ? (
            <Database className="h-5 w-5" aria-hidden />
          ) : (
            <AlertCircle className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-display text-base font-semibold text-foreground">
            Baza danych jest chwilowo niedostępna
          </p>
          {isProd ? (
            <p>
              Katalog może być ograniczony — trwa konfiguracja lub restart bazy w
              chmurze. Spróbuj ponownie za chwilę.
            </p>
          ) : (
            <>
              <p>Katalog chwilowo niedostępny. Uruchom PostgreSQL lokalnie:</p>
              <ol className="list-decimal space-y-1 pl-5 font-mono text-xs text-foreground">
                <li>npm run dev:db</li>
                <li>npm run db:patch</li>
                <li>Odśwież stronę (F5)</li>
              </ol>
              <p className="text-xs">
                Jeśli błąd wraca:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">npx prisma dev stop default</code>,
                poczekaj 10 s, potem ponów krok 1.
              </p>
            </>
          )}
          {!compact && (
            <p>
              <Link href="/kontakt" className="font-medium text-primary underline-offset-2 hover:underline">
                Skontaktuj się z nami
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
