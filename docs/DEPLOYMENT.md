# Wdrożenie — Biblioteka Zakątka Fantastyki

Przewodnik: **local**, **staging/preview**, **production**. Zmienne: [.env.example](../.env.example).

---

## Zmienne środowiskowe (szablon)

| Zmienna | Local | Staging | Production |
|---------|-------|---------|------------|
| `DATABASE_URL` | Docker / prisma dev | Supabase pooler (6543, `pgbouncer=true`) | Osobny projekt Supabase |
| `DIRECT_URL` | = DATABASE_URL lokalnie | Supabase direct (5432) | Direct prod |
| `AUTH_SECRET` | ≥32 znaki dev | ≥32 znaki losowe | Silny unikalny |
| `AUTH_PROVIDER` | `local` | `supabase` (zalecane) | `supabase` |
| `APP_URL` | `http://localhost:3000` | URL Vercel Preview | Domena prod |
| `NEXT_PUBLIC_APP_URL` | jak APP_URL | jak APP_URL | jak APP_URL |
| `NEXT_PUBLIC_SUPABASE_*` | puste | projekt **staging** | projekt **prod** |
| `SUPABASE_SERVICE_ROLE_KEY` | puste | tylko server env | tylko server env |
| `ALLOW_LOCAL_AUTH_IN_PRODUCTION` | `false` | `false` (Preview: tylko jeśli świadomie local) | **`false`** |

Opcjonalnie: `RESEND_API_KEY`, `GOOGLE_BOOKS_API_KEY`, `EMAIL_FROM`.

---

## A. Lokalnie bez Dockera (Prisma Dev)

```bash
npm install
cp .env.local.example .env
npx prisma dev --detach
# DATABASE_URL i DIRECT_URL z outputu (usuń pgbouncer=true przy direct)
npx prisma db push
npm run db:seed
npm run dev
```

## B. Lokalnie z Dockerem

```bash
docker compose up -d
cp .env.local.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

---

## Staging na Vercel

### 1. Połącz repozytorium

1. [vercel.com](https://vercel.com) → **Add New Project** → import repo Git.
2. Framework: **Next.js** (auto).

### 2. Ustawienia buildu

| Pole | Wartość |
|------|---------|
| Build Command | `npm run build` |
| Install Command | `npm install` |
| Output Directory | (domyślnie Next) |
| Node.js | 20.x (domyślne) |

### 3. Environment Variables (Preview)

Ustaw dla środowiska **Preview** (nie Production):

| Zmienna | Wartość |
|---------|---------|
| `DATABASE_URL` | Z Supabase (Transaction pooler) |
| `DIRECT_URL` | Z Supabase (Session / direct) |
| `AUTH_SECRET` | Losowy ≥32 znaków |
| `AUTH_PROVIDER` | `supabase` |
| `APP_URL` | `https://<nazwa-projektu>.vercel.app` lub stały alias Preview |
| `NEXT_PUBLIC_APP_URL` | Jak `APP_URL` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server only) |
| `GOOGLE_BOOKS_API_KEY` | Opcjonalnie |
| `RESEND_API_KEY` | Opcjonalnie |

**Uwaga:** Vercel ustawia `NODE_ENV=production` na Preview. Przy `AUTH_PROVIDER=local` aplikacja **nie wystartuje** bez `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` na Preview — na staging zalecane **`AUTH_PROVIDER=supabase`**.

### 4. Deploy

Push na branch → Vercel buduje Preview URL.

### 5. Migracje po deployu (brak release phase)

Vercel **nie** uruchamia migracji automatycznie. Z lokalnej maszyny z `.env` wskazującym na **bazę staging**:

```bash
npm run db:migrate:deploy
npm run db:seed:staging
npm run db:ping
```

Alternatywa: GitHub Action z sekretami `DATABASE_URL` / `DIRECT_URL` staging i krokiem `npm run db:migrate:deploy` na push do `main` / `staging`.

**Nie używaj** `prisma db push` na współdzielonej bazie staging z danymi — używaj `migrate deploy`.

