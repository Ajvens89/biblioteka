# Ustawia GOOGLE_GEMINI_API_KEY w Firebase App Hosting z lokalnego .env
# Użycie: .\scripts\set-firebase-gemini-secret.ps1
# Wymaga: firebase CLI, zalogowany projekt bibl-2c364, plik .env z kluczem

$ErrorActionPreference = "Stop"
$Project = "bibl-2c364"
$Backend = "bookshelf"
$SecretName = "GOOGLE_GEMINI_API_KEY"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvFile = Join-Path $Root ".env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Brak pliku .env w katalogu projektu."
}

$key = $null
foreach ($line in Get-Content $EnvFile -Encoding UTF8) {
  if ($line -match '^\s*GOOGLE_GEMINI_API_KEY\s*=\s*(.+)\s*$') {
    $key = $Matches[1].Trim().Trim('"').Trim("'")
    break
  }
}

if (-not $key) {
  Write-Error "Brak GOOGLE_GEMINI_API_KEY w .env"
}

$temp = [System.IO.Path]::GetTempFileName()
try {
  [System.IO.File]::WriteAllText($temp, $key, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Ustawiam sekret $SecretName (projekt $Project)..."
  firebase apphosting:secrets:set $SecretName `
    --project $Project `
    --data-file $temp `
    --force

  Write-Host "Nadaję dostęp backendowi $Backend..."
  firebase apphosting:secrets:grantaccess $SecretName `
    --project $Project `
    --backend $Backend

  $remote = firebase apphosting:secrets:access $SecretName --project $Project 2>$null
  if ($remote.Trim() -eq $key) {
    Write-Host "OK: sekret zapisany i zgodny z .env (dlugosc $($key.Length) znakow)."
  } else {
    Write-Warning "Sekret zapisany, ale wartosc rozni sie od .env - sprawdz recznie."
  }

  firebase apphosting:secrets:describe $SecretName --project $Project
}
finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
}
