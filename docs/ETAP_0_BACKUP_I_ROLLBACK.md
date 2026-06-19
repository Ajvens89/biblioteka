# ETAP 0 — Backup i rollback

**Data:** 2026-06-03  
**Gałąź:** `security/stage-0`  
**Status:** Przed wdrożeniem — wykonaj ręcznie przed merge/deploy

---

## 1. Kopia zapasowa bazy (Neon PostgreSQL)

### Wykonanie
1. Zaloguj się do [Neon Console](https://console.neon.tech) → projekt biblioteki.
2. **Branches** → branch produkcyjny → **Create snapshot** / **Restore point**.
3. Zanotuj nazwę snapshotu i czas UTC.

### Weryfikacja kopii
- Snapshot widoczny na liście z timestampem sprzed wdrożenia.
- Opcjonalnie: tymczasowy branch ze snapshota → `npm run db:ping` z `DATABASE_URL` brancha testowego.

### Czas trwania
~2–5 minut (zależnie od panelu Neon).

---

## 2. Sekrety — rotacja (jeśli potrzebna)

| Zmienna | Lokalizacja prod | Rotacja w ETAP 0? |
|---------|------------------|-------------------|
| `AUTH_SECRET` | Firebase Secret Manager | **Nie** — kod nie zmienia mechanizmu HMAC |
| `DATABASE_URL` | Secret Manager | **Nie** |
| `DIRECT_URL` | Secret Manager | **Nie** |
| `RESEND_API_KEY` | Secret Manager (jeśli ustawiony) | **Nie** |
| `GOOGLE_GEMINI_API_KEY` | Secret Manager | **Nie** |

**Uwaga:** Jeśli audyt Git wykryje wyciek sekretu w historii — rotacja **przed** wdrożeniem według instrukcji w `ETAP_0_IMPLEMENTACJA.md`.

---

## 3. Rollback wdrożenia Firebase App Hosting

### Szybki rollback (preferowany)
1. Firebase Console → **App Hosting** → backend `bookshelf`.
2. **Rollouts** / **Revisions** → wybierz poprzedni udany build.
3. **Rollback** / ustaw jako aktywny.

### CLI (alternatywa)
```bash
firebase apphosting:rollouts:list --backend bookshelf
# Wybierz poprzedni rollout ID i przywróć według dokumentacji Firebase
```

### Czas propagacji
~3–10 minut.

---

## 4. Rollback kodu (Git)

```bash
git checkout master
# lub revert merge commit ETAP 0:
git revert <commit-sha> --no-edit
```

Gałąź `security/stage-0` pozostaje do analizy.

---

## 5. Weryfikacja po rollbacku

| Test | Oczekiwany wynik |
|------|------------------|
| Strona główna `/` | 200, statystyki hero |
| `/katalog` | 200, lista gier |
| Logowanie użytkownika | Działa |
| Rezerwacja (staging) | Happy path OK |
| `/admin` jako USER | Brak dostępu |

---

## 6. Zatwierdzenie wdrożenia

| Rola | Odpowiedzialność |
|------|------------------|
| Właściciel aplikacji | Akceptacja raportu ETAP 0, decyzja o kontach seed |
| Administrator techniczny | Backup Neon, deploy Firebase |
| Bibliotekarz (opcjonalnie) | Smoke test rezerwacji po wdrożeniu |

**Nie wdrażaj bez:**
- [ ] Zatwierdzonego raportu w czacie
- [ ] Snapshotu bazy
- [ ] Przejścia testów na gałęzi `security/stage-0`

---

## 7. Czego NIE robić podczas rollbacku

- Nie uruchamiaj `db:seed` na produkcji.
- Nie usuwaj kont `@example.com` bez osobnej decyzji.
- Nie rotuj `AUTH_SECRET` bez planu wylogowania wszystkich sesji.
