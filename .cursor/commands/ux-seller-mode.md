# ux-seller-mode

## Cel

Poprawić UX pod kątem **bibliotekarza i użytkownika końcowego** — szybkie znalezienie gry, rezerwacja, obsługa EAN, filtry — jak w „trybie sprzedawcy”: minimum kroków, jasne stany, sensowne domyślne akcje.

## Zakres działania

- Wyszukiwanie: `header-search`, `catalog-toolbar`, `home-hero-search`, `game-search-suggestions`, `/api/games/suggest`
- Katalog: filtry gatunku/trudności, sortowanie, chipsy, puste wyniki (`catalog-empty`)
- Ścieżka rezerwacji: karta → szczegóły → `reserve-button` → `/moje-rezerwacje`
- Skaner EAN: `ean-scanner-lazy`, flow admin EAN
- Panel admin: szybkie akcje, filtry Brak EAN / okładki / egzemplarzy
- Copy i mikrocopy (PL): toasty, empty states, etykiety filtrów

**Poza zakresem:** zmiana modelu danych, nowe role, płatności, e-mail (Resend) — chyba że to 1-liniowa poprawa copy.

## Kroki

1. **Mapa ścieżek** — wypisz 3 flow: (A) gość szuka gry, (B) user rezerwuje, (C) bibliotekarz dodaje grę po EAN.
2. **Tarcie** — dla każdego flow: ile kliknięć, gdzie użytkownik może się zgubić, co brakuje w feedbacku.
3. **Wyszukiwarka** — Enter → katalog; suggest → katalog vs szczegóły; debounce i min. długość zapytania.
4. **Filtry** — czy aktywne filtry są widoczne (chipsy); czy „wyczyść filtry” w empty state działa.
5. **EAN** — rozróżnienie EAN produktu vs barcode egzemplarza w copy; skaner tylko on-demand (lazy).
6. **Admin** — czy alerty dashboardu prowadzą do właściwego filtra (`missingCopies`, `missingCover`).
7. **Implementacja** — małe, ukierunkowane poprawki; każda z uzasadnieniem UX.
8. **E2E** — uzupełnij test Playwright, jeśli dodajesz nowy element z `data-testid`.

## Zasady bezpieczeństwa

- Nie zmieniaj reguł autoryzacji (`requireAdmin`, middleware) bez wyraźnej prośby.
- Nie obniżaj rate limitu suggest bez analizy (`suggest-rate-limit`).
- Nie usuwaj istniejących URL-i filtrów (deep linki `/katalog?category=` muszą działać).
- Zachowaj dostępność klawiatury w autocomplete (aria-expanded, role=listbox).

## Kryteria akceptacji

- Wyszukiwanie z headera i toolbara prowadzi do sensownych wyników.
- Empty state ma działające CTA (link href z `buildCatalogEmptyState`).
- Rezerwacja nadal przechodzi scenariusz E2E #1.
- Suggest i filtry mają testy E2E lub zaktualizowane istniejące.
- Brak regresji w `/api/games/suggest` (Cache-Control, 429).

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Gdy baza dostępna:

```bash
npm run test:e2e
```

Przynajmniej: katalog, suggest, empty state, header search, rezerwacja.
