# Catalog-only release — November 2026

The public site is a read-only catalog searchable by title or publisher. Visitors need no account. Publisher selection and pagination can be combined with text search. Public cards and details show metadata, covers and descriptions, with no stock, borrowing or reservation controls. New games require no inventory records and are eligible for home previews.

The owner signs in at `/login` and uses `/admin/gry/nowa` to add games manually or with EAN lookup. Manual add/edit supports creating or reusing a publisher. Administration requires an active ADMIN profile. Public links open the owner panel outside the WordPress frame. Existing passwords and database history are retained; the versioned expiring session format requires a fresh sign-in.

Legacy circulation screens redirect to the catalog/game list. Their server action entrypoints return disabled/empty results before database or notification work. Cron endpoints retain secret authentication but skip circulation jobs. No database migration, destructive cleanup, production test fixtures or mail are part of this release.

## Three review rounds

1. Authentication expiry, signed sessions, safe query/JSON-LD output, atomic state transitions and password-reset claims.
2. Pagination bounds, mobile layout, keyboard search, URL normalization and scheduled/update race checks.
3. Extension/return consistency, import/export bundle isolation, iframe policy/viewport handling and accessibility. The final user clarification replaced all public circulation UX with catalog-only presentation and disabled legacy entrypoints.

## Verification

- 254 automated unit tests passed; full TypeScript passed.
- Scoped source/E2E lint: 0 errors, 9 existing unused-variable warnings.
- 48 local ORM/SQL circulation regression checks and 11 catalog title/publisher checks passed. The isolated PrismaDev/PGlite schema uses one connection; this does not constitute multi-connection PostgreSQL stress testing.
- Production build passed. UI verification uses fictional local data before live read-only checks.
- Dependency updates include Next 16.4.5, Sentry 10.78.0 and Zod 4.6.7. Production npm audit: 0 critical, 0 high, 5 moderate entries in build-tool dependency chains. Compatible patched glob13/minimatch10 releases were unavailable; no forced major overrides were introduced.
- Public reads no longer fetch copies or reservation contact records. Private pages deny framing; public frames allow only the two Foundation website origins.

## Publication and recovery

The existing Vercel project remains the application host; the OVH WordPress page `/nasze-gry/` embeds `/katalog`. The deployment directory contains the reviewed WordPress page and three narrowly scoped MU assets. The operator takes a page/asset snapshot before updating page4497, preserves its template/title, checks concurrent edits and removes the temporary gateway.

The previous Vercel deployment is `dpl_Cq1JV6bvErESBRQgbohM1UxP2kJM`. WordPress snapshots and operational verification are stored outside the repository in the sibling `biblioteka-audit-evidence` folder. Production database contents are never reset by this process.
