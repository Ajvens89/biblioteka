# Audyt porządkowania projektu — Biblioteka Zakątka Fantastyki

**Data audytu:** 2026-06-06  
**Metoda:** przegląd `git ls-files`, struktury dysku, `package.json`, importów w kodzie, `playwright.config.ts`, Firebase, Prisma, README/docs.

---

## Podsumowanie

| Kategoria | Liczba pozycji |
|-----------|----------------|
| Zostawić bez zmian | ~95% repo |
| Usunąć (bezpiecznie, lokalnie) | 1–2 pliki logów |
| Dodać do `.gitignore` | 2 wzorce |
| Do ręcznego potwierdzenia | 8 pozycji |
| Ryzykowne — nie ruszać | 12 pozycji |

**Wniosek:** Projekt jest w dobrym stanie. Brak śledzonych sekretów (`.env`, `node_modules` w `.gitignore`). Główne „śmieci” to **logi lokalne** i **artefakty Playwright**. Kilka plików to boilerplate Next.js lub przyszłe funkcje — nie usuwać bez decyzji.

---

## 1. Katalog główny — pliki i foldery

### Zostawić bez zmian

| Element | Rola | Dowód użycia |
|---------|------|----------------|
| `src/` | Aplikacja Next.js (App Router, komponenty, serwisy, auth) | `npm run dev`, `npm run build` |
| `prisma/` | Schema, migracje, seed | `db:*`, `postinstall` → `prisma generate` |
| `prisma/migrations/` | Historia migracji SQL | `npm run db:migrate:deploy` — **nie usuwać** |
| `public/` | Statyczne assety (`favicon`, placeholder) | Next.js `public/` |
| `scripts/` | Skrypty CLI (import, verify, backfill, Firebase) | `package.json` scripts + `check-all.ts` |
| `e2e/` | Testy Playwright | `playwright.config.ts` → `testDir: "./e2e"` |
| `docs/` | Dokumentacja wdrożenia i bezpieczeństwa | README, onboarding |
| `data/` | Przykładowe JSON do importu/weryfikacji | `import:products`, `verify:products-import` |
| `package.json` / `package-lock.json` | Zależności i skrypty npm | Cały toolchain |
| `next.config.ts` | Konfiguracja Next (obrazy zdalne) | `npm run build` |
| `tsconfig.json` | TypeScript | Build |
| `eslint.config.mjs` | ESLint | `npm run lint` |
| `postcss.config.mjs` | Tailwind v4 | Build CSS |
| `components.json` | shadcn/ui | Komponenty UI w `src/components/ui/` |
| `playwright.config.ts` | E2E | `npm run test:e2e*` |
| `docker-compose.yml` | Lokalny PostgreSQL | README „Docker (zalecane)” |
| `firebase.json` | Deploy App Hosting (backend `bookshelf`) | `firebase deploy --only apphosting:bookshelf` |
| `apphosting.yaml` | Env, build, Cloud Run dla Firebase | Firebase App Hosting |
| `.firebaserc` | Projekt Firebase `bibl-2c364` | Firebase CLI |
| `.env.example` | Szablon env (Vercel/Supabase/ogólny) | README, onboarding |
| `.env.local.example` | Szablon env lokalny (Docker/Prisma Dev) | README |
| `.env.firebase.example` | Szablon env Firebase + Neon | `docs/FIREBASE-WDROZENIE.md` |
| `.firebaserc.example` | Szablon bez wpisanego project ID | `docs/FIREBASE-WDROZENIE.md` |
| `.gitignore` | Wykluczenia git | Standard |
| `README.md` | Główna dokumentacja | — |
| `AGENTS.md` | Reguły dla agentów AI (Next.js 16) | Cursor / Claude |
| `CLAUDE.md` | Alias → `@AGENTS.md` | Claude Code |
| `src/instrumentation.ts` | Guard auth w produkcji | Next.js instrumentation hook |

### Tylko lokalnie (nie w repo — OK)

| Element | Status |
|---------|--------|
| `node_modules/` | W `.gitignore`, nie śledzone ✅ |
| `.env` | W `.gitignore`, nie śledzone ✅ |
| `.next/` | W `.gitignore` ✅ |
| `next-env.d.ts` | W `.gitignore`, generowany przez Next ✅ |
| `test-results/` | W `.gitignore` ✅ |
| `backfill-covers.log` | `*.log` w `.gitignore`, plik lokalny ✅ |

