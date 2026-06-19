# performance-pass

## Cel

Poprawić **wydajność odczuwalną i metryki Lighthouse** (TTFB, LCP, unused JS) — bez zmiany funkcjonalności biznesowej.

## Zakres działania

- Strona główna: `src/app/page.tsx`, `unstable_cache` w `src/lib/games/queries.ts`, `revalidate`
- Katalog: `src/app/katalog/page.tsx` (ISR `revalidate = 60`)
- Code-splitting: `SearchQueryShell`, `ean-scanner-lazy`, dynamic import ciężkich modułów (`@zxing/browser`)
- React Query — scope tylko do wyszukiwania, nie globalny provider
- Obrazy: `GameCover`, `next/image`, okładki `/covers/` vs remote
- API suggest: `Cache-Control`, rate limit, zapytania Prisma
- Layout: unikanie `force-dynamic` bez potrzeby; cache statystyk home
- Bundle: analiza importów w client components

**Poza zakresem:** infinite scroll / react-window (dopóki paginacja 12/str wystarcza), CDN poza Firebase/Next.

## Kroki

1. **Baseline** — uruchom Lighthouse lokalnie na `/` i `/katalog` (mobile); zapisz Performance, TTFB, LCP (jeśli dostępne raporty w `reports/` — porównaj).
2. **TTFB /** — sprawdź cache home (`fetchPublicStatsCached`, `fetchAvailableNowCached`); czy `isDatabaseAvailable` nie wymusza dynamic bez potrzeby.
3. **JS** — znajdź duże chunki: skaner EAN, React Query, Sentry client — lazy load tam, gdzie jeszcze eager.
4. **Obrazy** — priorytet lokalnych `/covers/`; `sizes` i `loading="lazy"` na listach; AVIF/WebP z `next.config.ts`.
5. **Suggest API** — krótkie zapytania, indeksy DB (title, ean); cache nagłówków.
6. **Third-party** — Sentry sample rate; brak ciężkich skryptów w layout.
7. **Implementacja** — małe diffy z mierzalnym celem (np. „−15 KiB initial JS”).
8. **Re-measure** — powtórz Lighthouse po zmianach.

## Zasady bezpieczeństwa

- Nie wyłączaj autoryzacji ani walidacji dla „szybkości”.
- Nie cache’uj danych per-user w publicznym ISR bez analizy (rezerwacje, sesja).
- Nie usuwaj error boundaries ani Sentry bez zamiennika.
- Nie zmieniaj `revalidate` na `false` globalnie — utrzymuj świadome wartości (60s).
- Testuj katalog z filtrami — cache nie może serwować cudzych wyników wyszukiwania.

## Kryteria akceptacji

- Lighthouse Performance ≥ 85 na `/` i `/katalog` (lokalnie; docelowo ≥ 90).
- TTFB strony głównej niższy niż przed pass (lub uzasadnienie plateau).
- Skaner EAN nie ładuje `@zxing` do initial bundle katalogu.
- `npm run build` pass; brak regresji E2E katalogu i mobile overflow.
- Brak błędów hydratacji w konsoli na `/` i `/katalog`.

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Opcjonalnie E2E: katalog, mobile 390px, header search.

Po deploy — porównaj TTFB na produkcji (DevTools Network, cold vs warm).
