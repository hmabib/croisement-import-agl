# Croisement Import AGL — Projet Power Platform (VS Code + Power Platform Tools) — SOLUTION COMPLÈTE v1.1

> **Solution complète** : l'import crée l'éditeur `agl` + les **7 tables avec leurs 104 colonnes, 13 relations, 4 clés alternatives, 7 formulaires et 19 vues** (validé `pac pack` + Solution Checker Microsoft : 0 erreur).
> Les tables sont créées **vides** : chargez ensuite les données **sur la plateforme** (`docs/CHARGEMENT-PLATEFORME.md`).
> Fichiers `data/*.csv` = **modèles vides (en-têtes seules)** + `data/echantillons/*_exemple_3.csv` pour tester le mapping.


Rapprochement **FDI & RFCV** (OpenTrade) ↔ **GUCE** (vérité terrain) ↔ **SPOT**.
Source métier : extractions du 28/09/2026 + GUCE 24/09/2026 + présentation `Presentation_Croisement_Import_AGL.pptx`.

## Contenu du dossier (ouvrez-le dans VS Code)

```
CroisementImportAGL-PowerPlatform/
├── .vscode/                    # extensions + réglages recommandés
├── CroisementImportAGL/        # projet solution Dataverse (pac solution init, préfixe agl)
│   ├── CroisementImportAGL.cdsproj
│   └── src/Other/              # Solution.xml + Customizations.xml + Relationships.xml
├── solution/                   # ZIP prêt à importer (généré par pac solution pack)
│   └── CroisementImportAGL_unmanaged.zip
├── scripts/                    # import solution + provisioning Dataverse + croisement local
├── data/                       # CSV nettoyés Dataverse-ready + échantillons + écarts + stats
├── dataverse/                  # schéma des 7 tables, relations, vues, clés de croisement
├── flows/                      # 3 flux Power Automate (ingestion, calcul, relances)
├── app/                        # sitemap app pilotée (model-driven)
├── powerbi/                    # mesures DAX + guide
└── docs/                       # guide déploiement VS Code, arbitrage, planning, recette
```

## Démarrage rapide (10 min)

1. **Ouvrez ce dossier dans VS Code** + installez l'extension **Power Platform Tools** (`microsoft-IsvExpTools.powerplatform-vscode`).
2. **Connectez votre environnement** (terminal VS Code) :
   ```bash
   pac auth create --url https://VOTRE-ENV.crm4.dynamics.com
   pac env who
   ```
3. **Importez la solution complète** (éditeur `agl` + 7 tables, 104 colonnes, 13 relations, 4 clés, 7 formulaires, 19 vues — `CroisementImportAGL 1.1.0.0`) :
   ```bash
   # Windows PowerShell
   ./scripts/01-importer-solution.ps1 -EnvUrl https://VOTRE-ENV.crm4.dynamics.com
   # macOS / Linux
   bash ./scripts/01-importer-solution.sh https://VOTRE-ENV.crm4.dynamics.com
   ```
   Ou via le portail : **Power Apps > Solutions > Importer** → `solution/CroisementImportAGL_unmanaged.zip` (31 Ko).
   Vérifiez : **Dataverse > Tables** → les 7 tables `Dossier GUCE / FDI / RFCV / SPOT`, `Écart`, `Fichier source`, `Client`.
4. **Droits** : attribuez les privilèges sur les 7 tables aux rôles `Opérateur` / `Superviseur` (Power Platform admin center > Sécurité > Rôles).
5. **Importez les données** : Dataverse > chaque table > **Importer > Importer des données** → `data/guce.csv`, `data/fdi.csv`, `data/rfcv.csv` (modèles vides + exemples, voir `docs/CHARGEMENT-PLATEFORME.md`).
6. **Créez l'app pilotée + les flux** en suivant `app/README-APP.md` et `flows/README-FLOWS.md` (sitemap + JSON fournis).
7. **Power BI** : connecteur Dataverse → mesures de `powerbi/mesures-DAX.dax`.

Détail pas à pas : **`docs/GUIDE-DEPLOIEMENT-VSCODE.md`**.

## Volumes constatés (recalculés le 29/09/2026)

- GUCE : **80 504** dossiers (TVF 14 300 · RFCV 7 183 · EC 24 237 · E-Licence 8 795 …)
- FDI : **611** (455 avec N° · 156 brouillons sans N°) — **394 rapprochés GUCE (86,6 % des numérotés)**
- RFCV : **566** (228 avec N° · 338 sans N°) — **191 rapprochés (83,8 %)**
- Règle : `N° FDI (chiffres)` → `GUCE.NUMERO_DEMANDE` · `N° RFCV (RCS…)` → `GUCE.NUMERO_DEMANDE` · `N° Dossier SPOT (base avant //)` → `SPOT`
- Le `N° Transaction` OpenTrade est **interne** (ni GUCE ni SPOT).
- Extraction SPOT reçue **tronquée** : `data/spot_modele.csv` = contrat de format à figer côté métier.

## Préfixe & solution

- Éditeur : `AfricaGlobalLogistics` — préfixe **`agl`** — `CustomizationOptionValuePrefix` généré par pac.
- Solution : `CroisementImportAGL` — version `1.0.0.0` — **unmanaged** (DEV). Exportez en **managée** pour TEST/PROD via pipelines ALM.

> Confidentialité : les CSV de ce projet sont issus de vos extractions locales. Ne les envoyez que vers **votre** environnement Dataverse.