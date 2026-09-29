# Chargement des éléments SUR la plateforme (après import à vide)

La solution importée est **vide** (0 enregistrement). Chargez dans cet ordre :

## 1. Ordre de chargement (respecter les parents d'abord)
1. `agl_client` — saisie manuelle (référentiel unités COM xx).
2. `agl_fichiersource` — 1 ligne par fichier (nom, type GUCE/FDI/RFCV/SPOT, lignes, hash).
3. `agl_dossierguce` — **en premier des gros volumes** : testez `echantillons/guce_exemple_3.csv`, supprimez le test, puis importez votre `GUCE complet.csv` (Dataverse > Importer des données, en arrière-plan).
4. `agl_dossierfdi` — test exemple puis `FDI réel.csv` (mapping `data/dictionnaire-colonnes.md`).
5. `agl_dossierrfcv` — idem (ne mappez jamais `N° Transaction` vers GUCE/SPOT : interne OpenTrade).
6. `agl_dossierspot` — uniquement quand le format SPOT est figé (`data/spot_modele.csv` = contrat).
7. `agl_ecart` — **ne l'importez pas à la main** : laissez FA-02 le générer (ou importez `ecarts.csv` vide puis lancez FA-02).

## 2. Via Dataverse (manuel, recommandé au démarrage)
Chaque table > **… > Importer > Importer des données** → CSV → mapper (noms identiques) → Terminer.
Vérifiez : vues `FDI sans GUCE`, `File Ouverte`, compteurs.

## 3. Via FA-01 (automatisé, ensuite)
- Déposez les XLSX/CSV dans SharePoint `/Imports`.
- Déclenchez **FA-01** (param TypeFichier) : normalisation `*_norm` + upsert clés alt. (`agl_reference`, `agl_numerodemande`, `agl_nodossier_norm`) + ligne `Fichier source`.
- **FA-02** calcule les rapprochements + crée les `Écarts`. **FA-03** relance les overdue le lundi.

## 4. Contrôles v1.1 (à vérifier après chaque chargement)
- **C1 · GUCE sans écho** : ouvrez la vue `C1 · GUCE sans écho système` (`Presence=Absent`). Chaque ligne affiche `Etat_controle1` (`ORPHELIN_A_VERIFIER` → à confirmer en `ORPHELIN_CONFIRME` ou à rapprocher). Les écarts `GUCE_SANS_ECHO_SYSTEME` sont créés par FA-02.
- **C2 · Factures AGL** : vues `C2 · Factures AGL` sur FDI/RFCV/SPOT (`Facture_AGL=Oui`). Règle actuelle : `Oui` si `AGL` dans N° facture ou Client (préparé pour la vraie colonne des prochaines extractions : changez seulement le mapping FA-01, pas le modèle). Écarts `FACTURE_AGL_A_VERIFIER` si doublon/sans GUCE.
- **C3 · Périodes** : filtrez `Du/Au` sur `Periode` (`YYYY-MM` depuis Date_demande sinon Date_creation ; `Periode_GUCE` depuis DATE_CREATION). Toute analyse (taux, écarts, Top clients, SLA) se décline par période dans l'app + Power BI.
- `scripts/calculer-croisement.py` rejoue C1/C2/C3 en local (compatible vide).
- Recette : `docs/RECETTE.md` (recherche `260156418`, `RCS26127059`, transaction `1665482` = seule RFCV).
- SPOT tronqué reçu côté v1 : bloquez tout import SPOT non conforme au modèle (rejet explicite).
