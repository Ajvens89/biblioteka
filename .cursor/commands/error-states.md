# error-states

## Cel

Ujednolicić i wzmocnić **obsługę błędów i stanów brzegowych** — loading, empty, offline/DB niedostępna, 404, błędy API, error boundaries — z jasnym copy PL i sensownymi CTA.

## Zakres działania

- Error boundaries: `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/katalog/error.tsx`
- `DbUnavailableBanner`, `buildCatalogEmptyState`, `EmptyState`
- API routes: `/api/games/suggest` (429, 500), admin export
- `report-error.ts`, Sentry integration
- Toasty (`sonner`) — sukces vs błąd w akcjach (rezerwacja, admin)
- Formularze — walidacja Zod, komunikaty `issues[0]`
- Suspense fallbacki w katalogu (filtry, toolbar)

**Poza zakresem:** nowe endpointy retry/circuit breaker — chyba że minimalna poprawka w `fetchWithRetry`.

## Kroki

1. **Inwentaryzacja** — wypisz wszystkie miejsca z `try/catch`, `error.tsx`, `notFound()`, toast error.
2. **Katalog empty** — `catalog-empty` + CTA z `buildCatalogEmptyState` (EAN, availability, q).
3. **Suggest** — UI błędu w `game-search-suggestions` (`isError`); nie wiszący loading.
4. **DB down** — banner na home/katalog/admin dashboard; nie crash całej aplikacji.
5. **Global errors** — `global-error` resetuje UI; Sentry `captureException` w boundary.
6. **API** — sensowne JSON errors (429 suggest); bez stack trace w response.
7. **Copy PL** — konkretne („Sprawdź połączenie”) zamiast „Something went wrong”.
8. **Testy** — E2E empty state (`catalog-empty`); unit dla `buildCatalogEmptyState`.

## Zasady bezpieczeństwa

- Nie ujawniaj stack trace użytkownikowi końcowemu.
- Nie loguj PII do Sentry (email, tokeny) — używaj `extra` context bez sekretów.
- Nie połykaj błędów w adminie bez toastu/feedbacku.
- `reportError` — zachowaj działanie w dev (console) i prod (Sentry gdy DSN).

## Kryteria akceptacji

- Każdy główny flow ma widoczny stan: loading / empty / error.
- `/katalog?q=brak-wynikow` pokazuje `data-testid="catalog-empty"`.
- Suggest pokazuje komunikat przy błędzie sieci.
- Error boundaries nie powodują pętli re-render.
- Unit + E2E empty + build — pass.

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
npm run test:e2e
```

Scenariusze: pusty katalog, suggest (mock offline opcjonalnie), rezerwacja toast.