### 6. Import i audyt (staging DB)

```bash
npm run import:products -- ./data/products.json --dry-run
npm run import:products -- ./data/products.json
npm run audit:ean
```

### 7. Testy E2E przeciwko Preview

```bash
PLAYWRIGHT_BASE_URL=https://twoj-preview.vercel.app npm run test:e2e:staging
```

Checklist ręczna: [STAGING.md](./STAGING.md).

---

## Supabase staging

### 1. Osobny projekt

Utwórz **osobny** projekt Supabase (np. `biblioteka-staging`). Nie używaj produkcyjnej bazy do testów Vercel Preview.

### 2. Connection strings

W **Project Settings → Database**:

| Użycie | Pole Supabase | Env |
|--------|---------------|-----|
| Aplikacja (pooler) | Transaction pooler | `DATABASE_URL` |
| Migracje Prisma | Direct connection | `DIRECT_URL` |

### 3. Auth keys

**Project Settings → API:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publiczny, frontend)
- `SUPABASE_SERVICE_ROLE_KEY` — **tylko** Vercel server env / lokalny seed, **nigdy** w kodzie klienta

### 4. Auth redirect URLs

**Authentication → URL Configuration** — dodaj:

- `http://localhost:3000/**`
- `https://*.vercel.app/**` (lub konkretny Preview URL)
- Przyszły production URL (przygotuj z wyprzedzeniem)

Callback: `{APP_URL}/api/auth/callback`

### 5. Storage (opcjonalnie)

- Utwórz bucket np. `covers` (public lub signed URL).
- Polityki RLS/storage **nie są w pełni zdefiniowane w repo**.
- Na staging można używać **zewnętrznych URL** okładek (`cover-storage.ts` zwraca URL bez uploadu, gdy brak bucketa).

### 6. RLS (Row Level Security)

| Stan | Opis |
|------|------|
| **Aplikacja** | Dostęp przez Prisma + connection string (często pełne uprawnienia do DB) |
| **RLS w repo** | **Nie wdrożone** jako główny model bezpieczeństwa |
| **Przed produkcją** | Rozważyć RLS na `profiles`, `reservations`, `loans` jeśli klient łączy się bezpośrednio z Supabase — obecnie autoryzacja w Server Actions + `profiles.role` |

---

## Production (czeka na staging)

1. Osobny projekt Supabase + domena.
2. Vercel **Production** env (inne klucze niż Preview).
3. `npm run db:migrate:deploy` na prod DB (jednorazowo / przy release).
4. **Bez** `db:seed` z `@example.com` na prod bez decyzji.
5. `ALLOW_LOCAL_AUTH_IN_PRODUCTION=false`.
6. [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md).

---

## Migracje: `db push` vs `migrate`

| Środowisko | Komenda |
|------------|---------|
| Local dev (szybko) | `npx prisma db push` |
| Local — nowy plik migracji | `npm run db:migrate` |
| Staging / Production | `npm run db:migrate:deploy` |

Pierwsza migracja w repo: `prisma/migrations/20250603120000_init/`. Szczegóły: [prisma/migrations/README.md](../prisma/migrations/README.md).

Jeśli `migrate dev` nie działa u Ciebie (brak DB):

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script -o prisma/migrations/20250603120000_init/migration.sql
```

(plik już jest w repozytorium — commituj folder `prisma/migrations/`.)

---

## Weryfikacja

```bash
npm run check:all
```

Wymaga bazy dla kroków integracyjnych. Zobacz [README.md](../README.md).

---

## Co jest lokalne vs chmurowe

| Element | Local | Staging | Production |
|---------|-------|---------|------------|
| PostgreSQL | Docker / prisma dev | Supabase staging | Supabase prod |
| Auth | `local` | `supabase` | `supabase` |
| Hosting | `npm run dev` | Vercel Preview | Vercel Production |
| Okładki | URL / `public/covers` | URL lub Storage | Storage zalecany |
