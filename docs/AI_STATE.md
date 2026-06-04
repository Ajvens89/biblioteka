# Stan projektu — Biblioteka Zakątka Fantastyki

**Ostatnia aktualizacja:** 2026-06-03  
**Cel dokumentu:** Dokładny snapshot dla człowieka / innego AI — co jest zrobione, co nie działa, błędy, kolejne kroki.

---

## 1. Podsumowanie w jednym akapicie

Aplikacja **Next.js 16 + Prisma + PostgreSQL** (katalog, rezerwacje, admin, EAN, import `products.json`) jest **w repozytorium GitHub** i **wdrożona na Vercel**, ale **strona na Vercel nie działa** (błąd serwera), bo **baza Supabase nie ma jeszcze schematu** (migracje nie zostały zastosowane). Lokalnie `.env` wskazuje na martwy `localhost:51214`, więc `npm run db:migrate:deploy` z laptopa **nie łączy się z Supabase**. W Vercel ustawiono już `DATABASE_URL` i `DIRECT_URL`; brakuje m.in. kluczy Supabase Auth, `AUTH_SECRET`, `APP_URL` oraz seeda.

---

## 2. Infrastruktura (aktualny stan)

| Element | Stan | Szczegóły |
|---------|------|-----------|
| **GitHub** | ✅ Działa | https://github.com/Ajvens89/biblioteka — gałąź `master`, commit `24f2427` „Prepare library app for staging deployment” |
| **Vercel** | ⚠️ Deploy OK, app ❌ | Projekt podłączony (Hobby); build przechodzi; preview pokazuje **„This page couldn't load” / server error** |
| **Supabase** | ⚠️ Projekt istnieje, schema ❌ | URL: `https://puztvufmcwvkrsqlhcen.supabase.co`, region EU; dashboard: **„Migrations: No migrations”**, tabele aplikacji brak |
| **PostgreSQL lokalny** | ❌ Niedostępny | `db:ping` / `migrate deploy` → `Can't reach database server at localhost:51214` |
| **Docker** | ❓ Nie używany | `docker` niedostępny w środowisku agenta; użytkownik może mieć Docker lokalnie |

---

## 3. Co zostało zrobione (funkcje i kod)

### 3.1 Biznes i backend
- Rezerwacje / wypożyczenia w `src/lib/services/` (źródło prawdy), Server Actions + Zod + role.
- EAN produktu: `games.ean`; barcode egzemplarza: `game_copies.barcode`.
- Lookup EAN po stronie serwera (lokalna baza → Google Books → Open Library → BGG → ręcznie).
- Import `products.json` (`npm run import:products`), audyt EAN (`npm run audit:ean`).
- Typy zbioru: `BOARD_GAME` / `RPG`.

### 3.2 UI
- Strona główna, katalog (filtry, skaner, mobile drawer), szczegóły gry, konto użytkownika.
- Panel admina (dashboard, kreator gry, rezerwacje, wypożyczenia, import).
- Design system (`PageShell`, `GameCover`, `StatusBadge`, itd.).

### 3.3 DevOps / dokumentacja
- `prisma/migrations/20250603120000_init/` — pierwsza migracja SQL w repo.
- `npm run db:migrate:deploy`, `npm run db:seed:staging`, `npm run check:all`.
- `docs/DEPLOYMENT.md`, `docs/STAGING.md`, `docs/SECURITY_CHECKLIST.md`, README.
- Playwright: E2E z `PLAYWRIGHT_BASE_URL` na zewnętrzny staging (bez mutacji DB przy remote URL).

### 3.4 Testy (ostatnio uruchomione w środowisku dev)
| Komenda | Wynik |
|---------|--------|
| `npx prisma validate` | ✅ |
| `npm run lint` | ✅ (1 ostrzeżenie: `<img>` w `copy-qr.tsx`) |
| `npm run test:unit` | ✅ 21/21 |
| `npm run build` | ✅ |
| `verify:flow`, `verify:race`, `verify:ean`, `audit:ean`, `test:e2e` | ⏳ Nie uruchomione / fail — brak DB lokalnej |

---

## 4. Co nie działa (znane problemy)

### 4.1 Vercel — strona publiczna
- **Objaw:** Preview / production URL → „This page couldn't load”, server error (np. ERROR 1104943124).
- **Przyczyna:** Strona główna (`src/app/page.tsx`) od razu woła Prisma (`fetchAvailableNow`, …). Bez tabel w Supabase → wyjątek przy renderze.
- **Dodatkowo możliwe:** brak `AUTH_SECRET`, `AUTH_PROVIDER=supabase`, kluczy `NEXT_PUBLIC_SUPABASE_*`, złego `APP_URL`; przy `AUTH_PROVIDER=local` na Vercel — blokada w `production-guard.ts` (chyba że `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true`).

### 4.2 Baza Supabase
- **Objaw:** Dashboard Supabase → „No migrations”, brak tabel `games`, `profiles`, …
- **Przyczyna:** `npm run db:migrate:deploy` nie wykonane na URI Supabase (lokalne `.env` nadal wskazuje `localhost:51214`).
- **Plan B (użytkownik):** SQL Editor w Supabase — wkleić `prisma/migrations/20250603120000_init/migration.sql` z GitHuba i **Run**.

### 4.3 Lokalne środowisko użytkownika
- Użytkownik **nie chce / nie umie** uruchamiać poleceń w terminalu; prosił o prostszy sposób (przeglądarka).
- Plik `.env` lokalny **nie zsynchronizowany** z Supabase (nadal prisma dev / stary port).

