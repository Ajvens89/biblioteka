# security-audit

## Cel

Przeprowadzić **audyt bezpieczeństwa** aplikacji biblioteki — auth, sesje, uprawnienia admin, sekrety, API, upload/URL okładek, rate limiting — z listą ryzyk i rekomendacjami naprawy.

## Zakres działania

- Auth: `src/lib/auth/`, middleware/proxy, `AUTH_SECRET`, `AUTH_PROVIDER`, cookies sesji
- Guards: `requireAdmin`, `isStaff`, Server Actions w `src/lib/actions/`
- Admin routes: `/admin/*`, import, export JSON, EAN lookup
- API: `/api/games/suggest`, `/api/admin/*`, rate limit suggest
- Dane wejściowe: Zod validations, `normalizeEan`, SQL via Prisma
- Okładki: URL validation (`cover-fetch`, remote patterns w `next.config.ts`)
- Sekrety: `.gitignore`, `.env.example`, Firebase Secret Manager, brak kluczy w repo
- Sentry — brak PII w `captureException`
- CSRF / Server Actions — Next.js domyślne mechanizmy
- Dokumentacja: `docs/SECURITY*.md` jeśli istnieje

**Poza zakresem:** penetration test zewnętrzny, audyt infrastruktury Firebase/Google Cloud poza env aplikacji.

## Kroki

1. **Sekrety w repo** — `git log -p` grep API keys; `.env` w `.gitignore`; brak hardcoded passwords.
2. **Auth prod** — `assertProductionAuthSafe`; local auth tylko z `ALLOW_LOCAL_AUTH_IN_PRODUCTION`.
3. **Autoryzacja** — każda Server Action admin sprawdza rolę; user nie wchodzi na `/admin` (E2E scenariusz 2).
4. **IDOR** — rezerwacja/cancel tylko własnych; admin widzi wszystkie — sprawdź `where: { userId }`.
5. **Injection** — brak `eval`, `$queryRaw` bez parametrów; user input w Prisma przez typed filters.
6. **Rate limiting** — suggest API; brute force login (jeśli brak — zanotuj jako ryzyko).
7. **Open redirect** — `callback`, `returnUrl` query params.
8. **Headers** — CSP/HSTS (Firebase App Hosting defaults); czy wymagane dodatkowe.
9. **Raport** — tabela: ryzyko | severity | lokalizacja | rekomendacja | effort.
10. **Naprawy** — tylko P0/P1 za zgodą użytkownika w tej samej sesji.

## Zasady bezpieczeństwa

- **Nie eksfiltruj** sekretów do chatu — tylko „znaleziono X w pliku Y”.
- Nie uruchamiaj skanów portów ani ataków na produkcję.
- Nie zmieniaj haseł prod / Firebase secrets bez instrukcji użytkownika.
- Nie commituj plików `.env` ani raportów z tokenami.
- Po znalezieniu wycieku klucza — rekomenduj rotację, nie publikuj wartości.

## Kryteria akceptacji

- Raport obejmuje auth, admin, API, secrets, input validation.
- Każde P0 ma proponowaną ścieżkę naprawy.
- Brak krytycznych sekretów w tracked files (lub escalation do użytkownika).
- Po poprawkach — build i testy auth-related E2E pass.

## Weryfikacja po ewentualnych poprawkach

```bash
npx prisma validate
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

E2E: scenariusz 2 (user ≠ admin), brak dostępu `/admin/import`, rezerwacja user.

Opcjonalnie: `npm run verify:race` (race rezerwacji) gdy DB dostępna.
