# Biblioteka Zakątka Fantastyki

**To nie jest makieta.** Aplikacja zapisuje dane w PostgreSQL (Prisma), obsługuje rezerwacje, wypożyczenia i panel admina z kontrolą ról. Logowanie działa w dwóch trybach:

| Tryb | Kiedy | Logowanie |
|------|--------|-----------|
| **local** (domyślny bez Supabase) | Dev, Docker Postgres | Hasło w `profiles.password_hash` + cookie |
| **supabase** | Produkcja, klucze API | Supabase Auth + ten sam model `profiles` |

## Co jest „prawdziwe” (nie mock UI)

| Funkcja | Implementacja |
|---------|----------------|
| Baza danych | Prisma → PostgreSQL (`games`, `game_copies`, `reservations`, `loans`, …) |
| Katalog / filtry | Zapytania Prisma w `src/lib/games/queries.ts` |
| Rezerwacja | Serwis `reserveGame` → `src/lib/services/reservations.ts` (akcja: `src/lib/actions/reservations.ts`) |
| Wydanie / zwrot | Serwisy w `src/lib/services/loans.ts` (akcja: `src/lib/actions/loans.ts`) |
| Dodanie gry / egzemplarza | Server Actions + Zod (`src/lib/actions/games.ts`) |
| Role | `profiles.role` — weryfikacja w akcjach i `requireStaffFromDb()` w `/admin` |
| Walidacja | Zod po stronie serwera (formularze auth, gry, egzemplarze) |
| Seed | `prisma/seed.ts` — 20 gier, konta, rezerwacje, wypożyczenia |
| E-mail | Resend lub **log w konsoli** (nie wysyła „na niby” w UI — zapis w `notifications`) |

## Warstwa usług: `src/lib/services`

Logika biznesowa rezerwacji i wypożyczeń jest w jednym miejscu:

- `src/lib/services/reservations.ts` — rezerwacja, zatwierdzenie, gotowość do odbioru, anulowanie, limity użytkownika
- `src/lib/services/loans.ts` — wydanie z rezerwacji, zwrot, status egzemplarza w transakcji
- `src/lib/services/errors.ts` — `ServiceError` (kody błędów biznesowych)

**Server Actions** (`src/lib/actions/reservations.ts`, `loans.ts`) **nie** powinny zawierać własnych transakcji biznesowych. Ich rola:

1. Walidacja wejścia (Zod)
2. Auth i role (`requireActor`, `requireActorStaff`, …)
3. Wywołanie funkcji z `src/lib/services/*`
4. Warstwa UI: powiadomienia (`notifyUser`), `revalidatePath` (toasty obsługuje klient)

Testy integracyjne na bazie używają **tych samych serwisów** co UI:

- `npm run verify:flow` → `src/lib/flows/library-flow.ts` woła `services/reservations` i `services/loans`
- `npm run verify:race` → `attemptFlowCreateReservation` → `reserveGame` (ten sam kod co przy rezerwacji z panelu/katalogu)

**Zasada na przyszłość:** nie duplikuj logiki rezerwacji/wypożyczeń w akcjach, komponentach ani testach. Jeśli zmienia się przepływ biblioteki, zmieniaj najpierw `services`, potem dopasuj akcje i testy (`verify:flow`, `verify:race`, ewentualnie E2E).

## Szybki start (lokalnie, bez Supabase)

### 1. PostgreSQL

```bash
docker compose up -d
```

### 2. Konfiguracja

```bash
cp .env.local.example .env
npm install
```

### 3. Schema + seed

```bash
npx prisma db push
npm run db:seed
```

### 4. Uruchom

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Na `/login` zobaczysz baner **Tryb lokalny**.

### Konta testowe (po seedzie)

| Rola | E-mail | Hasło |
|------|--------|-------|
| Administrator | admin@example.com | Admin123! |
| Bibliotekarz | bibliotekarz@example.com | Bibliotekarz123! |
| Użytkownik | user@example.com | User123! |

### Przepływ do ręcznego sprawdzenia

1. Zaloguj jako **user** → katalog → rezerwacja gry (egzemplarz `RESERVED` w DB).
2. Zaloguj jako **bibliotekarz** → `/admin/rezerwacje` → Zatwierdź → Gotowe → **Wydaj**.
3. **Zwrot** w `/admin/wypozyczenia`.
4. Zaloguj jako **admin** → `/admin/gry/nowa` — nowa gra w bazie; `/admin/egzemplarze` — nowy egzemplarz.

## Podpięcie Supabase

- **[docs/LOCAL_AUTH.md](docs/LOCAL_AUTH.md)** — logowanie lokalne  
- **[docs/SUPABASE.md](docs/SUPABASE.md)** — Supabase Auth  
- **[docs/SECURITY.md](docs/SECURITY.md)** — audyt bezpieczeństwa

Skrót:

1. Ustaw `AUTH_PROVIDER=supabase` i klucze z panelu.
2. `DATABASE_URL` z tego samego projektu Supabase.
3. `npm run db:seed` — utworzy użytkowników w Supabase Auth.

