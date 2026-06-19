# ETAP 0 — Wyniki testów

**Data:** 2026-06-03  
**Gałąź:** `security/stage-0`  
**Środowisko:** lokalne (Windows), DATABASE_URL z `.env` (nie produkcja mutowana)

---

## Uruchomione komendy

| Komenda | Wynik |
|---------|-------|
| `npm run test:unit` | **109/109 pass** (+33 nowe testy) |
| `npm run build` | **Sukces** |
| `npm run lint` | **4 errors** (prefer-const w plikach poza ETAP 0), 7 warnings |
| `npx tsc --noEmit` | Nie uruchomiono osobno — `next build` przeszedł (TypeScript OK) |
| `npm run audit:seed-accounts` | **3 konta @example.com** w podłączonej bazie (read-only) |

---

## SEC-001 — Rezerwacje

| Scenariusz | Metoda | Wynik |
|------------|--------|-------|
| Schema bez pola `override` | `reservations-security.unit.test.ts` | ✅ |
| `override=true` w service tylko dla staff path | `assertCanUserReserve` mock | ✅ |
| Limit bez override | mock → `RESERVATION_LIMIT` | ✅ |
| OVERDUE bez override | mock → `OVERDUE_LOAN` | ✅ |
| `createReservation` bez parametru override w kodzie | readFile assertions | ✅ |
| `createReservationAsStaff` wymaga reason + targetUserId | schema tests | ✅ |
| Niezalogowany → odmowa | `requireActor()` w runtime | ⚠️ wymaga E2E / integracji |
| USER nie wywoła staff action | `requireActorStaff()` | ⚠️ wymaga E2E |
| Audit staff override | metadata w `reserveGame` | ✅ kod — brak testu integracyjnego DB |

---

## SEC-002 — Operacje operacyjne

| Scenariusz | Wynik |
|------------|-------|
| `markOverdueLoans` — `requireActorAdmin` przed `prisma` | ✅ static analysis test |
| `sendReturnReminders` — `requireActorAdmin` przed `prisma` | ✅ static analysis test |
| USER wywołuje akcję | ⚠️ nie testowano runtime (brak mock sesji) |
| ADMIN wywołuje akcję | ⚠️ nie testowano runtime |
| Cron endpoint | ❌ celowo nie utworzony (ETAP 1) |

---

## SEC-003 — Open redirect

| Wejście | Oczekiwany | Wynik |
|---------|------------|-------|
| `/moje-konto` | akceptacja | ✅ |
| `/moje-rezerwacje` | akceptacja | ✅ |
| `/gry/foo#rezerwacja` | akceptacja | ✅ |
| `https://evil.example` | fallback | ✅ |
| `//evil.example` | fallback | ✅ |
| `/\@evil` / `@evil.com` | fallback | ✅ |
| `%2F%2Fevil.example` | fallback | ✅ |
| `javascript:alert(1)` | fallback | ✅ |
| `/admin/secret` | fallback | ✅ |
| OAuth callback używa `new URL(next, origin)` | ✅ kod |

---

## Auth helpers

| Test | Plik | Wynik |
|------|------|-------|
| `hasMinRole` hierarchia | `guards.unit.test.ts` | ✅ |
| `isStaff` / `isAdmin` | `guards.unit.test.ts` | ✅ |

---

## Nieprzetestowane (wymagają E2E / staging)

- Pełny flow `createReservationAsStaff` z DB + audit log
- `markOverdueLoans` jako ADMIN z prawdziwą sesją
- OAuth callback end-to-end (tryb Supabase)
- Dezaktywowane konto (`isBlocked`)
- Wygasła sesja cookie

---

## Ręczny smoke test przed wdrożeniem (checklist)

1. [ ] Zaloguj USER → zarezerwuj grę → sukces
2. [ ] DevTools: wywołaj `createReservation(id, true)` — **powinno zignorować drugi argument / nie mieć efektu bypass**
3. [ ] Zaloguj ADMIN → panel import ładuje ścieżki plików
4. [ ] Strona logowania na prod — **brak haseł testowych** w banerze
5. [ ] `/api/auth/callback?next=//evil.com` → redirect na `/moje-konto` (tylko staging Supabase)

---

## Lint — błędy poza zakresem ETAP 0

```
prefer-const w plikach niezmienianych w tym etapie (4×)
```

Nie naprawiano zgodnie z instrukcją (tylko pliki ETAP 0).
