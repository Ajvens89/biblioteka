# mobile-polish

## Cel

Dopracować **doświadczenie mobile** (320–430px) — layout, touch targets, wyszukiwarka w headerze, filtry, karty, brak overflow — bez psucia desktopu.

## Zakres działania

- `site-header` — drugi rząd wyszukiwarki na mobile
- `catalog-mobile-filters`, `catalog-toolbar`, chipsy gatunku/trudności
- `catalog-game-card`, grid w `catalog-results`
- Strona główna — hero, statystyki, sekcja „Dostępne teraz”
- Szczegóły gry — CTA rezerwacji, metadane
- Admin — tylko jeśli bibliotekarz używa telefonu (toolbar, skaner)
- Test E2E: viewport 390px, brak horizontal scroll

**Poza zakresem:** natywna aplikacja PWA, osobny design mobile-only.

## Kroki

1. **Viewport 390×844** — DevTools; przejdź `/`, `/katalog`, `/gry/[slug]`, `/login`.
2. **Overflow** — `document.documentElement.scrollWidth <= clientWidth`; napraw `min-w-0`, `overflow-x-hidden`, długie tytuły (`truncate`).
3. **Touch** — min. ~44px wysokość przycisków i chipsów; odstępy między klikalnymi elementami.
4. **Header search** — widoczność, brak nachodzenia na logo/login; klawiatura nie zasłania suggest.
5. **Filtry** — mobile drawer vs chips; czy da się filtrować bez scrollowania w bok.
6. **Karty** — okładka + tytuł + badge; liczba kolumn w grid (`sm:grid-cols-2`).
7. **Skaner EAN** — lazy load; modal fullscreen na mobile.
8. **E2E** — upewnij się, że test `mobile: katalog bez poziomego scrolla` przechodzi; dodaj jeśli brakuje scenariusza header search.

## Zasady bezpieczeństwa

- Nie ukrywaj krytycznych akcji (rezerwacja, login) tylko na desktop.
- Nie używaj `user-scalable=no` — szkodzi a11y.
- Nie łam istniejących breakpointów Tailwind bez sprawdzenia `lg:`/`md:`.
- Zachowaj `data-testid="catalog-filters-mobile"`.

## Kryteria akceptacji

- Brak poziomego scrolla na `/katalog` przy 390px (E2E green).
- Wyszukiwarka w headerze używalna kciukiem na mobile.
- Karty i filtry czytelne bez zoomu.
- Desktop (1280px) bez regresji layoutu.
- Build + lint + unit tests — pass.

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
npm run test:e2e
```

Priorytet: test mobile overflow + header search + katalog filtry.
