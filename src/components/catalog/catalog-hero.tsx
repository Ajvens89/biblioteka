type Props = {
  total: number;
  dbOk: boolean;
};

export function CatalogHero({ total, dbOk }: Props) {
  return (
    <header className="zf-catalog-hero mb-10 space-y-3">
      <p className="text-eyebrow">Katalog online</p>
      <h1 className="text-display">Katalog gier</h1>
      <p className="text-body max-w-xl text-muted-foreground">
        {dbOk
          ? `${total} pozycji w bibliotece. Szukaj po tytule, autorze, wydawcy lub zeskanuj kod EAN.`
          : "Katalog jest chwilowo niedostępny — sprawdź ponownie za chwilę."}
      </p>
    </header>
  );
}
