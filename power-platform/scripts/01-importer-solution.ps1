# Importe la solution socle dans l'environnement courant (PowerShell)
param([string]$EnvUrl = "", [string]$ZipPath = "./solution/CroisementImportAGL_unmanaged.zip")
$ErrorActionPreference = "Stop"
if ($EnvUrl -ne "") { Write-Host "Connexion à $EnvUrl ..."; pac auth create --url $EnvUrl }
Write-Host "Environnement courant :"; pac env who
if (-not (Test-Path $ZipPath)) { Write-Host "[KO] ZIP introuvable : $ZipPath" -ForegroundColor Red; exit 1 }
Write-Host "Import de $ZipPath ... (2-5 min)"
pac solution import --path $ZipPath
Write-Host "[OK] Solution importée. Vérifiez : pac solution list" -ForegroundColor Green
Write-Host "Ensuite : python ./scripts/provision-dataverse.py --help  OU création manuelle via dataverse/schema-tables.md"
