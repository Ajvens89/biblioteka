# Staging / Preview — Biblioteka Zakątka Fantastyki

Środowisko testowe na żywo (Vercel Preview + osobna baza). **Produkcja czeka**, aż staging przejdzie checklistę poniżej.

## Szybki start (operator)

```bash
# 1. Baza staging (Supabase) — skopiuj DATABASE_URL i DIRECT_URL do .env.staging lokalnie
npm run db:migrate:deploy
npm run db:seed:staging
npm run import:products -- ./data/products.json --dry-run
npm run import:products -- ./data/products.json
npm run audit:ean

# 2. Vercel — po pierwszym deployu ustaw APP_URL na faktyczny Preview URL

# 3. Testy przeciwko URL
PLAYWRIGHT_BASE_URL=https://twoj-preview.vercel.app npm run test:e2e:staging
```

## Import `products.json`

| Krok | Komenda |
|------|---------|
| Plik | `./products.json`, `./data/products.json` lub `./public/products.json` (wzór: `data/products.json.example`) |
| Dry-run | `npm run import:products -- ./data/products.json --dry-run` |
| Import | `npm run import:products -- ./data/products.json` |
| Weryfikacja | `npm run verify:products-import -- ./data/products.json` |
| Audyt po imporcie | `npm run audit:ean` |

- `barcode` w JSON → **`games.ean`** (nie `game_copies.barcode`).
- Import **aktualizuje** istniejące gry (tytuł zawsze) — na staging używaj pliku testowego lub świadomie właściwego katalogu.

## Seed staging

```bash
npm run db:seed:staging
```

Tworzy / aktualizuje (upsert):

- `admin@example.com` / `Admin123!`
- `bibliotekarz@example.com` / `Bibliotekarz123!`
- `user@example.com` / `User123!`
- 20 gier demo, egzemplarze `ZF-*`, przykładowe rezerwacje/wypożyczenia

**Nie usuwa** danych bez flagi. Czyszczenie tylko katalogu seed:

```bash
npm run db:seed:staging -- --reset-seed-data
```

## E2E przeciwko staging URL

```bash
PLAYWRIGHT_BASE_URL=https://twoj-preview.vercel.app npm run test:e2e:staging
```

- Nie uruchamia lokalnego serwera.
- Nie modyfikuje bazy w `globalSetup` (wymaga wcześniejszego seed na staging).
- Wymaga HTTPS dla testów skanera w przeglądarce (ręcznie w checklistie).

## Checklist po wdrożeniu (smoke test)

1. [ ] Otwórz URL staging (Vercel Preview).
2. [ ] Zaloguj `admin@example.com` / `Admin123!`.
3. [ ] Wejdź w `/admin` — dashboard i szybkie akcje widoczne.
4. [ ] Dodaj grę przez EAN w kreatorze (lub użyj istniejącej z seed).
5. [ ] Katalog publiczny `/katalog` — gra widoczna, filtr RPG/planszówki.
6. [ ] `npm run import:products -- plik --dry-run` (lokalnie na DB staging) — bez błędów.
7. [ ] Import właściwy (jeśli potrzebny katalog).
8. [ ] `npm run audit:ean` — brak krytycznych duplikatów (lub znane ostrzeżenia udokumentowane).
9. [ ] Zaloguj `user@example.com` — rezerwacja gry z dostępnym egzemplarzem.
10. [ ] Zaloguj `bibliotekarz@example.com` — zatwierdź rezerwację.
11. [ ] Oznacz „gotowe do odbioru”.
12. [ ] Wydaj wypożyczenie.
13. [ ] Przyjmij zwrot.
14. [ ] Mobile: ten sam URL na telefonie — katalog bez poziomego scrolla, filtry w drawerze.
15. [ ] Skaner EAN: HTTPS, kamera **tylko** po kliknięciu „Skanuj EAN”.
16. [ ] Zamknij modal skanera — kamera wyłączona (brak aktywnego podglądu w tle).

## Zabezpieczenia staging

- Używaj **osobnego** projektu Supabase (nie produkcyjnego).
- `AUTH_SECRET` ≥ 32 znaków (losowy).
- Na Vercel Preview: `AUTH_PROVIDER=supabase` **albo** `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` tylko na Preview (build ma `NODE_ENV=production` — local auth bez flagi się wyłączy).
- **Nie** ustawiaj `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` na Production w Vercel.
- Nie seeduj prawdziwych danych osobowych; konta `@example.com` są testowe.
- `SUPABASE_SERVICE_ROLE_KEY` tylko w env serwera Vercel, nigdy w kodzie klienta.

Więcej: [DEPLOYMENT.md](./DEPLOYMENT.md), [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).
