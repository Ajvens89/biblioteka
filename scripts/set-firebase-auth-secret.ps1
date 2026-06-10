# Ustawia AUTH_SECRET w Firebase App Hosting z lokalnego .env
# Użycie: .\scripts\set-firebase-auth-secret.ps1
# Wymaga: firebase CLI, zalogowany projekt bibl-2c364, plik .env z sekretem (min. 32 znaki)

$ErrorActionPreference = "Stop"
$Project = "bibl-2c364"
$Backend = "bookshelf"
$SecretName = "AUTH_SECRET"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Brak pliku .env w katalogu projektu."
}

$secret = $null
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
  if ($line -match '^\s*AUTH_SECRET\s*=\s*(.+)\s*$') {
    $secret = $Matches[1].Trim().Trim('"').Trim("'")
    break
  }
}

if (-not $secret) {
  Write-Error "Brak AUTH_SECRET w .env"
}

if ($secret.Length -lt 32) {
  Write-Error "AUTH_SECRET musi mieć co najmniej 32 znaki."
}

$temp = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($temp, $secret, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Ustawiam sekret $SecretName (projekt $Project)..."
  Write-Warning "Rotacja AUTH_SECRET unieważnia istniejące sesje logowania."

  firebase apphosting:secrets:set $SecretName `
    --project $Project `
    --data-file $temp `
    --force

  Write-Host "Nadaję dostęp backendowi $Backend..."
  firebase apphosting:secrets:grantaccess $SecretName `
    --project $Project `
    --backend $Backend

  firebase apphosting:secrets:describe $SecretName --project $Project
  Write-Host "OK: sekret zapisany (dlugosc $($secret.Length) znakow). Wdróż backend po rotacji."
}
finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
