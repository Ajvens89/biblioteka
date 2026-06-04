# Biblioteka Zakątka Fantastyki

Aplikacja webowa biblioteki gier Fundacji Zakątek Fantastyki: katalog publiczny, rezerwacje online, panel bibliotekarza i administratora. Dane w **PostgreSQL** (Prisma), logika biznesowa w **Server Actions** i `src/lib/services`.

To **nie jest makieta** — rezerwacje, wypożyczenia, EAN i import zapisują się w bazie.

## Funkcje

| Obszar | Opis |
|--------|------|
| **Katalog** | Wyszukiwanie, filtry planszówki/RPG, dostępność, skan EAN, karty z okładkami |
| **Rezerwacje** | Użytkownik rezerwuje wolny egzemplarz; staff zatwierdza → odbiór → wypożyczenie → zwrot |
| **Panel admin** | Gry, egzemplarze, rezerwacje, wypożyczenia, użytkownicy, import, dashboard |
| **EAN / ISBN** | Lookup po stronie serwera (lokalna baza → Google Books → Open Library → BGG po tytule) |
| **Skaner** | Kamera tylko po otwarciu modala (BarcodeDetector / ZXing) |
| **Import `products.json`** | Gry planszowe + egzemplarze (`npm run import:products`) |
| **Typy zbioru** | `BOARD_GAME` (planszowe), `RPG` (fabularne) |
| **Okładki** | URL zewnętrzny lub placeholder; opcjonalnie Supabase Storage |

## Szybki start

### 1. Baza danych

**Docker (zalecane):**

```bash
docker compose up -d
```

**Albo Prisma Dev (bez Dockera):**

```bash
npx prisma dev --detach
```

### 2. Konfiguracja

```bash
cp .env.local.example .env
npm install
```

Ustaw `DATABASE_URL` i `DIRECT_URL` w `.env` (lokalnie często ten sam URL; Docker: `postgresql://biblioteka:biblioteka@localhost:5432/biblioteka`).

### 3. Schema i dane

```bash
npx prisma db push
# lub z migracjami: npm run db:migrate:deploy  (staging/prod)
npm run db:seed
```

### 4. Uruchomienie

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000) — na `/login` baner **Tryb lokalny** gdy `AUTH_PROVIDER=local`.

## Konta testowe (po `db:seed`)

| Rola | E-mail | Hasło |
|------|--------|-------|
| Administrator | admin@example.com | Admin123! |
| Bibliotekarz | bibliotekarz@example.com | Bibliotekarz123! |
| Użytkownik | user@example.com | User123! |

## Komendy (`package.json`)

