# audit-project

## Cel

Przeprowadzić systematyczny audyt stanu projektu **Biblioteka Zakątka Fantastyki** — bez wprowadzania zmian w kodzie na tym etapie. Zwrócić uporządkowany raport: co działa, co jest ryzykowne, co wymaga poprawy w kolejnej iteracji.

## Zakres działania

- Struktura repozytorium (`src/`, `prisma/`, `scripts/`, `e2e/`, `public/covers/`)
- Konfiguracja: `package.json`, `next.config.ts`, `apphosting.yaml`, `.env.example`
- Warstwa danych: schema Prisma, migracje, seed
- Trasy publiczne: `/`, `/katalog`, `/gry/[slug]`, auth
- Panel admin: `/admin/*`, uprawnienia, filtry
- Skrypty operacyjne: import, audyt EAN/okładek/RPG
- CI/deploy: Firebase App Hosting, lockfile, optionalDependencies Linux
- Obserwowalność: Sentry, error boundaries, `report-error.ts`
- Testy: unit (`test:unit`), E2E (`e2e/library.spec.ts`), `check:all`

**Poza zakresem:** refaktor, nowe funkcje, commit, deploy (chyba że użytkownik wyraźnie poprosi później).

## Kroki

1. **Inwentaryzacja** — przejrzyj `package.json`, README/docs (jeśli są), ostatnie commity (`git log -10 --oneline`).
2. **Build i jakość** — uruchom (tylko odczyt wyników, naprawy dopiero po audycie):
   - `npx prisma validate`
   - `npm run lint`
   - `npx tsc --noEmit` (typecheck)
   - `npm run test:unit`
   - `npm run build` (jeśli build pada, udokumentuj błąd)
3. **Baza** — jeśli `DATABASE_URL` działa: `npm run db:ping`, opcjonalnie `npm run audit:ean`, `npm run audit:covers`, `npm run audit:rpg-batch2`.
4. **Bezpieczeństwo konfiguracji** — sprawdź, czy `.env` nie jest w repo; czy sekrety są tylko w Firebase Secret Manager / `.env.example` bez wartości produkcyjnych.
5. **UX kluczowych ścieżek** — mentalnie przejdź: katalog → szczegóły gry → rezerwacja; admin → dodanie gry EAN → egzemplarz.
6. **Dług techniczny** — wypisz: TODO w kodzie, duplikaty, martwe pliki, niespójne konwencje nazewnictwa.
7. **Raport** — zwróć sekcje:
   - Podsumowanie (1 akapit)
   - Co działa (✓)
   - Problemy krytyczne / wysokie / niskie
   - Rekomendowana kolejność następnych komend (np. `fix-build`, `ui-polish`)
   - Metryki (build pass/fail, liczba testów unit, ostrzeżenia lint)

## Zasady bezpieczeństwa

- **Nie modyfikuj** plików aplikacji, schematu bazy ani konfiguracji produkcyjnej podczas audytu.
- **Nie commituj**, **nie pushuj**, **nie deployuj**.
- **Nie uruchamiaj** skryptów destrukcyjnych (`db:push` na prod, `cleanup:orphan-covers` bez potwierdzenia).
- **Nie loguj** ani nie wklejaj wartości sekretów z `.env`.
- Jeśli test E2E wymaga bazy — pomiń z adnotacją „wymaga DB”, zamiast psuć dane.

## Kryteria akceptacji

- Raport jest konkretny (ścieżki plików, komendy, komunikaty błędów).
- Każdy problem ma priorytet (P0–P3) i krótką rekomendację.
- Wskazano, które komendy z `.cursor/commands/` uruchomić jako następne.
- Audyt nie pozostawił niezacommitowanych zmian w repo.

## Weryfikacja po ewentualnych poprawkach (gdy audyt przejdzie w tryb napraw)

Jeśli w tej samej sesji wprowadzisz poprawki po audycie, na koniec uruchom:

```bash
npx prisma validate
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Opcjonalnie (gdy baza i Playwright są dostępne): `npm run check:all`.
