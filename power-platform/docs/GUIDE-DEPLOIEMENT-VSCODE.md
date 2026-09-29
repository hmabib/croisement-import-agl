# Guide déploiement — VS Code + Power Platform Tools (DEV → TEST → PROD)

## 0. Pré-requis (admin M365, 30 min)
- Tenant M365 + environnement Dataverse **DEV** (URL `https://xxx.crm4.dynamics.com`), puis TEST/PROD.
- Licences : **Power Apps Premium** (par user ~20 $/mois ou par app ~5 $/mois), **Power Pages** (si portail), **Power BI Pro** (concepteurs).
- DLP : autoriser `Excel / SharePoint / Dataverse / Office 365`.
- VS Code + extension **Power Platform Tools** + `pac` fonctionnel (`pac help` OK).

## 1. Ouvrir + connecter (VS Code)
```bash
code ./CroisementImportAGL-PowerPlatform
pac auth create --url https://VOTRE-ENV-DEV.crm4.dynamics.com
pac env who
```

## 2. Importer la solution complète (v1.1)
```bash
# PowerShell (Windows)
./scripts/01-importer-solution.ps1 -EnvUrl https://VOTRE-ENV-DEV.crm4.dynamics.com
# bash (macOS/Linux)
bash ./scripts/01-importer-solution.sh https://VOTRE-ENV-DEV.crm4.dynamics.com
# Vérifier
pac solution list
```
Portail équivalent : **Power Apps > Solutions > Importer** → `solution/CroisementImportAGL_unmanaged.zip` (31 Ko, éditeur `agl`, version `1.1.0.0`).
L'import crée : **7 tables, 104 colonnes, 13 relations N:1, 4 clés alternatives, 7 formulaires, 19 vues** (contrôles C1/C2/C3 inclus).
Vérifiez : **Dataverse > Tables** → `Dossier GUCE / FDI / RFCV / SPOT`, `Écart`, `Fichier source`, `Client`.

## 3. Droits + publication
Attribuez les 7 tables aux rôles de sécurité (`Opérateur` : lecture/écriture FDI/RFCV/Écarts · `Superviseur` : tout). Puis : **Publier toutes les personnalisations**.
Référence du modèle (si ajustement manuel) : **`dataverse/schema-tables.md`** + **`dataverse/relations.md`**.

## 4. Importer les données
Ordre : `agl_client` (manuel, 1ers clients) → `agl_fichiersource` (1 ligne par fichier, voir stats) → `agl_dossierguce` (échantillon 200 puis complet 80 504) → `agl_dossierfdi` (611) → `agl_dossierrfcv` (566) → `agl_ecart` (2 592).
Chaque table : **… > Importer > Importer des données** → mapping `data/dictionnaire-colonnes.md`.

## 5. App + flux + BI
- App : `app/README-APP.md` + `app/sitemap-model-driven.xml` + `dataverse/vues-formulaires.md`.
- Flux : `flows/README-FLOWS.md` (FA-01 ingestion, FA-02 calcul, FA-03 relances) — créez-les **dans** la solution.
- BI : `powerbi/README-POWERBI.md` + `mesures-DAX.dax`.

## 6. Modifier la solution dans VS Code (ALM)
```bash
# Après modifs dans le portail DEV : rapatrier en local
pac solution export --name CroisementImportAGL --path ./solution/CroisementImportAGL_unmanaged.zip
pac solution unpack --zipfile ./solution/CroisementImportAGL_unmanaged.zip --folder ./CroisementImportAGL/src --packagetype Unmanaged
# Après modifs locales : remballer + importer
pac solution pack --folder ./CroisementImportAGL/src --zipfile ./solution/CroisementImportAGL_unmanaged.zip --packagetype Unmanaged
pac solution import --path ./solution/CroisementImportAGL_unmanaged.zip
# Versionner
pac solution version --build 1 --revision 0 --path ./CroisementImportAGL/src
```
Pipelines : DEV → TEST → PROD en **managée** (`--packagetype Managed` à l'export).

## 7. Dépannage
- `solution file is invalid` → le ZIP doit contenir à la racine `solution.xml + customizations.xml + [Content_Types].xml` (ne rezippez jamais un seul fichier ; utilisez `pac solution pack`).
- Import GUCE lent → importez l'échantillon d'abord, puis le complet en arrière-plan (analytique hors heures).
- Lookup non résolu → importez les parents (Clients, Fichiers sources, GUCE) avant les enfants.
- Colonnes manquantes après `pack` → vérifiez `RootComponents` + `Customizations.xml` (ne créez jamais les tables en éditant le XML — non supporté ; utilisez le portail/API).