## Zmienne środowiskowe

| Zmienna | Opis |
|---------|------|
| `DATABASE_URL` | **Wymagane** — PostgreSQL |
| `AUTH_PROVIDER` | `local` lub `supabase` (auto-detekcja) |
| `AUTH_SECRET` | Podpis cookie w trybie local (min. 16 znaków) |
| `NEXT_PUBLIC_SUPABASE_*` | Tylko dla `supabase` |
| `RESEND_API_KEY` | Opcjonalnie — maile |

## Skrypty

```bash
npm run dev          # dev server
npm run build        # prisma generate + next build
npm run lint
npm run db:seed
npm run db:studio    # podgląd bazy
npx prisma migrate dev
npm run verify:flow  # pełny przepływ na DB (serwisy)
npm run verify:race  # test wyścigu rezerwacji
npm run test:e2e     # Playwright (wymaga działającego dev + seed)
```

### Test przepływu na bazie (`verify:flow`)

Wymaga działającego PostgreSQL i seeda:

```bash
docker compose up -d
npx prisma db push
npm run db:seed
npm run verify:flow
```

Skrypt (`scripts/verify-flow.ts` → `src/lib/flows/library-flow.ts` → **`src/lib/services/*`**) wykonuje na żywej bazie:

rezerwacja (PENDING) → zatwierdzenie → gotowe do odbioru → wydanie (loan ACTIVE) → zwrot (AVAILABLE),

sprawdza statusy w tabelach i wpisy `audit_logs`, potem **usuwa** dane testowe (tag `verify-flow:{runId}`).

Sukces: `✅ FLOW OK` · Błąd: `❌ FLOW FAILED: …`

Szybki ping bazy (bez pełnego flow): `npm run verify`

### Test wyścigu rezerwacji (`verify:race`)

Sprawdza, czy **tylko jedna** z dwóch równoległych rezerwacji wygrywa o ten sam egzemplarz:

```bash
npm run verify:race
```

- Fixture: gra `verify-race-game` z **jednym** egzemplarzem `VF-RACE-001`
- Użytkownicy: `user@example.com` + `verify-race-b@example.com` (tworzony przez test)
- Dwie równoległe transakcje Prisma (`Promise.all`, osobne klienty)
- Oczekiwane: 1× sukces, 1× błąd (RACE / brak dostępności), copy → `RESERVED`, jedna aktywna rezerwacja
- Po teście: cleanup

Sukces: `✅ RACE TEST OK` · Błąd: `❌ RACE TEST FAILED: …`

## Aktualny status MVP

Ostatnia weryfikacja lokalna (PostgreSQL przez `npx prisma dev --detach`, po `npm run db:seed`):

| Sprawdzenie | Wynik |
|-------------|--------|
| `npx prisma validate` | OK |
| `npm run lint` | OK (1 ostrzeżenie: `<img>` w `copy-qr.tsx`) |
| `npm run verify:flow` | OK |
| `npm run verify:race` | OK |
| `npm run test:e2e` | OK — 4/4 scenariusze |
| `npm run build` | OK |

**Windows:** przed `npm run build` zatrzymaj `npm run dev`, bo `prisma generate` może dostać `EPERM` na zablokowanym pliku silnika Prisma (gdy działa `next dev`).

## Jak sprawdzić projekt przed commitem

Przy działającym PostgreSQL (Docker lub `npx prisma dev --detach`) i po `npm run db:seed`:

```bash
npx prisma validate
npm run lint
npm run verify:flow
npm run verify:race
npm run test:e2e
npm run build
```

**Uwaga (Windows):** jeśli `npm run build` kończy się błędem `EPERM` przy `prisma generate`, zatrzymaj `npm run dev` / `next dev` (blokada pliku silnika Prisma) i uruchom build ponownie.

Dla E2E: domyślnie Playwright łączy się z dev serverem na porcie **3001** (gdy 3000 jest zajęty). Uruchom `npm run dev` przed `npm run test:e2e`.

## Stack

Next.js 16 · TypeScript · Tailwind · Prisma 6 · PostgreSQL · Supabase (opcjonalnie) · Zod · Server Actions

## Struktura

```
src/lib/services/    # Logika biznesowa rezerwacji i wypożyczeń (źródło prawdy)
src/lib/actions/     # Server Actions: Zod, auth, serwisy, revalidate
src/lib/flows/       # verify:flow / verify:race (wołają services)
src/lib/auth/        # local + supabase, sesja, RBAC
e2e/                 # Playwright (prawdziwa przeglądarka)
prisma/schema.prisma # Model bazy
prisma/seed.ts       # Dane startowe
docs/SUPABASE.md     # Podpięcie Supabase
```

## Wdrożenie (Vercel)

Zmienne jak w `.env.example`, `AUTH_PROVIDER=supabase`, `npx prisma migrate deploy`, redirect URL w Supabase Auth.

---

Fundacja Zakątek Fantastyki
