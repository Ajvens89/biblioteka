# fix-build

## Cel

Naprawić **błędy kompilacji, builda produkcyjnego i deploya Firebase App Hosting** — tak, aby `npm run build` i rollout `firebase deploy --only apphosting` przechodziły lokalnie i w chmurze.

## Zakres działania

- `next.config.ts`, `sentry.*.config.ts`, `instrumentation.ts`
- `package.json`, `package-lock.json`, `.npmrc`, `optionalDependencies` (Linux: swc, lightningcss, tailwind oxide)
- `apphosting.yaml` — `buildCommand`, env BUILD/RUNTIME
- Importy client/server (`"use client"`, `server-only`, split typów np. `suggest-games.types.ts`)
- Prisma: `prisma generate` w build, schema vs kod
- Turbopack / NFT warnings (np. `games-json.ts` ↔ `next.config.ts`)
- TypeScript — błędy wykrywane przez `tsc` i `next build`

**Poza zakresem:** optymalizacja wydajności (→ `performance-pass`), poprawki UX/UI bez błędu builda.

## Kroki

1. **Reprodukcja** — uruchom `npm run build`; zapisz pełny stack trace.
2. **Typecheck** — `npx tsc --noEmit` — napraw błędy typów przed buildem Next.
3. **Client bundle** — szukaj importów Node (`fs`, `prisma`) w komponentach klienckich; rozdziel typy i server actions.
4. **Zależności** — `@zxing/library` jako peer `@zxing/browser`; Sentry — `withSentryConfig` tylko gdy `SENTRY_AUTH_TOKEN`.
5. **Lockfile** — po zmianie deps: `npm install --package-lock-only --ignore-scripts --platform=linux --arch=x64`; commit lock + `.npmrc`.
6. **Firebase** — jeśli błąd `lightningcss` / `@tailwindcss/oxide` na Linux: dodaj do `optionalDependencies`; w `apphosting.yaml`: `npm install && npm run build`.
7. **Prisma EPERM (Windows dev)** — to nie blokuje CI; na CI build powinien przejść po poprawnym lockfile.
8. **Weryfikacja lokalna** — powtórz build z `CI=true` i placeholder env jak w `apphosting.yaml`.
9. **Deploy** — tylko na prośbę użytkownika: `firebase deploy --only apphosting`.

## Zasady bezpieczeństwa

- Nie wyłączaj `assertProductionAuthSafe` na produkcji.
- Nie commituj `.env`, tokenów Sentry, `AUTH_SECRET`.
- Nie używaj `--legacy-peer-deps` bez `.npmrc` w repo (Firebase musi mieć ten sam behavior).
- Nie usuwaj `optionalDependencies` Linux po udanym buildzie na Windows — Cloud Build ich potrzebuje.
- Unikaj `skipLibCheck: true` globalnie jako „szybkiej łatki”.

## Kryteria akceptacji

- `npm run build` kończy się exit code 0.
- `npx tsc --noEmit` bez błędów.
- `package-lock.json` spójny z `package.json` (`npm ci --ignore-scripts` przechodzi).
- Brak nowych ostrzeżeń Sentry blokujących build (source maps opcjonalne bez tokena).
- Jeśli deploy: rollout Firebase w stanie complete.

## Weryfikacja po zmianach

```bash
npx prisma validate
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Opcjonalnie symulacja CI:

```bash
$env:CI="true"; npm run build
```

Po akceptacji użytkownika — deploy Firebase.
