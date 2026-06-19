# ETAP 0 — Implementacja zabezpieczeń

**Data:** 2026-06-03  
**Gałąź:** `security/stage-0`  
**Wdrożenie:** **NIE** — oczekuje na zatwierdzenie

---

## Zakres plików SEC-001 / SEC-002 / SEC-003

| ID | Pliki | Server Actions / routes | Serwisy | Modele Prisma |
|----|-------|-------------------------|---------|---------------|
| SEC-001 | `src/lib/actions/reservations.ts`, `src/lib/validations/ids.ts`, `src/lib/services/reservations.ts`, `src/components/games/reserve-button.tsx` (bez zmian — już bez override) | `createReservation`, **nowe:** `createReservationAsStaff` | `assertCanUserReserve`, **nowe:** `assertNoActiveReservationForGame`, `reserveGame` | `Reservation`, `GameCopy`, `Profile` |
| SEC-002 | `src/lib/actions/loans.ts` | `markOverdueLoans`, `sendReturnReminders` | — (logika inline) | `Loan`, `Notification` |
| SEC-003 | `src/app/api/auth/callback/route.ts`, `src/lib/auth/redirect.ts` | `GET /api/auth/callback` | `safeRedirectPath` | — |

**Helpery auth (istniejące, wykorzystane):** `src/lib/auth/actor.ts` — `requireActor`, `requireActorStaff`, `requireActorAdmin`.

---

## Zmienione / nowe pliki

### Kod aplikacji
| Plik | Zmiana |
|------|--------|
| `src/lib/actions/reservations.ts` | Usunięto `override`; dodano `createReservationAsStaff` |
| `src/lib/actions/loans.ts` | Auth ADMIN + `ActionResult` + audit batch |
| `src/app/api/auth/callback/route.ts` | `safeRedirectPath` + `new URL()` |
| `src/lib/auth/redirect.ts` | Rozszerzona walidacja (allowlist + prefiksy) |
| `src/lib/validations/ids.ts` | `createReservationAsStaffSchema` |
| `src/lib/services/reservations.ts` | `assertNoActiveReservationForGame` |
| `src/lib/actions/products-import.ts` | Auth ADMIN na getterach ścieżek |
| `src/lib/actions/games-json.ts` | Auth ADMIN na `getDefaultGamesJsonPath` |
| `src/app/admin/import/page.tsx` | Obsługa `ActionResult` |
| `src/components/auth/auth-mode-banner.tsx` | Brak haseł na prod |
| `prisma/seed.ts` | `assertSeedAllowed()`, brak logowania haseł |
| `package.json` | `audit:seed-accounts`, rozszerzony `test:unit` |

### Testy
| Plik |
|------|
| `src/lib/auth/redirect.unit.test.ts` |
| `src/lib/auth/guards.unit.test.ts` |
| `src/lib/validations/reservations-security.unit.test.ts` |
| `src/lib/services/reservations-security.unit.test.ts` |
| `src/lib/actions/loans-security.unit.test.ts` |

### Skrypty
| Plik |
|------|
| `scripts/audit-seed-accounts.ts` |

### Dokumentacja
| Plik |
|------|
| `docs/ETAP_0_IMPLEMENTACJA.md` (ten plik) |
| `docs/ETAP_0_BACKUP_I_ROLLBACK.md` |
| `docs/ETAP_0_TESTY.md` |

---

## SEC-001 — Naprawa

1. **`createReservation(gameId)`** — jeden argument; nigdy nie czyta `override` z klienta.
2. **`assertCanUserReserve`** wywoływane zawsze bez override dla zwykłego użytkownika.
3. **`assertNoActiveReservationForGame`** — blokuje duplikat aktywnej rezerwacji tej samej gry.
4. **`createReservationAsStaff`** — tylko `LIBRARIAN` / `ADMIN` (`requireActorStaff`):
   - `targetUserId` z bazy (nie z ukrytego pola formularza bez walidacji),
   - `reason` min. 3 znaki,
   - `bypassLimits` opcjonalne — tylko w tej akcji,
   - audit: `{ staffOverride, reason, targetUserId, staffId, staffRole }`.
5. Rezerwacja nadal atomowa w `reserveGame` (`$transaction`).

---

## SEC-002 — Naprawa

1. `markOverdueLoans()` i `sendReturnReminders()` — **`requireActorAdmin()`** na początku.
2. Zwracają `ActionResult<{ count: number }>` zamiast gołej liczby.
3. Log audytu `loan_batch` z `operation` i `count`.
4. **Brak** publicznego endpointu cron (ETAP 1).
5. Dodatkowo (SEC-007): `getDefaultProductsPath`, `getProductsFileInfo`, `getDefaultGamesJsonPath` — wymagają ADMIN.

---

## SEC-003 — Naprawa