### Usunąć z dysku (bezpiecznie)

| Plik | Powód |
|------|--------|
| `backfill-covers.log` | Artefakt jednorazowego `backfill:covers:all`; ~450 linii; nie w git |
| Zawartość `test-results/` | Artefakty Playwright po lokalnych testach |

`firebase-debug.log` — **nie istnieje** na dysku (wzmianka w `firebase.json` ignore).

### Dodać do `.gitignore`

| Wzorzec | Powód |
|---------|--------|
| `.tmp-*.txt` | Pliki tymczasowe `scripts/sync-neon-to-firebase.ps1` |
| `public/covers/` | Lokalne okładki z importu (`import-products.ts` → `public/covers/`) |

### Do ręcznego potwierdzenia

| Element | Uwagi |
|---------|--------|
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Boilerplate `create-next-app`; **brak importów** w `src/`. Można usunąć, jeśli nie używane w marketingu. |
| `public/placeholder-game.svg` | **Brak odwołań** w kodzie — `GameCover` używa ikon Lucide. |
| `data/products.json` | **Śledzone w git** (1 produkt, ~364 B). Przy pełnym eksporcie 447 gier — rozważyć `.gitignore` + tylko `.example`. |
| `scripts/audit-ean-duplicates.ts` | **@deprecated** — przekierowuje do `audit-ean.ts`; brak wpisu w `package.json`. Można usunąć po migracji nawyków. |
| `src/lib/services/cover-storage.ts` | **Nieimportowany** w `src/`; wzmianka w docs (przyszły Supabase Storage). Zostawić jako stub. |
| `docs/AI_STATE.md` | Snapshot z 2026-06-03 — **nieaktualny** (Vercel/Supabase; dziś Firebase+Neon). Zaktualizować lub przenieść do archiwum. |
| `docs/STATUS-DLA-Ciebie.md` | Notatka operacyjna z wdrożenia — może zlać się z `FIREBASE-WDROZENIE.md`. |
| `docs/DEPLOYMENT.md` vs `FIREBASE-WDROZENIE.md` | Dwa przewodniki deploy — oba aktualne (Vercel vs Firebase). Nie duplikat 1:1. |

### Ryzykowne — nie ruszać bez backupu

| Element | Powód |
|---------|--------|
| `prisma/migrations/**` | Produkcja (Neon) zależy od historii migracji |
| `.firebaserc` | Aktywny deploy `bibl-2c364` |
| `apphosting.yaml` | Sekrety DATABASE_URL/DIRECT_URL + env produkcyjne |
| `firebase.json` | Konfiguracja App Hosting |
| `.env` (lokalny) | Sekrety Neon, Google CSE |
| `data/products.json.example` / `games.json.example` | Wzorce importu |
| `docker-compose.yml` | Alternatywa lokalnej bazy |
| Cloud Secret Manager (`DATABASE_URL`, `DIRECT_URL`) | Produkcja Firebase |
| `package-lock.json` | Reprodukowalne buildy |
| `scripts/patch-schema.sql` + `patch-db-schema.ts` | Dev workaround Prisma Dev |
| `e2e/global-setup.ts` | Mutuje DB w testach lokalnych |

---

## 2. `scripts/` — mapowanie do `package.json`

| Skrypt | npm script | Używany |
|--------|------------|---------|
| `ensure-prisma-dev.ts` | `dev`, `dev:db` | ✅ |
| `patch-db-schema.ts` | `db:patch` | ✅ |
| `db-ping.ts` | `db:ping` | ✅ |
| `verify-stack.ts` | `verify` | ✅ |
| `verify-flow.ts` | `verify:flow` | ✅ |
| `verify-race.ts` | `verify:race` | ✅ |
| `verify-ean.ts` | `verify:ean` | ✅ |
| `verify-ean-images.ts` | `verify:ean-images` | ✅ |
| `verify-google-cse.ts` | `verify:google-cse` | ✅ |
| `verify-products-import.ts` | `verify:products-import` | ✅ |
| `import-products.ts` | `import:products` | ✅ |
| `export-games.ts` | `export:games` | ✅ |
| `import-games-json.ts` | `import:games` | ✅ |
| `audit-ean.ts` | `audit:ean` | ✅ |
| `backfill-covers.ts` | `backfill:covers*` | ✅ |
| `plan-ean-merge.ts` | `plan:ean-merge` | ✅ |
| `check-all.ts` | `check:all` | ✅ |
| `lib/db-check.ts` | import z `check-all.ts` | ✅ |
| `sync-neon-to-firebase.ps1` | — | ✅ docs + ręczny deploy |
| `run-ean-stabilization.ps1` | — | ✅ pipeline EAN (dev) |
| `audit-ean-duplicates.ts` | — | ⚠️ deprecated shim |
| `patch-schema.sql` | — | ✅ używany przez `patch-db-schema.ts` |

