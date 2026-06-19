# run-tests-and-fix

## Cel

Uruchomić dostępne testy projektu, zdiagnozować failures i **naprawić regresje** — bez dodawania nowych funkcji produktowych.

## Zakres działania

- Testy jednostkowe: `src/lib/**/*.unit.test.ts`, `src/lib/services/**/*.unit.test.ts`
- Skrypty weryfikacyjne (gdy DB): `verify:flow`, `verify:race`, `verify:ean`, `audit:ean`
- E2E Playwright: `e2e/library.spec.ts`, `e2e/helpers.ts`, `e2e/constants.ts`
- Agregator: `npm run check:all` (`scripts/check-all.ts`)
- Flaki: timeouty, serial mode, cleanup (`e2e/db-cleanup.ts`)

**Poza zakresem:** pisanie testów dla nowych feature’ów (tylko naprawa istniejących lub minimalne asserty przy bugfixie).

## Kroki

1. **Środowisko** — sprawdź `.env`, `DATABASE_URL`; jeśli brak DB — uruchom tylko unit + build, oznacz E2E jako skipped.
2. **Unit** — `npm run test:unit`; dla każdego fail: przyczyna → minimalna poprawka kodu lub testu.
3. **Lint** — `npm run lint`; napraw błędy (ostrzeżenia — według uzasadnienia).
4. **Typecheck** — `npx tsc --noEmit`.
5. **Integracja DB** — jeśli DB działa:
   - `npm run verify:flow`
   - `npm run verify:race`
   - `npm run verify:ean`
   - `npm run audit:ean`
6. **E2E** — `npm run test:e2e` (lokalnie dev server lub `PLAYWRIGHT_FORCE_WEBSERVER=1`).
7. **Flaki** — zwiększ timeout tylko tam, gdzie uzasadnione; preferuj `expect(...).toBeVisible({ timeout })` nad globalnym sleep.
8. **Raport** — tabela: test | status | fix | plik.

## Zasady bezpieczeństwa

- Nie zmieniaj danych produkcyjnych — E2E tylko na seed/staging (`E2E_*` prefix).
- Nie wyłączaj testów przez `.skip` bez komentarza i issue — napraw root cause.
- Nie commituj bez prośby użytkownika.
- `cleanupE2eAdminGame` / `cleanupE2eEanRpgGame` — uruchamiaj przed scenariuszami tworzącymi dane.
- Nie loguj haseł testowych z `e2e/constants.ts` w output produkcyjnym.

## Kryteria akceptacji

- `npm run test:unit` — 100% pass.
- `npm run lint` — brak errors.
- `npx tsc --noEmit` — pass.
- E2E — wszystkie scenariusze w `library.spec.ts` green (gdy DB + seed).
- Brak nowych `.only` / `.skip` bez uzasadnienia.
- `npm run build` — pass po poprawkach.

## Weryfikacja po zmianach

Pełna ścieżka (gdy DB dostępna):

```bash
npm run check:all
```

Minimalna (bez DB):

```bash
npx prisma validate
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```
