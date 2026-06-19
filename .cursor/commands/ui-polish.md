# ui-polish

## Cel

Doprecyzować warstwę wizualną interfejsu — spójność typografii, kolorów, odstępów, komponentów UI i kart — bez zmiany logiki biznesowej.

## Zakres działania

- `src/app/globals.css` — tokeny, klasy pomocnicze (`zf-*`, `site-*`)
- `src/components/ui/` — Button, Input, Badge, EmptyState, GameCover, PageHeader
- `src/components/catalog/` — hero, wyniki, filtry chipsy
- `src/components/layout/` — SiteHeader, SiteFooter, ThemeToggle
- `src/components/home/` — sekcje strony głównej
- `src/components/games/` — karty katalogu, toolbar, badge typu gry
- Panel admin — tylko gdy dotyczy spójności z design systemem publicznym

**Poza zakresem:** nowe ekrany, zmiana API, refaktor Prisma, duże zmiany UX flow (→ `ux-seller-mode`).

## Kroki

1. **Baseline** — otwórz `/`, `/katalog`, `/gry/[slug]`, `/admin` (desktop 1280px i mobile 390px).
2. **Design system** — sprawdź powtarzalność: `font-display`, `text-h*`, `card-elevated`, `site-nav-link`, `zf-btn-primary`, stany hover/focus.
3. **Kontrast i czytelność** — tekst muted vs foreground, okładki, badge „Gry planszowe / fabularne”.
4. **Komponenty** — ujednolić paddingi przycisków, wysokości inputów (header vs toolbar vs admin).
5. **Okładki** — `GameCover`: proporcje, placeholder, lazy loading; brak łamania layoutu przy braku obrazu.
6. **Dark mode** — ThemeProvider: sprawdź kluczowe ekrany w obu motywach.
7. **Minimalny diff** — popraw tylko to, co realnie psuje spójność; nie redesignuj całej aplikacji.
8. **Podsumowanie** — lista zmienionych plików + przed/po (krótko).

## Zasady bezpieczeństwa

- Nie zmieniaj struktury danych, propsów wpływających na API ani zapytań Prisma.
- Nie usuwaj `data-testid` używanych w E2E.
- Nie commituj bez prośby użytkownika.
- Unikaj globalnych zmian CSS, które mogą zepsuć admin — testuj oba konteksty.
- Nie dodawaj ciężkich bibliotek UI (MUI, shadcn bulk) — rozszerzaj istniejące komponenty.

## Kryteria akceptacji

- Spójny wygląd header / katalog / karta gry / empty state.
- Focus visible na interaktywnych elementach (klawiatura).
- Brak poziomego scrolla na mobile 390px (katalog).
- Build i lint przechodzą.
- Brak regresji w istniejących testach E2E dotyczących widoczności elementów (`game-card`, `catalog-toolbar`).

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Opcjonalnie: `npm run test:e2e` — scenariusze katalogu i mobile overflow.
