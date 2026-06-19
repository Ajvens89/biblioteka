# deslop

## Cel

Usunąć **„AI slop” i zbędny szum** z kodu i copy — nadmiarowe abstrakcje, puste komentarze, duplikaty, przesadne error handling, generyczne teksty — bez utraty czytelności dla człowieka.

## Zakres działania

- Nowe i niedawno dotknięte pliki w `src/components/`, `src/lib/`, `src/app/`
- Komentarze — zostaw tylko non-obvious business logic
- Helpery 1-liniowe używane raz — inline
- Copy UI — polskie, konkretne, bez korpo-fluff („Witamy w naszej innowacyjnej platformie…”)
- Nadmierne typy / generics bez potrzeby
- Martwy kod, nieużywane exporty, duplikaty logiki suggest/toolbar
- `console.log` debug pozostawione w produkcji

**Poza zakresem:** architekturalny rewrite, zmiana API, usuwanie funkcji używanych w adminie.

## Kroki

1. **Skan diff** — `git diff` / ostatnie commity; skup się na plikach z ostatniej sesji agenta.
2. **Komentarze** — usuń oczywiste (`// fetch data`, `// return result`).
3. **Abstrakcje** — scal mikro-helpery; nie twórz nowych plików `utils2.ts`.
4. **Copy** — skróć empty states, toastów, opisów sekcji do treści merytorycznej (PL).
5. **Importy** — usuń unused; uporządkuj według konwencji projektu.
6. **Testy** — nie usuwaj testów; usuń redundantne asserty „assert true”.
7. **Spójność** — jeden styl nazewnictwa w obrębie modułu (catalog vs games).
8. **Podsumowanie** — lista usuniętego szumu (linie −X).

## Zasady bezpieczeństwa

- **Minimalny diff** — nie „czyść cały projekt” w jednym PR.
- Nie usuwaj komentarzy o bezpieczeństwie, rate limit, EAN vs barcode.
- Nie usuwaj `data-testid`, error boundaries, Sentry hooks.
- Nie zmieniaj zachowania — tylko redukcja szumu; jeśli niepewne, zostaw.
- Nie commituj bez prośby użytkownika.

## Kryteria akceptacji

- Brak oczywistych komentarzy-narracji w zmienionych plikach.
- Brak dead code w dotkniętych modułach (potwierdzone grep/IDE).
- Copy PL krótsze i równie jasne jak wcześniej.
- Wszystkie testy i build — pass.
- Diff reviewable (< ~300 linii netto, chyba że user prosi o szerszy cleanup).

## Weryfikacja po zmianach

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
```

Jeśli dotykano copy w flow użytkownika: `npm run test:e2e` (katalog, empty state, rezerwacja).
