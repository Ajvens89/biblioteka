# Logowanie lokalne (`AUTH_PROVIDER=local`)

## Kiedy jest aktywne

- `AUTH_PROVIDER=local` w `.env`, **albo**
- brak prawdziwych kluczy Supabase (auto-detekcja w `src/lib/auth/config.ts`).

W **produkcji** tryb local wymaga `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` (inaczej start aplikacji się wyłoży).

## Pliki i przepływ

| Etap | Plik | Funkcja |
|------|------|---------|
| Rejestracja | `src/lib/actions/auth.ts` | `registerAction` → `registerLocal()` |
| Rejestracja (logika) | `src/lib/auth/local-auth.ts` | `registerLocal` — bcrypt hash, `profiles` INSERT |
| Login | `src/lib/actions/auth.ts` | `loginAction` → `loginLocal()` |
| Login (logika) | `src/lib/auth/local-auth.ts` | `loginLocal` — `verifyPassword`, `setLocalSession` |
| Logout | `src/lib/actions/auth.ts` | `logoutAction` → `logoutLocal()` + `clearAllAuthSessions()` |
| Cookie — zapis | `src/lib/auth/local-session.ts` | `setLocalSession` |
| Cookie — odczyt | `src/lib/auth/local-session.ts` | `getLocalSessionProfileId` |
| HMAC | `src/lib/auth/session-token.ts` | `signProfileSession`, `verifyProfileSession` |
| Sesja aplikacji | `src/lib/auth/session.ts` | `getLocalSessionUser` → `prisma.profile` |
| Actor (role z DB) | `src/lib/auth/actor.ts` | `getActorFromDb` |
| Strony chronione | `src/lib/auth/guards.ts` | `requireUser`, `requireStaff`, `requireAdmin`, `requireStaffFromDb` |
| Middleware | `src/middleware.ts` | weryfikacja cookie HMAC dla `/admin`, `/moje-*` |

## Hasła

- Biblioteka: **bcrypt** (`bcryptjs`), koszt **12** (`src/lib/auth/password.ts`).
- Sól: generowana automatycznie w prefiksie hasha (`$2a$...`).
- W bazie: tylko `profiles.password_hash` — **nigdy** plaintext.

## Cookie `biblioteka_session`

| Atrybut | Wartość |
|---------|---------|
| Zawartość | `{uuid}.{hmac_sha256_hex}` — tylko ID profilu + podpis |
| `httpOnly` | `true` |
| `sameSite` | `lax` |
| `secure` | `true` gdy `NODE_ENV=production` |
| `path` | `/` |
| `maxAge` | 14 dni |

Tajny klucz: `AUTH_SECRET` (min. 32 znaki w produkcji).

## Seed

`prisma/seed.ts` → `seedLocalUsers()` zawsze tworzy konta testowe z `passwordHash`.

## Izolacja od Supabase

Przy logowaniu lokalnym: `clearOtherAuthSessions()` wylogowuje Supabase (jeśli było).

Przy logowaniu Supabase: czyszczone jest cookie lokalne.

`getAuthProvider()` wybiera **jeden** tryb — nigdy oba naraz.
