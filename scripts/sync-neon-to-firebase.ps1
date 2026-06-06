# Po ustawieniu DATABASE_URL i DIRECT_URL w .env — synchronizuje sekrety Firebase.
#   .\scripts\sync-neon-to-firebase.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function Get-EnvValue([string]$key) {
  $line = Get-Content .env | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
  if (-not $line) { throw "Brak $key w .env" }
  return ($line -replace "^$key=", "").Trim('"')
}

$db = Get-EnvValue "DATABASE_URL"
$direct = Get-EnvValue "DIRECT_URL"

Set-Content -Path .tmp-db-url.txt -Value $db -NoNewline
Set-Content -Path .tmp-direct-url.txt -Value $direct -NoNewline

firebase apphosting:secrets:set DATABASE_URL --project bibl-2c364 --data-file .tmp-db-url.txt --force --non-interactive
firebase apphosting:secrets:set DIRECT_URL --project bibl-2c364 --data-file .tmp-direct-url.txt --force --non-interactive
firebase apphosting:secrets:grantaccess DATABASE_URL --backend bookshelf --project bibl-2c364
firebase apphosting:secrets:grantaccess DIRECT_URL --backend bookshelf --project bibl-2c364

Remove-Item .tmp-db-url.txt, .tmp-direct-url.txt -ErrorAction SilentlyContinue
Write-Host "OK - uruchom: firebase deploy --only apphosting:bookshelf"
