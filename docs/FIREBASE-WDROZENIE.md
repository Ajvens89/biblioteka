# Wdrożenie na Firebase — krok po kroku

Przewodnik dla osób, które **wolą Firebase** zamiast Vercel + Supabase.  
Aplikacja to **Next.js** — na Firebase używamy **App Hosting** (oficjalne, GA od 2025).

> **Ważne:** Firebase **nie ma** bazy PostgreSQL. Dane gier nadal muszą mieszkać w Postgresie gdzieś w chmurze.  
> Poniżej używamy **Neon** — to tylko „dysk na dane”: zakładasz konto, kopiujesz jeden URL, wklejasz w Firebase. **Nie musisz się uczyć Neon** jak panelu admina.

---

## Co dostaniesz na końcu

- Adres typu `https://twoja-biblioteka--xxxxx.web.app`
- Automatyczny deploy po pushu na GitHub
- Ten sam projekt Google co klucze API (łatwiej ogarnąć Custom Search)

---

## Wymagania

1. Konto [Firebase](https://console.firebase.google.com/) (to samo co Google Cloud z kluczem API)
2. Konto [GitHub](https://github.com/) — kod musi być w repozytorium
3. Plan **Blaze** (płatność za użycie) — App Hosting tego wymaga; mały ruch biblioteki = grosze

---

## Krok 1 — Kod na GitHub

Jeśli projektu jeszcze nie ma na GitHub:

```powershell
cd "ścieżka\do\biblioteka"
git init
git add .
git commit -m "Biblioteka — start Firebase"
```

Utwórz puste repo na GitHub i:

```powershell
git remote add origin https://github.com/TWOJ_USER/biblioteka.git
git branch -M main
git push -u origin main
```

---

## Krok 2 — Baza danych (Neon, ~5 min)

1. Wejdź na [neon.tech](https://neon.tech) → **Sign up** (możesz przez Google).
2. **New project** → region **EU (Frankfurt)**.
3. Skopiuj **Connection string** (PostgreSQL).
4. Wklej go w notatniku jako **dwa** wpisy (oba takie same na start):

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

Na końcu URL dodaj `?sslmode=require` jeśli go nie ma.

---

## Krok 3 — Przygotuj bazę (jednorazowo, z komputera)

W pliku `.env` lokalnie ustaw `DATABASE_URL` i `DIRECT_URL` na Neon (jak wyżej), potem:

```powershell
npm install
npm run db:migrate:deploy
npm run db:seed
npm run db:ping
```

Jeśli `db:ping` mówi OK — baza gotowa.

---

## Krok 4 — Firebase App Hosting

1. [Firebase Console](https://console.firebase.google.com/) → wybierz projekt (ten sam co klucze Google).
2. Menu **Hosting & Serverless** → **App Hosting** → **Get started**.
3. Jeśli prosi o **Blaze** — włącz (karta, limit budżetu możesz ustawić np. 5–10 €).
4. **Region:** `europe-west4` (Belgia) lub `europe-west1`.
5. **Połącz GitHub** → wybierz repo `biblioteka`.
6. **Branch:** `main`
7. **Root directory:** `/` (katalog z `package.json`)
8. Nazwa backendu np. `biblioteka`
9. **Finish and deploy**

Pierwszy build może **paść** — to normalne, brakuje zmiennych. Idź do kroku 5.

---

## Krok 5 — Zmienne środowiskowe w Firebase

1. App Hosting → twój backend → **Settings** → **Environment**
2. Otwórz plik [`.env.firebase.example`](../.env.firebase.example) w projekcie
3. Uzupełnij wartości (Neon URL, losowy `AUTH_SECRET`, docelowy URL aplikacji)
4. **Skopiuj cały blok** `KEY=value` i wklej w formularz Firebase (przyjmuje wiele linii naraz)
5. **Save** → **Create rollout** (nowy deploy)

| Zmienna | Co wpisać |
|---------|-----------|
| `DATABASE_URL` | URL z Neon |
| `DIRECT_URL` | ten sam URL |
| `AUTH_PROVIDER` | `local` (najprościej na start) |
| `AUTH_SECRET` | losowy ciąg ≥32 znaków |
| `ALLOW_LOCAL_AUTH_IN_PRODUCTION` | `true` |
| `APP_URL` | URL z App Hosting po pierwszym udanym deployu |
| `NEXT_PUBLIC_APP_URL` | jak `APP_URL` |
| `GOOGLE_CSE_*` | jeśli masz serwerowy klucz + `cx` |

Konta po seedzie: `admin@example.com` / `Admin123!`

---

## Krok 6 — Sprawdzenie

Po zielonym deployu:

1. Otwórz URL z App Hosting
2. Zaloguj się jako admin
3. Sprawdź katalog gier

Migracje po zmianach w `prisma/schema` — z komputera z Neon w `.env`:

```powershell
npm run db:migrate:deploy
```

Potem w Firebase: **Create rollout** (albo push na `main`).

---

## Okładki i klucz Google

- **Firebase Browser key** ≠ klucz do backfillu. W konsoli Google utwórz **osobny klucz API** z włączonym **Custom Search API** (bez ograniczenia Referer).
- Masowy import okładek nadal uruchamiasz **lokalnie**:

```powershell
npm run backfill:covers:all
```

(baza wskazuje na Neon w `.env` lokalnym)

Opcjonalnie później: **Firebase Storage** na pliki okładek — to osobna funkcja do dodania.

---

## Koszty (orientacyjnie)

| Usługa | Mała biblioteka |
|--------|-----------------|
| Neon free | 0 zł (limit storage/compute) |
| Firebase App Hosting | kilka €/mies. przy małym ruchu |
| Google CSE | ~100 zapytań/dzień gratis |

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|-------------|
| Build failed — Prisma | Sprawdź czy `npm run build` działa lokalnie |
| 500 po deployu | Brak `DATABASE_URL` lub zły URL Neon |
| Nie mogę się zalogować | `AUTH_SECRET` + `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` |
| Google CSE 403 | Nowy klucz serwerowy, nie Firebase Browser key |

---

## Firebase CLI (opcjonalnie)

```powershell
npm install -g firebase-tools
firebase login
copy .firebaserc.example .firebaserc
# Edytuj .firebaserc — wstaw swój project ID
firebase apphosting:backends:list
```

---

## Dlaczego nie „czysty” Firebase?

| Element | Firebase natywnie | Ten projekt |
|---------|-------------------|-------------|
| Hosting Next.js | App Hosting ✅ | ✅ |
| Baza relacyjna | Firestore ❌ (inny model) | PostgreSQL + Prisma |
| Auth | Firebase Auth | `local` lub później Firebase Auth |

Przepisanie na Firestore = nowa aplikacja. **App Hosting + Neon** to najmniej bólu.

---

## Następne kroki (gdy już działa)

- Własna domena w App Hosting → **Settings → Domains**
- Firebase Auth zamiast `local` (większa zmiana w kodzie)
- Firebase Storage na okładki
- Budżet alert w Google Cloud Console
