# Upload hurt.csv and rebel-images.csv to Firebase Storage (public read).
# Usage: .\scripts\upload-catalog-csv.ps1
# Requires: gcloud or gsutil, project bibl-2c364

$ErrorActionPreference = "Stop"
$Project = "bibl-2c364"
$Bucket = "$Project.appspot.com"
$Prefix = "catalog"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Hurt = Join-Path $Root "data\hurt.csv"
$Rebel = Join-Path $Root "data\rebel-images.csv"

foreach ($file in @($Hurt, $Rebel)) {
  if (-not (Test-Path $file)) {
    Write-Error "Missing file: $file"
  }
}

function Get-Gsutil {
  if (Get-Command gsutil -ErrorAction SilentlyContinue) { return "gsutil" }
  if (Get-Command gcloud -ErrorAction SilentlyContinue) { return "gcloud" }
  throw "Install Google Cloud SDK (gsutil or gcloud)."
}

$tool = Get-Gsutil

Write-Host "Upload to gs://$Bucket/$Prefix/ ..."

if ($tool -eq "gsutil") {
  gsutil -h "Cache-Control:public,max-age=3600" cp $Hurt "gs://$Bucket/$Prefix/hurt.csv"
  gsutil -h "Cache-Control:public,max-age=3600" cp $Rebel "gs://$Bucket/$Prefix/rebel-images.csv"
  gsutil iam ch allUsers:objectViewer "gs://$Bucket"
} else {
  gcloud storage cp --cache-control="public,max-age=3600" $Hurt "gs://$Bucket/$Prefix/hurt.csv"
  gcloud storage cp --cache-control="public,max-age=3600" $Rebel "gs://$Bucket/$Prefix/rebel-images.csv"
}

$HurtUrl = "https://firebasestorage.googleapis.com/v0/b/$Bucket/o/catalog%2Fhurt.csv?alt=media"
$RebelUrl = "https://firebasestorage.googleapis.com/v0/b/$Bucket/o/catalog%2Frebel-images.csv?alt=media"

Write-Host ""
Write-Host "Done. URLs for apphosting.yaml:"
Write-Host "  HURT_CSV_URL=$HurtUrl"
Write-Host "  REBEL_IMAGES_CSV_URL=$RebelUrl"
Write-Host ""
Write-Host "Next: firebase deploy --only apphosting:bookshelf"