### 4.4 Produkcja
- **Nie gotowe:** osobny Supabase prod, RLS, Storage, Resend, domena, migracje na prod z kontrolą danych.
- `data/products.json` w repo — rozważyć `.gitignore` jeśli duży/wrażliwy.

---

## 5. Zmienne środowiskowe

### 5.1 Ustawione (wg rozmowy / agenta Vercel)
- ✅ `DATABASE_URL` — Supabase pooler (6543, `pgbouncer=true`)
- ✅ `DIRECT_URL` — Supabase (5432)
- Ustawione w Vercel: Production + Preview, Sensitive.

### 5.2 Prawdopodobnie brakuje w Vercel
- `AUTH_SECRET` (≥ 32 znaki)
- `AUTH_PROVIDER=supabase`
- `NEXT_PUBLIC_SUPABASE_URL=https://puztvufmcwvkrsqlhcen.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` / `NEXT_PUBLIC_APP_URL` = faktyczny URL Vercel
- `ALLOW_LOCAL_AUTH_IN_PRODUCTION=false`

### 5.3 Lokalny `.env` (stan agenta)
- `DATABASE_URL` → `localhost:51214` (nie Supabase) — **do poprawy**, jeśli ktoś ma uruchamiać migracje/seed z laptopa.

---

## 6. Błędy (dosłowne komunikaty)

```
P1001: Can't reach database server at `localhost:51214`
```
— `npm run db:migrate:deploy`, `db:ping`, seed (lokalne `.env`).

```
fatal: Repository not found
```
— `git push` przed utworzeniem repo na GitHub (naprawione; push OK).

```
This page couldn't load — A server error occurred
```
— Vercel po deploy bez działającej bazy / env.

---

## 7. Repozytorium i pliki kluczowe

- **Remote:** `origin` → `https://github.com/Ajvens89/biblioteka.git`
- **Gałąź:** `master`
- **Ostatni commit:** `24f2427` — staging deployment prep (124 pliki, UI, EAN, migracje, docs)
- **Nie commitować:** `.env` (w `.gitignore`)
- **W commicie:** `data/products.json`, `data/products.json.example`

---

## 8. Co zrobić dalej (kolejność — jeden tor na raz)

### Tor A — Naprawa Vercel (zalecane, bez terminala u użytkownika)

1. **Supabase → SQL Editor → New query**  
   Wklej cały plik:  
   https://github.com/Ajvens89/biblioteka/blob/master/prisma/migrations/20250603120000_init/migration.sql  
   → **Run** (utworzy tabele).

2. **Vercel → Environment Variables** — dodać brakujące (sekcja 5.2).

3. **Supabase → Authentication → URL Configuration** — redirect na URL Vercel + `localhost`.

4. **Vercel → Redeploy.**

5. **Seed** — wymaga terminala z `.env` Supabase **lub** ręcznego utworzenia użytkowników w Supabase Auth + wpisów w DB (trudniejsze). Proste: ktoś techniczny uruchamia:
   ```bash
   npm run db:seed:staging
   ```
   z poprawnym `.env`.

6. Otwórz URL Vercel → `/login` → `user@example.com` / `User123!`.

### Tor B — Lokalny dev (opcjonalnie)

1. `cp .env.local.example .env` + wklej Supabase URI.  
2. `npm run db:migrate:deploy` + `npm run db:seed:staging` + `npm run dev`.

### Tor C — Po działającym stagingu

- `npm run audit:ean`, import `products.json`, E2E na `PLAYWRIGHT_BASE_URL`, checklista w `docs/STAGING.md`.
- Osobny Supabase + Vercel Production dopiero po testach.

---

## 9. Konta testowe (po seedzie)

| Rola | E-mail | Hasło |
|------|--------|-------|
| Admin | admin@example.com | Admin123! |
| Bibliotekarz | bibliotekarz@example.com | Bibliotekarz123! |
| User | user@example.com | User123! |

Bez seeda logowanie na Vercel **nie zadziała**.

---

## 10. Linki

| Zasób | URL |
|-------|-----|
| GitHub | https://github.com/Ajvens89/biblioteka |
| Supabase | https://puztvufmcwvkrsqlhcen.supabase.co |
| Vercel | *(URL projektu — użytkownik ma w panelu Vercel → Domains)* |
| Migracja SQL | https://github.com/Ajvens89/biblioteka/blob/master/prisma/migrations/20250603120000_init/migration.sql |

---

## 11. Dla następnego AI — zasady pracy

- Użytkownik preferuje **jeden krok na raz**, krótko, po polsku.
- **Nie dodawać** dużych funkcji bez prośby — teraz naprawa deploy/staging.
- Nie prosić o wklejanie haseł/API keys na czacie.
- Po zmianach env na Vercel zawsze **Redeploy**.
- Staging ≠ produkcja: osobny Supabase zalecany przed go-live.

---

## 12. Status końcowy

| Pytanie | Odpowiedź |
|---------|-----------|
| Kod gotowy? | ✅ Tak (build, testy unit) |
| GitHub? | ✅ Tak |
| Vercel deploy? | ⚠️ Tak, ale app pada |
| Supabase schema? | ❌ Nie |
| Seed na staging? | ❌ Nie |
| Gotowe do użytkowania przez użytkowników? | ❌ Nie |
| Gotowe do dalszego stagingu po SQL + env + seed? | ⚠️ Tak, 3–5 kroków |

**Następny pojedynczy krok dla użytkownika:** Supabase **SQL Editor** → wklej `migration.sql` z GitHuba → **Run**.
