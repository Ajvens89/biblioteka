# ETAP 0 — Kontrola przed wdrożeniem (final)

**Data:** 2026-06-03  
**Gałąź:** `security/stage-0` (ETAP 0 security — **niezmergowany** do `master`)  
**Wdrożenie:** **NIE wykonano**

---

## 1. Ochrona `/admin` przed odczytem przez USER

### Werdykt: **ZABEZPIECZONE** (bez dodatkowych zmian kodu)

### Warstwy ochrony

| Warstwa | Plik | Mechanizm | USER | STAFF | ADMIN |
|---------|------|-----------|------|-------|-------|
| Middleware | `src/middleware.ts` | Wymaga sesji (cookie) | przechodzi* | przechodzi* | przechodzi* |
| **Layout admin** | `src/app/admin/layout.tsx` | **`requireStaffFromDb()`** | **redirect `/?error=brak-uprawnien`** | ✅ | ✅ |
| Strony ADMIN-only | gry, użytkownicy, import, logi, ustawienia | `requireAdmin()` | n/d (layout blokuje) | redirect | ✅ |
| Strony STAFF | egzemplarze | `requireStaff()` (redundant) | n/d | ✅ | ✅ |
| Strony tylko layout | dashboard, rezerwacje, wypożyczenia, statystyki | layout staff | **blok** | ✅ | ✅ |
| API export | `/api/admin/games/export*` | `role === ADMIN` | 401 | 401 | ✅ |
| Server Actions | `src/lib/actions/*` | `requireActor*` | fail | częściowo | pełny |

\*Middleware **nie** sprawdza roli — to pierwsza warstwa sesji, nie autoryzacji. **Decydujący gate to layout.**

### Mapa stron `/admin`

| Ścieżka | Guard odczytu | USER widzi dane? |
|---------|---------------|------------------|
| `/admin` | layout staff | **NIE** |
| `/admin/rezerwacje` | layout staff | **NIE** |
| `/admin/wypozyczenia` | layout staff | **NIE** |
| `/admin/statystyki` | layout staff | **NIE** |
| `/admin/egzemplarze` | layout + requireStaff | **NIE** |
| `/admin/gry/*` | layout + requireAdmin | **NIE** |
| `/admin/uzytkownicy` | layout + requireAdmin | **NIE** |
| `/admin/import` | layout + requireAdmin | **NIE** |
| `/admin/logi` | layout + requireAdmin | **NIE** |
| `/admin/ustawienia` | layout + requireAdmin | **NIE** |

### Testy

| Test | Status |
|------|--------|
| E2E: USER → `/admin` → brak Dashboard | ✅ `e2e/library.spec.ts` scenariusz 2 |
| E2E: USER → `/admin/import` | ✅ |
| E2E: USER → `/admin/gry` | ✅ |
| Unit: layout `requireStaffFromDb` | ✅ `admin-access.unit.test.ts` |
| Unit: API export ADMIN | ✅ |
| Unit: `isBlocked` przy logowaniu | ✅ |

### Ryzyko resztkowe (akceptowalne na ETAP 0)

- Middleware przepuszcza USER do layoutu — **layout blokuje przed renderem danych** (zgodne z preferowanym modelem „wspólny layout”).
- Brak osobnego `requireStaff()` na stronach rezerwacji/wypożyczeń — **layout wystarcza** w App Router.

**Dodatkowe zmiany kodu:** **NIE wymagane.**

---

## 2. Identyfikacja bazy

| Pole | Wartość |
|------|---------|
| Provider | Neon PostgreSQL |
| Host (pooler) | `ep-dawn-mountain-ab5aadss-pooler.eu-west-2.aws.neon.tech` |
| Nazwa bazy | `neondb` |
| Neon project / branch | **Nieustalone automatycznie** — dopasuj host w Neon Console |
| Aktywne gry w audycie | **509** (= prod hero) |
| Egzemplarze | 493 (prod hero: 487 — niewielka różnica czasowa) |
| Zgodność z prod backend | Sekrety `DATABASE_URL`/`DIRECT_URL` w Firebase Secret Manager powinny wskazywać ten sam Neon |

**Poziom pewności:** **Prawdopodobne** (509 gier = silny wskaźnik tej samej bazy co produkcja).

### Ręczna weryfikacja właściciela

1. **Firebase Console** → App Hosting → `bookshelf` → Environment → sprawdź czy secret `DATABASE_URL` zawiera host `ep-dawn-mountain-ab5aadss` (bez kopiowania pełnego URL do czatu).
2. **Neon Console** → projekt → Branches → branch produkcyjny → Connection string host = ten sam endpoint pooler.

---

## 3. Konta seed i ADMIN

### Prawdziwe konto ADMIN

| Email | Rola | Aktywne | Utworzono |
|-------|------|---------|-----------|
| **ajvens@gmail.com** | ADMIN | TAK | 2026-06-15 |

✅ **Istnieje prawdziwe konto ADMIN** — wdrożenie **nie blokuje** dezaktywacja `admin@example.com` (po Twojej zgodzie).

### Konta @example.com

