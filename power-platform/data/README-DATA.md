# Données — MODÈLES VIDES (import à vide)

> Version VIDE : aucun enregistrement réel. Les CSV sont des **modèles d'import** (UTF-8-SIG, en-têtes seules).

| Fichier | Usage | Import vers |
|---|---|---|
| `fdi.csv` (vide) | Modèle FDI + `No_FDI_norm` + `Statut_rapprochement` | `agl_dossierfdi` |
| `rfcv.csv` (vide) | Modèle RFCV + `No_RFCV_norm` + `No_Dossier_SPOT_norm` | `agl_dossierrfcv` |
| `guce.csv` (vide) | Modèle GUCE + `NUMERO_DEMANDE_norm` | `agl_dossierguce` |
| `ecarts.csv` (vide) | Modèle file d'écarts | `agl_ecart` |
| `spot_modele.csv` | Contrat de format SPOT (30 exemples issus structure RFCV) | `agl_dossierspot` |
| `echantillons/*_exemple_3.csv` | 1-3 lignes fictives `EXEMPLE-*` pour tester le mapping | — tests uniquement |
| `stats.json` | `{"mode":"vide"}` — compteurs à 0 | — |

## Chargement sur la plateforme (après import solution)

1. Créez les 7 tables (`dataverse/schema-tables.md`).
2. Testez le mapping avec `echantillons/*_exemple_3.csv` (Dataverse > Importer des données), puis **supprimez ces lignes test**.
3. Chargez vos vraies extractions : voir **`docs/CHARGEMENT-PLATEFORME.md`** (ordre : Clients → Fichiers sources → GUCE → FDI → RFCV → Écarts via FA-02).
4. Normalisation à appliquer à l'import (rappel) : `No_FDI_norm` = chiffres · `No_RFCV_norm` = MAJ sans espaces-tirets, RCS conservé · `No_Dossier_SPOT_norm` = base avant `//`.

Dictionnaire : `data/dictionnaire-colonnes.md`.
