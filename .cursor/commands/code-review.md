# code-review

## Cel

Przeprowadzić **strukturalny code review** bieżących zmian (branch / uncommitted / ostatni commit) — jakość, zgodność z konwencjami projektu, ryzyka — z listą uwag P0–P3 i opcjonalnymi poprawkami.

## Zakres działania

- Diff: `git diff`, `git diff --staged`, ostatnie N commitów
- Konwencje: Server Components vs Client, Server Actions, Prisma tylko server-side
- Typy: Zod validations w `src/lib/validations/`
- Bezpieczeństwo w diff (auth guards, SQL injection via Prisma — OK, ale raw queries?)
- Testy — czy zmiana ma pokrycie
- Performance — unnecessary re-fetch, brak cache
- i18n/copy PL
- Zgodność z `.cursor/rules/` (np. add-games-workflow)

**Poza zakresem:** pełny audyt całego repo (→ `audit-project`); automatyczny merge.

## Kroki

1. **Zbierz diff** — `git status`, `git log -5`, `git diff main...HEAD` (lub master).
2. **Kontekst** — jaki problem rozwiązuje zmiana; czy scope jest minimalny.
3. **Architektura** — czy logika nie weszła do client bundle; czy typy client-safe (`*.types.ts`).
4. **Poprawność** — edge cases: pusty EAN, brak okładki, 0 egzemplarzy, race rezerwacji.
5. **Styl** — nazewnictwo, spójność z sąsiednimi plikami; brak over-engineering.
6. **Testy** — brakujące unit/E2E dla nowych `data-testid` lub API.
7. **Raport** — format:
   - **P0** — musi być naprawione przed merge
   - **P1** — powinno
   - **P2** — nice to have
   - **P3** — nit
8. **Opcjonalnie** — napraw P0/P1 jeśli użytkownik tego chce w tej samej sesji.

## Zasady bezpieczeństwa

- Review **nie commituje** bez prośby.
- Nie ujawniaj sekretów znalezionych w diff — ostrzeż użytkownika o usunięciu z repo.
- Nie sugeruj force push / amend bez zgody.
- Szanuj regułę użytkownika: minimal scope, no drive-by refactors.

## Kryteria akceptacji

- Każda uwaga ma: plik, linia (przybliżona), problem, sugestia.
- Ocena ogólna: **approve / approve with nits / request changes**.
- P0 = 0 przed rekomendowanym merge/deploy.
- Jeśli wprowadzono poprawki po review — testy poniżej green.

## Weryfikacja po ewentualnych poprawkach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Gdy diff dotyka flow użytkownika: `npm run test:e2e`.
