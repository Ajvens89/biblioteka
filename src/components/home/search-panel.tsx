import { Search } from "lucide-react";
import { HomeHeroSearch } from "@/components/games/home-hero-search";

export function SearchPanel() {
  return (
    <section className="relative z-20 mx-auto max-w-7xl px-4" aria-labelledby="search-panel-title">
      <div className="zf-search-panel -mt-10 md:-mt-14">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="zf-search-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <Search className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/80">
                Katalog online
              </p>
              <h2 id="search-panel-title" className="font-display text-h2 mt-1 text-foreground">
                Szybkie wyszukiwanie
              </h2>
              <p className="text-small mt-1 max-w-md text-muted-foreground">
                Tytuł, autor, wydawca lub kod EAN z pudełka — od razu przejdziesz do katalogu.
              </p>
            </div>
          </div>
        </div>
        <HomeHeroSearch />
      </div>
    </section>
  );
}