| Email | Rola | Aktywne | Utworzono | Ostatnie LOGIN (audit) | Rezerw. aktywne | Rezerw. łącznie | Wypoż. aktywne | Wypoż. łącznie | Audit |
|-------|------|---------|-----------|------------------------|-----------------|------------------|----------------|----------------|-------|
| admin@example.com | ADMIN | TAK | 2026-06-06 | brak | 0 | 0 | 0 | 0 | 61 |
| bibliotekarz@example.com | LIBRARIAN | TAK | 2026-06-06 | 2026-06-06 | 0 | 0 | 0 | 0 | 1 |
| user@example.com | USER | TAK | 2026-06-06 | brak | **1** | 2 | 0 | 1 | 0 |

### Rekomendacje (bez wykonania)

| Konto | Rekomendacja |
|-------|--------------|
| admin@example.com | **Dezaktywować później** (`isBlocked=true`) po wdrożeniu ETAP 0 i potwierdzeniu logowania `ajvens@gmail.com` |
| bibliotekarz@example.com | **Dezaktywować później** — brak aktywnych operacji |
| user@example.com | **Pozostawić tymczasowo** — 1 aktywna rezerwacja; po anulowaniu/zakończeniu → dezaktywacja |

### `isBlocked` przy logowaniu

✅ Sprawdzane w `loginLocal()` i `getActorFromDb()` — dezaktywacja zadziała.

---

## 4. Wdrożenie App Hosting

| Parametr | Wartość |
|----------|---------|
| Backend ID | `bookshelf` |
| URL prod | `https://bookshelf--bibl-2c364.europe-west4.hosted.app` |
| Projekt Firebase | `bibl-2c364` (z URL) |
| Region | `europe-west4` |
| Repo GitHub | `https://github.com/Ajvens89/biblioteka.git` |
| CLI backends:list | Kolumna Repository **pusta** — **nie potwierdza** auto-deploy z GitHub |

### Metoda wdrożenia (do potwierdzenia w Firebase Console)

**Scenariusz A (GitHub rollout)** — opisany w `docs/FIREBASE-WDROZENIE.md`:
1. Merge `security/stage-0` → `master` (live branch)
2. Push → automatyczny rollout **lub** Console → Create rollout

**Scenariusz B (CLI local source)**:
```bash
firebase deploy --only apphosting:bookshelf
```

**Rekomendacja:** Sprawdź w Firebase Console → App Hosting → `bookshelf` → **Git repository connected?**
- **TAK** → użyj merge + push (nie przypadkowy local deploy)
- **NIE** → `firebase deploy --only apphosting:bookshelf` z gałęzi `security/stage-0` po merge/checkout

**Obecny prod rollout:** ostatnia aktualizacja backendu **2026-06-16** (CLI).

**Commit do wdrożenia:** gałąź `security/stage-0` — **ETAP 0 security nie jest jeszcze na `master`** (HEAD master: `ec1b678` bez poprawek SEC).

---

## 5. Checklist snapshot / rollback

- [ ] Neon: snapshot brancha prod → zapisz **czas UTC**
- [ ] Neon: potwierdź branch name w Console
- [ ] Firebase: zapisz **obecny rollout ID** (Console → Rollouts)
- [ ] Git: zapisz **commit SHA prod** = obecny deployed (sprawdź w rollout details)
- [ ] Git: commit ETAP 0 SHA po merge
- [ ] Osoba zatwierdzająca: właściciel aplikacji
- [ ] Rollback dostępny: poprzedni rollout z 2026-06-16+

**Restore bazy:** nie wykonano (zgodnie z instrukcją).

---

## 6. Testy przedwdrożeniowe

| Komenda | Wynik |
|---------|-------|
| `npm run test:unit` | **116/116** ✅ |
| `npm run build` | **Sukces** ✅ |
| `npx tsc --noEmit` | ⚠️ 5 błędów w **istniejących** testach (NODE_ENV read-only, mock) — **poza ETAP 0**, build OK |
| `npm run lint` | 4× prefer-const poza ETAP 0 — **nie blokuje** |

### Potwierdzenie security ETAP 0

| Punkt | Status |
|-------|--------|
| USER nie może użyć override | ✅ kod + testy |
| USER nie wywoła admin maintenance | ✅ requireActorAdmin |
| USER nie odczyta /admin | ✅ layout + E2E |
| Open redirect zablokowany | ✅ 12 testów redirect |
| Hasła testowe niewidoczne na prod | ✅ auth-mode-banner |
| Seed zablokowany na prod | ✅ assertSeedAllowed |

---

## 7. Ocena końcowa

### **GOTOWE WARUNKOWO**

Warunki przed wdrożeniem:

1. ✅ Merge i deploy gałęzi `security/stage-0` (ETAP 0 **nie jest** jeszcze na master)
2. ✅ Snapshot Neon przed deployem
3. ✅ Potwierdzenie metody deploy (GitHub vs CLI) w Firebase Console
4. ✅ Potwierdzenie że `ajvens@gmail.com` loguje się na prod po deployu
5. ⏳ Plan dezaktywacji kont seed — **po** wdrożeniu, z osobną zgodą
6. ⏳ `user@example.com` — najpierw zamknąć aktywną rezerwację lub zostawić

**Nie wdrażaj** dopóki ETAP 0 security nie zostanie zmergowany — obecny prod **nie zawiera** poprawek SEC-001/002/003.
