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
      : `${total} pozycji w bibliotece`;

  return (
    <header className="zf-catalog-header">
      <div className="zf-catalog-header-ambient" aria-hidden />
      <div className="relative space-y-2.5">
        <p className="text-eyebrow">Biblioteka Zakątka Fantastyki</p>
        <h1 className="zf-catalog-header-title">Znajdź grę dla swojej ekipy</h1>
        <p className="text-body max-w-2xl text-muted-foreground">
          {dbOk
            ? "Filtruj po liczbie graczy, czasie i klimacie albo po prostu wpisz tytuł — resztą zajmie się katalog."
            : "Katalog jest chwilowo niedostępny — sprawdź ponownie za chwilę."}
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
