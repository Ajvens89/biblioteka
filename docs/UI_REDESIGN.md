# UI Redesign — Biblioteka Zakątka Fantastyki

## Kierunek: „Nowoczesna biblioteka fantasy”

- Tło: ciepła kość słoniowa (`#f7f4ee`)
- Tekst i struktura: granat atramentowy (`#1c2434`)
- Kolor marki: głęboki burgund (`#6e2c3d`)
- Akcent CTA: przygaszona miedź (`#a67c52`)
- Typografia: **Fraunces** (nagłówki) + **Inter** (UI)

## Problemy przed redesignem

- Dwa systemy stylów (`zf-*` + tokeny Tailwind) bez spójności
- Fiolet jako primary — zbyt generyczny SaaS
- Podwójny chrome w panelu admin (nagłówek strony + sidebar)
- Nawigacja admin niekompletna (brak Obsługi, Jakości, Raportów w shell)
- Karty katalogu — gęste, nierówny rytm wizualny
- Brak grupowania w panelu staff

## Plan implementacji

1. Tokeny w `globals.css` — jeden system kolorów, cieni, typografii
2. Komponenty UI — Button, Badge, StatusBadge (z ikoną), Card, StatCard, EmptyState, Tabs
3. Layout publiczny — header z Planszówkami/RPG, footer
4. Layout admin — ukrycie publicznego chrome, sidebar z grupami + zwijanie
5. Strona główna, katalog, karta gry, auth, konto, dashboard admin

## Nowe zależności

Brak — wykorzystano istniejące: Tailwind 4, Radix (dialog, tabs, select), lucide-react.

## Testy

Po redesignie: `npm run test:unit`, `npm run build`, `npm run lint`, Playwright e2e (selektory `data-testid` zachowane).