---

## 3. `e2e/` — Playwright

| Plik | Rola |
|------|------|
| `library.spec.ts` | Główne scenariusze E2E |
| `global-setup.ts` / `global-teardown.ts` | Przygotowanie DB |
| `helpers.ts`, `constants.ts`, `db-cleanup.ts` | Narzędzia testów |

**Wniosek:** folder `e2e/` **potrzebny**. `test-results/` — tylko artefakty, już w `.gitignore`.

---

## 4. `data/`

| Plik | W git | Użycie |
|------|-------|--------|
| `products.json.example` | ✅ | Wzór importu |
| `products.json` | ✅ | `import:products` (obecnie 1 rekord) |
| `products-verify.json` | ✅ | `verify-products-import.ts` |
| `games.json.example` | ✅ | `import:games` / `export:games` |

Brak `data/covers/` w repo — okładki lokalne trafiają do `public/covers/` (proponowane `.gitignore`).

---

## 5. Firebase

| Plik | Zawartość wrażliwa | W git |
|------|-------------------|-------|
| `.firebaserc` | Tylko `bibl-2c364` (project ID) | ✅ publiczne ID |
| `.firebaserc.example` | Placeholder | ✅ |
| `.env.firebase.example` | Placeholdery bez haseł | ✅ |
| `apphosting.yaml` | AUTH_SECRET placeholder, referencje secretów | ✅ |
| Sekrety w GCP | Hasła Neon | ❌ nie w repo |

`.env.firebase.example` **nie duplikuje** `.env.example` — jest krótszy, pod Firebase Console (copy-paste).

---

## 6. Dokumentacja AI

| Plik | Cel |
|------|-----|
| `AGENTS.md` | Oficjalna reguła Next.js 16 dla agentów |
| `CLAUDE.md` | Jednolinijkowe `@AGENTS.md` dla Claude |

**To nie śmieci** — zostawić.

---

## 7. Komendy sprawdzające

```powershell
# Co jest śledzone przez git
git ls-files

# Czy sekrety / logi przypadkiem w git
git ls-files | findstr /i "\.env node_modules \.log"

# Co jest ignorowane
git check-ignore -v .env node_modules backfill-covers.log test-results .next

# Skrypty npm
npm run

# Walidacja Prisma
npx prisma validate

# Jakość i build
npm run lint
npm run build

# Testy (wymaga DATABASE_URL)
npm run test:unit
npm run test:e2e:ci   # wymaga DB + build

# Pełna weryfikacja
npm run check:all
```

---

## 8. Wykonane porządki (po tym raporcie)

- Usunięto lokalny `backfill-covers.log` (jeśli istniał).
- Wyczyszczono `test-results/` (jeśli zawierało artefakty).
- Rozszerzono `.gitignore` o `.tmp-*.txt` i `public/covers/`.
- **Nie usunięto** żadnego pliku śledzonego przez git.
- **Nie zmieniono** migracji Prisma, Firebase, `.example`.

---

## 9. Rekomendacje na później (wymagają Twojej decyzji)

1. Zaktualizować `docs/AI_STATE.md` pod Firebase + Neon.
2. Usunąć boilerplate SVG z `public/` jeśli niepotrzebne.
3. Dodać `data/products.json` do `.gitignore` przy dużym eksporcie katalogu.
4. Usunąć `scripts/audit-ean-duplicates.ts` po upewnieniu się, że nikt nie woła starej ścieżki.
5. Podpiąć `cover-storage.ts` do importu okładek albo oznaczyć w README jako „planowane”.
