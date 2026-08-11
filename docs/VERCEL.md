# Produkcja na Vercel Hobby

**URL:** https://biblioteka-seven.vercel.app  
**Projekt:** `biblioteka-s-projects/biblioteka`  
**Baza:** Neon PostgreSQL (te same `DATABASE_URL` / `DIRECT_URL` co wcześniej na Firebase)  
**Auth:** `AUTH_PROVIDER=local` + `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true`

## Deploy

Push na `master` (gdy Git jest podłączony w Vercel) albo:

```powershell
node scripts/vercel-run.mjs deploy --prod --yes
```

(`vercel-run.mjs` omija bug Windows: hostname z polskimi znakami psuje User-Agent CLI.)

## Env

Ustawione w Vercel → Project → Settings → Environment Variables (Production + Preview).  
Aktualizacja z lokalnego `.env`:

```powershell
node scripts/push-vercel-env.mjs
```

## Dlaczego nie Firebase App Hosting

- Wymaga Blaze (płatna karta) — na Spark dostajesz „Backend Not Found”.
- `minInstances: 1` trzyma Cloud Run 24/7 → rachunek rzędu dziesiątek zł/mies.
- Vercel Hobby przy małym ruchu biblioteki ≈ 0 zł.

## Firebase

Może zostać na planie Spark (Storage / stare reguły). Backend App Hosting `bookshelf` nie jest potrzebny — usuń w Firebase Console, jeśli nadal wisi.
