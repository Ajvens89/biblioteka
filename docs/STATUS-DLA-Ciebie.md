# Status — co jest zrobione za Ciebie

**Data:** 2026-06-06

## Działa / zrobione

| Co | Gdzie |
|----|--------|
| Kod na GitHub | https://github.com/Ajvens89/biblioteka |
| Deploy Firebase | https://bookshelf--bibl-2c364.europe-west4.hosted.app |
| Projekt Firebase | `bibl-2c364` (konsola: [link](https://console.firebase.google.com/project/bibl-2c364/apphosting)) |
| Konfiguracja | `firebase.json`, `apphosting.yaml`, `.firebaserc` |
| Logowanie (produkcja) | `AUTH_PROVIDER=local`, konta z seeda |

## Jedna rzecz, której nie da się zrobić bez Ciebie

**Baza danych w chmurze** — aplikacja potrzebuje PostgreSQL. Bez tego strona pokazuje pusty katalog (albo błąd).

### Najprostsza opcja (5 minut, bez uczenia się paneli)

1. Otwórz: https://console.firebase.google.com/project/bibl-2c364/apphosting  
2. Kliknij backend **bookshelf** → **Settings** → **Environment**  
3. Dodaj zmienne (wartości z Neon — patrz niżej):

```
DATABASE_URL=postgresql://...?sslmode=require
DIRECT_URL=postgresql://...?sslmode=require
```

4. **Save** → **Create rollout**

### Skąd wziąć DATABASE_URL (Neon)

1. https://neon.tech → zaloguj przez Google (ten sam co Firebase)  
2. **New project** → region EU  
3. Skopiuj **Connection string** → wklej do Firebase (jak wyżej)

### Potem napisz mi: „baza gotowa”

Uruchomię migracje i seed z Twojego komputera — pojawią się gry i konta admina.

---

## Konta po seedzie

| Rola | E-mail | Hasło |
|------|--------|-------|
| Admin | admin@example.com | Admin123! |

---

## Komendy na przyszłość (ja mogę je odpalać)

```powershell
firebase deploy --only apphosting:bookshelf
npm run backfill:covers:all
```
