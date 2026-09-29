# Power Automate — 3 flux (à créer dans `CroisementImportAGL`, Dataverse)

## FA-01 · Ingestion Excel → Dataverse (planifié + manuel)
Déclencheur : **Planifié (quotidien 06:00)** + bouton **manuel** (param : type GUCE/FDI/RFCV/SPOT).
1. `SharePoint — Lister les fichiers` (dossier `/Imports`) ou déclencheur **Quand un fichier est créé**.
2. `Excel Online — Lister les lignes` (table mise en forme, cf. contrat `data/spot_modele.csv`).
3. `Appliquer à chacun` : **Composer `cle_norm`** (expressions ci-dessous) → `Dataverse — Ajouter/Mettre à jour une ligne` (upsert sur clé alt. : `agl_numerodemande` / `agl_reference` / `agl_nodossier_norm`) → `Créer Fichier source` (compteur + hash).
4. En cas d'échec : `Créer Écart` catégorie `IMPORT_ERREUR` + e-mail superviseur.
Expressions :
- FDI : `replace(replace(replace(toUpper(items('N°_FDI')),' ','') ,'-',''),'.','')` puis chiffres : voir `FA-02` (fonction `cle_norm`).
- RFCV : `toUpper(replace(replace(items('N°_RFCV'),' ',''),'-',''))`.
- SPOT : `first(split(items('N°_Dossier'),'/'))`.

## FA-02 · Calcul croisement + file Écarts + C1/C2/C3 (v1.1, voir flow-calcul-croisement.json)
Déclencheur : **Quand une ligne est créée/modifiée** (FDI/RFCV/GUCE/SPOT) + **planifié 22:00**.
0. Calculer `Periode` (YYYY-MM) + `Facture_AGL` (Oui si AGL dans facture/client, norm sans séparateurs).
1. Normaliser `*_norm` si vide.
2. `Lister les lignes` GUCE filtrées : `agl_numerodemande eq '<norm>'`.
3. Si trouvé → renseigner lookup + `agl_statutrapprochement=Rapproche_GUCE`, **C1: Presence=Present, Etat=RAPPROCHE**, clôturer écarts liés (`Résolu`).
4. Sinon → `Créer Écart` (`FDI_SANS_GUCE` / `RFCV_SANS_GUCE_A_VERIFIER` / `SANS_ECHO_SPOT` / `GUCE_SANS_ECHO_SYSTEME`) si absent (dédupliquer sur `agl_cle_norm` + catégorie).
5. **C1 inverse** (GUCE) : cherché dans FDI+RFCV → sinon `Presence=Absent`, `Etat=ORPHELIN_A_VERIFIER` + écart.
6. **C2** : si `Facture_AGL=Oui` et (sans GUCE ou doublon) → `FACTURE_AGL_A_VERIFIER` (prêt pour colonne officielle : changer mapping only).
7. **C3** : recopier `Periode` vers écart. Brouillons sans N° > 15 j → `BROUILLON_SANS_NUMERO` priorité Haute.

## FA-03 · Relances overdue (hebdo)
Déclencheur : **Planifié (lundi 08:00)**.
1. `Lister` FDI/RFCV `sla=overdue` + `Étape != Terminé`.
2. Grouper par `Agent`/`Unité` → tableau HTML → **e-mail/Teams** aux agents + copie superviseurs.
3. `Mettre à jour` `agl_echeance` / priorité écarts.

## Fichiers JSON
`flow-ingestion.json`, `flow-calcul-croisement.json`, `flow-relances-overdue.json` = **squelettes documentés** (triggers + actions + expressions).
Recréez-les en 30-60 min via **Power Automate > + Nouveau flux > Automatisé** dans la solution, en copiant les étapes. Testez avec `data/echantillons/`.
