type Props = {
  total: number;
  dbOk: boolean;
};

export function CatalogHero({ total, dbOk }: Props) {
  return (
    <header className="zf-catalog-hero space-y-3">
      <p className="text-eyebrow">Odkryj nasz świat gier</p>
      <h1 className="text-display">Katalog gier</h1>
      <p className="text-body max-w-2xl text-muted-foreground">
        {dbOk
          ? `${total} pozycji w bibliotece. Znajdź grę dla swojej drużyny — szukaj po tytule, autorze, wydawcy lub EAN.`
          : "Katalog jest chwilowo niedostępny — sprawdź ponownie za chwilę."}
      </p>
    </header>
  );
}
