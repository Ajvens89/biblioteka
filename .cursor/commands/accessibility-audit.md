# accessibility-audit

## Cel

Podnieść **dostępność (WCAG 2.1 AA)** — klawiatura, czytniki ekranu, kontrast, semantyka — szczególnie w katalogu, wyszukiwarce i formularzach.

## Zakres działania

- Wyszukiwarka: `header-search`, `catalog-toolbar`, `game-search-suggestions` (listbox, aria-activedescendant)
- Filtry: `catalog-genre-filters`, `catalog-difficulty-filters` (`aria-pressed`)
- Nawigacja: `site-header`, skip links (jeśli brak — rozważ dodanie)
- Formularze: login, rejestracja, admin game wizard, EAN input
- Obrazy: alt na okładkach dekoracyjnych (`alt=""`) vs informacyjnych
- Focus: `focus-visible:ring-*` na chipsach i przyciskach
- Kontrast: `zf-btn-primary`, accent chips, muted text
- Error boundaries — czy komunikat błędu jest czytelny

**Poza zakresem:** pełny audyt prawny WCAG, tłumaczenia i18n.

## Kroki

1. **Automatyczny skan** — Lighthouse Accessibility na `/`, `/katalog`, `/login`; zapisz wynik i failing audits.
2. **Klawiatura** — przejdź Tab przez header → wyszukiwarka → suggest (strzałki) → Enter; filtry gatunku; rezerwacja.
3. **Suggest** — `role="listbox"`, `role="option"`, `aria-expanded`, `aria-selected`; fokus nie ginie po wyborze.
4. **Mobile** — filtry w `catalog-mobile-filters`; czytelne etykiety (`sr-only` gdzie potrzeba).
5. **Formularze** — powiązanie `<label htmlFor>` z inputami; błędy walidacji powiązane z `aria-describedby`.
6. **Kontrast** — popraw tylko elementy poniżej 4.5:1 (tekst) / 3:1 (duży tekst/UI).
7. **Semantyka** — jeden `h1` na stronę; logiczna hierarchia nagłówków w katalogu.
8. **E2E a11y** — rozważ assert na `aria-pressed` / brak overflow (już jest test mobile).

## Zasady bezpieczeństwa

- Nie usuwaj wizualnych etykiet na rzecz samego `aria-label` tam, gdzie label jest widoczny.
- Nie łam `data-testid` używanych w Playwright.
- Nie zmieniaj kolorów brandowych drastycznie — subtelne korekty kontrastu.
- Zachowaj polskie copy — a11y nie anglicyzuje UI.

## Kryteria akceptacji

- Lighthouse Accessibility ≥ 95 na `/katalog` (lokalnie).
- Pełna obsługa klawiatury: wyszukiwarka + suggest + filtry + link do gry.
- Brak pułapek fokusu (focus trap) poza modalami (skaner EAN, dialogi).
- Wszystkie interaktywne chipsy mają `aria-pressed` lub odpowiednik.
- `npm run build` i testy unit/E2E katalogu — pass.

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
npm run test:e2e
```

Uruchom ponownie Lighthouse Accessibility na zmienionych stronach.
