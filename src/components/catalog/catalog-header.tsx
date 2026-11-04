import { pluralPl } from "@/lib/plural-pl";

type Props = {
  total: number;
  matching: number;
  hasActiveParams: boolean;
  dbOk: boolean;
};

export function CatalogHeader({ total, matching, hasActiveParams, dbOk }: Props) {
  const countText = !dbOk
    ? null
    : hasActiveParams
      ? `${matching} z ${total} pozycji pasuje do wyboru`
      : `${total} ${pluralPl(total, "tytuł", "tytuły", "tytułów")} w bibliotece`;

  return (
    <header className="zf-catalog-header">
      <div className="zf-catalog-header-ambient" aria-hidden />
      <div className="relative space-y-2 sm:space-y-2.5">
        <p className="hidden text-eyebrow sm:block">Pulpit odkryć</p>
        <h1 className="zf-catalog-header-title">
          <span className="sm:hidden">Katalog gier</span>
          <span className="hidden sm:inline">Katalog {dbOk && total > 0 ? `${total} światów` : "światów"}</span>
        </h1>
        <p className="text-body max-w-2xl text-muted-foreground">
          {dbOk ? (
            <>
              <span>Wyszukaj grę po tytule lub wybierz wydawcę.</span>
            </>
          ) : "Katalog jest chwilowo niedostępny — sprawdź ponownie za chwilę."}
        </p>
        {countText && (
          <p className="text-small font-medium text-muted-foreground" data-testid="catalog-total-count">
            {countText}
          </p>
        )}
      </div>
    </header>
  );
}
