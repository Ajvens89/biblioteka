# Supabase (`AUTH_PROVIDER=supabase`)

## Wymagania

```env
AUTH_PROVIDER=supabase
DATABASE_URL=postgresql://...   # z tego samego projektu Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # tylko serwer / seed — NIGDY w przeglądarce
AUTH_SECRET=...                    # min. 32 znaki (podpis cookie przy migracji z local)
```

Placeholdery (`[PROJECT_REF]`, `your-anon-key`) **nie** aktywują trybu supabase.

## Pliki

| Obszar | Plik |
|--------|------|
| Login / rejestracja | `src/lib/actions/auth.ts` |
| Klient serwerowy | `src/lib/supabase/server.ts` |
| Sesja | `src/lib/auth/session.ts` → `getSupabaseSessionUser` |
| Middleware | `src/middleware.ts` — `supabase.auth.getUser()` |
| Callback OAuth/magic link | `src/app/api/auth/callback/route.ts` |
| Seed kont | `prisma/seed.ts` → `seedSupabaseUsers()` |
| Admin API | `createAdminClient` w `src/lib/supabase/admin.ts` |

## Przepływ sesji

1. Użytkownik loguje się przez `supabase.auth.signInWithPassword`.
2. Sesja w cookies Supabase (zarządzane przez `@supabase/ssr`).
3. `getSessionUser()` mapuje `auth.users.id` → `profiles.auth_user_id`.
4. **Rola zawsze z `profiles`** (`getActorFromDb`).

Przy logowaniu Supabase: `clearOtherAuthSessions()` usuwa cookie `biblioteka_session`.

## Konfiguracja panelu Supabase

### Authentication

- Włącz **Email** provider.
- **URL Configuration:**
  - Site URL: `http://localhost:3000` lub domena prod
  - Redirect URLs: `http://localhost:3000/api/auth/callback`

### Database

```bash
npx prisma migrate deploy   # produkcja
npx prisma migrate dev      # dev
npm run db:seed
```

### Storage (opcjonalnie)

- Bucket: `game-images` (zgodnie z `STORAGE_BUCKET` w kodzie).
- Polityki: public read / authenticated upload.

## Seed

Z `SUPABASE_SERVICE_ROLE_KEY` seed:

1. Tworzy użytkowników w Auth (`admin@`, `bibliotekarz@`, `user@`).
2. Aktualizuje `profiles.auth_user_id` (po wcześniejszym `seedLocalUsers`).

## Produkcja (Vercel)

1. Wszystkie zmienne env jak wyżej.
2. **Nie** ustawiaj `AUTH_PROVIDER=local` bez `ALLOW_LOCAL_AUTH_IN_PRODUCTION`.
3. `npx prisma migrate deploy` na bazie prod po deploy.

## Różnica local vs supabase

| | Local | Supabase |
|---|-------|----------|
| Hasło | `profiles.password_hash` | Supabase Auth |
| Cookie app | `biblioteka_session` | cookies Supabase |
| Wymaga internetu do logowania | nie | tak (API Supabase) |
| Role | `profiles.role` | `profiles.role` |

Szczegóły local: [LOCAL_AUTH.md](./LOCAL_AUTH.md).
