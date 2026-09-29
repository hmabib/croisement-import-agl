#!/bin/bash
# Importe la solution socle (macOS/Linux)
# Usage: bash ./scripts/01-importer-solution.sh https://VOTRE-ENV.crm4.dynamics.com
set -e
ENV_URL=${1:-""}
ZIP_PATH="./solution/CroisementImportAGL_unmanaged.zip"
if [ -n "$ENV_URL" ]; then
  echo "Connexion à $ENV_URL ..."
  pac auth create --url "$ENV_URL"
fi
echo "Environnement courant :"
pac env who
if [ ! -f "$ZIP_PATH" ]; then echo "[KO] ZIP introuvable : $ZIP_PATH"; exit 1; fi
echo "Import de $ZIP_PATH ... (2-5 min)"
pac solution import --path "$ZIP_PATH"
echo "[OK] Solution importée."