| Skrypt | Opis |
|--------|------|
| `npm run dev` | Serwer deweloperski Next.js |
| `npm run build` | `prisma generate` + build produkcyjny |
| `npm run start` | Serwer po buildzie |
| `npm run lint` | ESLint |
| `npm run db:push` | `prisma db push` — schema → DB (dev) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` — **staging / produkcja** |
| `npm run db:seed` | Dane startowe (gry, konta, przykłady) |
| `npm run db:seed:staging` | Seed idempotentny na staging (bez usuwania danych) |
| `npm run db:migrate` | `prisma migrate dev` — nowa migracja w dev |
| `npm run db:studio` | Prisma Studio |
| `npm run verify` | Szybki ping bazy + liczniki tabel |
| `npm run verify:flow` | Integracja: rezerwacja → zwrot (serwisy) |
| `npm run verify:race` | Test wyścigu dwóch rezerwacji |
| `npm run verify:ean` | EAN + typy zbiorów na DB |
| `npm run verify:products-import` | Weryfikacja importu products.json |
| `npm run verify:ean-images` | Okładki (mocki providerów + DB) — opcjonalny |
| `npm run audit:ean` | Audyt duplikatów EAN (**tylko odczyt**) |
| `npm run import:products` | Import z `products.json` (ścieżka jako argument) |
| `npm run test:unit` | Testy jednostkowe serwisów (bez DB) |
| `npm run test:e2e` | Playwright (wymaga DB + dev na :3001 lub `test:e2e:ci`) |
| `npm run test:e2e:ci` | E2E z buildem (`PLAYWRIGHT_FORCE_WEBSERVER=1` w CI) |
| `npm run test:e2e:staging` | E2E przeciwko URL (`PLAYWRIGHT_BASE_URL=…`) |
| `npm run check:all` | Pełna weryfikacja przed commitem (patrz niżej) |
| `npm run db:ping` | `SELECT 1` — test połączenia |

### Jedna komenda przed commitem

```bash
npm run check:all
```

Kolejność: `prisma validate` → `lint` → `test:unit` → `verify:flow` → `verify:race` → `verify:ean` → `audit:ean` → `test:e2e:ci` → `build`.

Jeśli PostgreSQL nie działa, skrypt wypisze:

> Uruchom `npx prisma dev --detach` albo `docker compose up -d`

i pominie kroki wymagające bazy (bez długiego stack trace).

## Import produktów

Plik: `./products.json`, `./data/products.json` lub `./public/products.json` (wzór: `data/products.json.example`).

```bash
npm run import:products -- ./data/products.json --dry-run
npm run import:products -- ./data/products.json
npm run verify:products-import
```

- `barcode` → `games.ean` (kod produktu, nie egzemplarza).
- Domyślnie `BOARD_GAME`.
- Ponowny import **aktualizuje** istniejące gry (tytuł zawsze; opis/okładka gdy są w JSON) — zrób `--dry-run` na produkcji.

Panel admin: `/admin/import`.

## Audyt EAN

```bash
npm run audit:ean
npm run audit:ean -- --json
```

Tylko odczyt — duplikaty, konflikty, błędne sumy kontrolne. Plan scalania: `npm run plan:ean-merge`.

## Testy

```bash
npm run test:unit          # bez bazy
npm run db:ping            # połączenie
npm run verify:flow
npm run verify:race
npm run verify:ean
npm run audit:ean
npm run test:e2e           # uruchom wcześniej npm run dev (port 3001) lub:
# PLAYWRIGHT_FORCE_WEBSERVER=1 CI=1 npm run test:e2e:ci
npm run build
```

**Windows:** przed `build` zatrzymaj `npm run dev` (blokada pliku Prisma, błąd `EPERM`).

## Staging / Preview (Vercel)

Żywy link testowy bez dotykania produkcji: **[docs/STAGING.md](docs/STAGING.md)** (checklist, import, E2E na URL).

Skrót po pierwszym deployu:

```bash
npm run db:migrate:deploy
npm run db:seed:staging
PLAYWRIGHT_BASE_URL=https://twoj-preview.vercel.app npm run test:e2e:staging
```

## Wdrożenie

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Docker, Prisma Dev, Supabase, **Vercel staging**, migracje
- **[docs/SUPABASE.md](docs/SUPABASE.md)** — Auth Supabase
- **[docs/LOCAL_AUTH.md](docs/LOCAL_AUTH.md)** — Auth lokalne (dev)
- **[docs/SECURITY.md](docs/SECURITY.md)** — model bezpieczeństwa
- **[docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)** — checklist przed prod

Skrót produkcji: `AUTH_PROVIDER=supabase`, silne `AUTH_SECRET`, `prisma migrate deploy`, redirect URLs w Supabase Auth.

## Architektura

```
src/lib/services/     # Źródło prawdy: rezerwacje, wypożyczenia, EAN, import
src/lib/actions/      # Zod + auth + wywołanie serwisów
src/lib/games/        # Zapytania katalogu
src/app/              # Strony Next.js (App Router)
e2e/                  # Playwright
prisma/               # Schema + seed
```

**Zasada:** nie duplikuj logiki rezerwacji/wypożyczeń poza `services/`.

## Znane ograniczenia

- **RLS Supabase** — nie jest pełnym modelem dostępu w tym repo; autoryzacja przez Prisma + role w `profiles`.
- **Storage okładek** — opcjonalny; bez konfiguracji zostają zewnętrzne URL.
- **E-mail** — bez `RESEND_API_KEY` tylko log + wpis w `notifications`.
- **Import** — może nadpisać tytuł istniejącej gry przy ponownym imporcie.
- **Planszeo** — tylko link do ręcznego wyszukiwania, brak automatycznego API.
- **Middleware admin** — sprawdza sesję, rolę staff weryfikuje layout + akcje.

## Roadmapa

- [ ] Supabase Storage dla okładek + polityki bucketu
- [ ] RLS / polityki dostępu do DB (jeśli wymagane przez audyt)
- [ ] Maile transakcyjne (Resend) na produkcji
- [ ] Cron: przypomnienia / przeterminowane
- [ ] Flaga importu „nie nadpisuj ręcznych pól”
- [ ] Migracje produkcyjne na dedykowanej bazie testowej
- [ ] Dopracowanie UI (mobile, dostępność)

---

Fundacja Zakątek Fantastyki
