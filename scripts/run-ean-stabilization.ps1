# Pełna weryfikacja modułu EAN (wymaga PostgreSQL)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "=== prisma validate ==="
npx prisma validate
Write-Host "=== prisma db push ==="
npx prisma db push
Write-Host "=== db:seed ==="
npm run db:seed
Write-Host "=== import dry-run ==="
npm run import:products -- --dry-run
Write-Host "=== import ==="
npm run import:products
Write-Host "=== audit:ean ==="
npm run audit:ean
Write-Host "=== verify:ean ==="
npm run verify:ean
Write-Host "=== verify:products-import ==="
npm run verify:products-import
Write-Host "=== verify:flow ==="
npm run verify:flow
Write-Host "=== verify:race ==="
npm run verify:race
Write-Host "=== lint ==="
npm run lint
Write-Host "=== test:unit ==="
npm run test:unit
Write-Host "=== test:e2e ==="
npm run test:e2e
Write-Host "=== build ==="
npm run build
Write-Host "`n=== GOTOWE ==="
