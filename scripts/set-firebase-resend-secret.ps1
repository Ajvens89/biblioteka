# Ustawia RESEND_API_KEY w Firebase Secret Manager (App Hosting + Functions).
# Użycie: dodaj RESEND_API_KEY=... do lokalnego .env (NIE commituj), potem:
#   .\scripts\set-firebase-resend-secret.ps1

$ErrorActionPreference = "Stop"
$Project = "bibl-2c364"
$Backend = "bookshelf"
$SecretName = "RESEND_API_KEY"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Brak pliku .env. Dodaj linię RESEND_API_KEY=re_..."
}

$key = $null
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
  if ($line -match '^\s*RESEND_API_KEY\s*=\s*(.+)\s*$') {
    $key = $Matches[1].Trim().Trim('"').Trim("'")
    break
  }
}

if (-not $key -or $key.Length -lt 10) {
  Write-Error "Brak RESEND_API_KEY w .env. Utwórz klucz w Resend (Sending access, domena zakatekfantastyki.pl)."
}

$temp = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($temp, $key, [System.Text.UTF8Encoding]::new($false))

  Write-Host "Ustawiam sekret $SecretName (Functions)..."
  firebase functions:secrets:set $SecretName --project $Project --data-file $temp --force

  Write-Host "Ustawiam sekret $SecretName (App Hosting)..."
  firebase apphosting:secrets:set $SecretName --project $Project --data-file $temp --force

  Write-Host "Nadaję dostęp backendowi $Backend..."
  firebase apphosting:secrets:grantaccess $SecretName --project $Project --backend $Backend

  Write-Host "OK: RESEND_API_KEY skonfigurowany (długość $($key.Length) znaków)."
}
finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