1. `safeRedirectPath` — allowlist + bezpieczne prefiksy (`/gry/`, `/katalog`, …).
2. Odrzuca: `//`, `\`, `@`, protokoły, `javascript:`, zewnętrzne URL, nieznane ścieżki.
3. Callback: `safeRedirectPath(next, "/moje-konto")` + `NextResponse.redirect(new URL(next, origin))`.

---

## Model autoryzacji (bez zmian architektury)

```
Cookie / Supabase session
    → getActorFromDb() → Profile.role z PostgreSQL
    → requireActor | requireActorStaff | requireActorAdmin
```

Dual-provider (local / supabase) bez migracji — jeden model `Actor`.

---

## Tabela autoryzacji Server Actions (po zmianach)

| Funkcja | Plik | Logowanie | Rola | Status |
|---------|------|-----------|------|--------|
| `createReservation` | reservations.ts | ✅ | USER+ | ✅ |
| `createReservationAsStaff` | reservations.ts | ✅ | STAFF+ | ✅ **nowe** |
| `cancelReservation` | reservations.ts | ✅ | owner lub STAFF | ✅ |
| `approveReservation` | reservations.ts | ✅ | STAFF+ | ✅ |
| `markReadyForPickup` | reservations.ts | ✅ | STAFF+ | ✅ |
| `markOverdueLoans` | loans.ts | ✅ | **ADMIN** | ✅ naprawione |
| `sendReturnReminders` | loans.ts | ✅ | **ADMIN** | ✅ naprawione |
| `issueLoanFromReservation` | loans.ts | ✅ | STAFF+ | ✅ |
| `getDefaultProductsPath` | products-import.ts | ✅ | **ADMIN** | ✅ naprawione |
| `getProductsFileInfo` | products-import.ts | ✅ | **ADMIN** | ✅ naprawione |
| `getDefaultGamesJsonPath` | games-json.ts | ✅ | **ADMIN** | ✅ naprawione |
| `GET /api/auth/callback` | callback/route.ts | publiczny | — | ✅ redirect safe |

---

## Konta seed — wynik audytu (read-only)

**Komenda:** `npm run audit:seed-accounts`  
**Baza:** podłączona przez lokalne `DATABASE_URL` (prawdopodobnie dev/staging — **zweryfikuj**, czy to prod).

| Email | ID | Rola | Zablokowany | Utworzono |
|-------|-----|------|-------------|-----------|
| admin@example.com | f565e3a9-… | ADMIN | false | 2026-06-06 |
| bibliotekarz@example.com | e5681220-… | LIBRARIAN | false | 2026-06-06 |
| user@example.com | 2f5bfad0-… | USER | false | 2026-06-06 |

**Rekomendacja:** Na **produkcji** — dezaktywować (`isBlocked=true`) lub usunąć po Twojej decyzji. **Nie wykonano automatycznie.**

**Zmiany prewencyjne w kodzie:**
- Baner logowania nie pokazuje haseł na `NODE_ENV=production`
- `prisma/seed.ts` blokuje uruchomienie na prod / neon.tech bez `SEED_FORCE=true`
- Seed nie loguje haseł do konsoli

---

## Audyt sekretów

| Element | Git tracked? | Wartość w repo? | Rotacja? |
|---------|--------------|-----------------|----------|
| `.env` | ❌ gitignore | — | — |
| `.env.local` | ❌ gitignore | — | — |
| `apphosting.yaml` | ✅ | Placeholdery build-time + referencje `secret:` | Nie |
| `AUTH_SECRET` runtime | Secret Manager | Nie w repo | Nie w ETAP 0 |
| `DATABASE_URL` runtime | Secret Manager | Nie w repo | Nie w ETAP 0 |
| `.env.example` | ✅ | Placeholdery | — |
| `prisma/seed.ts` hasła | ✅ | **Tylko w seed dev** | — |
| `e2e/constants.ts` | ✅ | Hasła testowe E2E | OK (nie prod) |
| `scripts/upload-catalog-csv.ts` | ✅ | Firebase CLI public client | Niski risk |

**Wniosek:** Brak wycieku produkcyjnych sekretów w śledzonych plikach. Placeholdery w `apphosting.yaml` są zamierzone.

---

## Decyzje wymagające właściciela

1. Czy podłączona baza z audytu seed to **produkcja**? Jeśli tak — co zrobić z 3 kontami `@example.com`?
2. Zgoda na **wdrożenie** gałęzi `security/stage-0` po backupie.
3. Czy dodać UI dla `createReservationAsStaff` w panelu admin (obecnie tylko Server Action — bezpieczne, ale niewidoczne dla bibliotekarza).

---

## Świadomie poza zakresem ETAP 0

- Rate limiting logowania (SEC-004)
- Reset hasła
- Cron jobs
- Middleware staff na `/admin`
- Security headers CSP
- Rotacja sekretów
