# Migracje Prisma

## Pierwsza migracja (`20250603120000_init`)

Wygenerowana z aktualnego `schema.prisma` poleceniem:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script -o prisma/migrations/20250603120000_init/migration.sql
```

Jeśli masz już bazę zsynchronizowaną przez `db push`, na staging możesz:

```bash
npx prisma migrate resolve --applied 20250603120000_init
npm run db:migrate:deploy
```

albo na **pustej** bazie staging:

```bash
npm run db:migrate:deploy
```

## Lokalnie (dev)

- Szybko: `npx prisma db push`
- Z historią: `npm run db:migrate` → `npx prisma migrate dev --name nazwa_zmiany`

## Staging / produkcja

```bash
npm run db:migrate:deploy
```

Wymaga `DATABASE_URL` (pooler) i `DIRECT_URL` (bez pgbouncer) w `.env`.
