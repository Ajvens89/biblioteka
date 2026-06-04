# Security checklist — Biblioteka Zakątka Fantastyki

Checklist przed wdrożeniem produkcyjnym. Szczegóły implementacji: [SECURITY.md](./SECURITY.md).

## Sekrety i repozytorium

| # | Kontrola | Status w projekcie |
|---|----------|-------------------|
| 1 | `.env` w `.gitignore` | ✅ `.env`, `.env.local`, `.env.*.local` |
| 2 | `.env.example` bez prawdziwych kluczy | ✅ placeholdery, `AUTH_SECRET` jako przykład |
| 3 | Brak kluczy API / haseł w commitach | Przed pushem: `git status`, nie dodawaj `.env` |

## Uwierzytelnianie

| # | Kontrola | Status |
|---|----------|--------|
| 4 | `AUTH_SECRET` ≥ 32 znaki w produkcji | ✅ `src/lib/auth/session-token.ts` — błąd przy podpisie cookie |
| 5 | Local auth zablokowany w prod bez `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` | ✅ `src/lib/auth/production-guard.ts` + `instrumentation.ts` |
| 6 | Hasła: bcrypt (12 rund), nie plaintext | ✅ `src/lib/auth/password.ts` |
| 7 | Cookie sesji: HMAC, `httpOnly`, `secure` w prod | ✅ `session-token.ts`, `local-session.ts` |

## Autoryzacja (serwer)

| # | Kontrola | Status |
|---|----------|--------|
| 8 | Server Actions: `getActorFromDb` / `requireActor*` | ✅ `src/lib/actions/*` |
| 9 | Panel `/admin`: layout `requireStaffFromDb()` | ✅ `src/app/admin/layout.tsx` |
| 10 | Middleware: sesja na `/admin`, `/moje-*` | ✅ `src/middleware.ts` (obecność użytkownika) |
| 11 | Rola staff/admin w akcjach mutujących | ✅ actor + `requireActorStaff` / `requireActorAdmin` |
| 12 | Użytkownik anuluje tylko własną rezerwację | ✅ `src/lib/services/reservations.ts` |

**Uwaga:** middleware nie weryfikuje roli LIBRARIAN/ADMIN — to robi layout admina i każda Server Action. Nie polegaj wyłącznie na middleware dla RBAC.

## EAN, okładki, import

| # | Kontrola | Status |
|---|----------|--------|
| 13 | Lookup EAN tylko po stronie serwera | ✅ `lookupEanAction` → `lookupGameByEanWithFallback` |
| 14 | URL okładki: tylko `http`/`https` | ✅ `validateCoverImageUrl` w `image-utils.ts` |
| 15 | Kamera tylko po kliknięciu (modal otwarty) | ✅ `EanScanner` — `getUserMedia` w `useEffect` gdy `open===true` |
| 16 | Import `products.json` — świadome nadpisywanie | ⚠️ Patrz niżej |

### Import produktów — nadpisywanie danych

Przy **ponownym imporcie** istniejącej gry (po EAN lub tytule):

- **Zawsze** aktualizowany jest `title` i `collectionType` (planszówka).
- `description`, `coverImageUrl`, `publisherId` — tylko gdy pole jest w pliku JSON.
- `ean` — dopisywany, jeśli w bazie brakowało.
- **Nie** ma flagi „nie nadpisuj ręcznych poprawek” — przed produkcyjnym importem uruchom `--dry-run` i `npm run audit:ean`.

## Supabase (gdy `AUTH_PROVIDER=supabase`)

| # | Kontrola | Status |
|---|----------|--------|
| 17 | RLS na tabelach aplikacji | ⚠️ **Nie w pełni wdrożone** — aplikacja używa Prisma + service role / connection string; dostęp do DB nie jest modelowany przez RLS w tym repo |
| 18 | Storage okładek | ⚠️ Opcjonalnie (`cover-storage.ts`) — bez bucketa zostaje zewnętrzny URL |
| 19 | `SUPABASE_SERVICE_ROLE_KEY` tylko na serwerze | ✅ nie w `NEXT_PUBLIC_*` |

## Transakcje i race conditions

| # | Kontrola | Status |
|---|----------|--------|
| 20 | Rezerwacja: transakcja + warunek statusu copy | ✅ `reserveGame` |
| 21 | Test wyścigu | ✅ `npm run verify:race` |

## Zalecane przed produkcją

1. `AUTH_PROVIDER=supabase`, silne hasła, redirect URLs w panelu Supabase.
2. `AUTH_SECRET` losowy ≥ 32 znaki (nawet przy Supabase — cookie lokalne wyłączone, ale zmienna może być wymagana w build).
3. `npm run audit:ean` na kopii produkcyjnej bazy (tylko odczyt).
4. `npm run check:all` na środowisku CI z PostgreSQL.
5. Przegląd [DEPLOYMENT.md](./DEPLOYMENT.md).

## Szybka weryfikacja lokalna

```bash
npm run db:ping
npm run audit:ean
npm run test:unit
```
