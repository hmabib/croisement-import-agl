# Vérifie pac, python, connexion Dataverse
$ErrorActionPreference = "Stop"
Write-Host "== Prérequis Croisement Import AGL ==" -ForegroundColor Cyan
try { pac help | Out-Null; Write-Host "[OK] pac CLI :" (pac --version 2>$null) } catch { Write-Host "[KO] pac introuvable. Installez l'extension VS Code 'Power Platform Tools'." -ForegroundColor Red; exit 1 }
try { python --version; Write-Host "[OK] python" } catch { Write-Host "[KO] python introuvable" -ForegroundColor Red; exit 1 }
Write-Host ""
Write-Host "Connectez-vous avec : pac auth create --url https://VOTRE-ENV.crm4.dynamics.com"
Write-Host "Puis vérifiez avec : pac env who  et  pac solution list"
