# Bezpieczeństwo

Checklist przed wdrożeniem: **[SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md)**.

## Autoryzacja

- **Źródło prawdy ról:** tabela `profiles` w PostgreSQL.
- Server Actions używają `getActorFromDb()` / `requireActor*` (`src/lib/auth/actor.ts`) — rola pobierana przy każdej mutacji.
- Panel `/admin`: `requireStaffFromDb()` w layoucie + middleware (obecność sesji).
- Użytkownik może anulować **tylko własną** rezerwację (chyba że staff).

## Hasła (local)

- **bcrypt**, 12 rund — `src/lib/auth/password.ts`.
- Brak SHA-256 / MD5 / plaintext.

## Sesja (local)

- Cookie podpisane **HMAC-SHA256** (`AUTH_SECRET`).
- Porównanie podpisu: stały czas (`timingSafeEqualHex`).
- Brak e-maila, roli ani hasła w cookie.

## Produkcja

| Warunek | Zachowanie |
|---------|------------|
| `NODE_ENV=production` + `AUTH_PROVIDER=local` | **Blokada startu** bez `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` |
| `AUTH_PROVIDER` nieustawione + klucze Supabase | Wymuszone `supabase` |
| `AUTH_SECRET` < 32 znaki w prod | Błąd przy podpisywaniu cookie |

Implementacja: `src/lib/auth/production-guard.ts`, wywołanie w `src/instrumentation.ts` przy starcie serwera (nie podczas `next build`).

## Server Actions — checklist

| Akcja | Zod | Auth | Rola | Właściciel | Audit |
|-------|-----|------|------|------------|-------|
| `createReservation` | ✅ UUID | ✅ | user/admin override | — | ✅ |
| `cancelReservation` | ✅ | ✅ | owner/staff | ✅ | ✅ |
| `approveReservation` | ✅ | ✅ | staff | — | ✅ |
| `markReadyForPickup` | ✅ | ✅ | staff | — | ✅ |
| `issueLoanFromReservation` | ✅ | ✅ | staff | — | ✅ |
| `returnLoan` | ✅ | ✅ | staff | — | ✅ |
| `createGame` / `updateGame` | ✅ gameSchema | ✅ | admin | — | ✅ |
| `createCopy` / `updateCopy` | ✅ copySchema | ✅ | staff | — | ✅ |
| `updateCopyStatus` | ✅ | ✅ | staff | — | ✅ |
| `updateUserRole` | ✅ | ✅ | admin | self-lock | ✅ |

## Transakcje

- **Rezerwacja:** wybór `AVAILABLE` copy **wewnątrz** `$transaction`, `updateMany` z warunkiem statusu (ochrona przed race).
- **Wydanie:** `updateMany` na copy `RESERVED|AVAILABLE` → `BORROWED`, loan + reservation w jednej transakcji.
- **Zwrot:** loan + copy + reservation w `$transaction`.

## E-mail

Bez `RESEND_API_KEY` — tylko log + wpis w `notifications` (brak wysyłki „na niby” do użytkownika).

## Zgłaszanie

Problemy bezpieczeństwa: kontakt fundacji (adres w ustawieniach aplikacji / README).
