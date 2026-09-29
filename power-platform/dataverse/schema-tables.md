# Modèle Dataverse — 7 tables (préfixe `agl`)

Solution `CroisementImportAGL` · Éditeur `AfricaGlobalLogistics` (`agl`).
Créez dans **Power Apps > Dataverse > Tables > + Nouvelle table** (ou via `scripts/provision-dataverse.py --dry-run` pour le plan).

## 1. agl_dossierguce — Dossier GUCE (Organisation, clé alt. `agl_numerodemande`)
| Nom logique | Affichage | Type | Long. | Requis | Notes |
|---|---|---|---|---|---|
| agl_numerodemande | N° Demande | Texte monoligne | 50 | Oui | Clé alt. + index |
| agl_module | Module | Texte | 50 | — | TVF/EC/RFCV/E-Licence… |
| agl_codeimportateur | Code importateur | Texte | 20 | — | |
| agl_importateur | Importateur | Texte | 200 | — | |
| agl_codeexportateur | Code exportateur | Texte | 20 | — | |
| agl_exportateur | Exportateur | Texte | 200 | — | |
| agl_valeurfob | Valeur FOB | Devise | — | — | |
| agl_statutguce | Statut GUCE | Texte | 50 | — | VALIDATED/APPROVED… |
| agl_datecreation | Date création | Date et heure | — | — | |
| agl_lastdateupdate | Dernière MAJ | Date et heure | — | — | |
| agl_utilisateurcreateur | Créé par (GUCE) | Texte | 100 | — | |
| agl_dernierutilisateur | Dernier utilisateur (GUCE) | Texte | 100 | — | |
Colonne primaire : laissez `agl_dossierguceid` auto. Activez **Pièces jointes/Notes + Activités**. Vues : `GUCE TVF actifs`, `GUCE RFCV`, `Orphelins TVF` (filtre : sans FDI lié).

## 2. agl_dossierfdi — Dossier FDI (Utilisateur)
`agl_reference` (50, requis, primaire d'usage) · `agl_clientnom` (200) · `agl_nofacture` (100) ·
`agl_nofdi` (50) · **`agl_nofdi_norm`** (50, indexé — jointure) ·
dates : `agl_datedemande`, `agl_datedocscomplets`, `agl_datesoumission`, `agl_datefdi`, `agl_datetransmission` ·
`agl_etape` (Choix : Brouillon, Collecte documentaire, Attente validation, Terminé) ·
`agl_agent` (100) · `agl_observations` (Multiligne) · `agl_echeance` (50) ·
`agl_sla` (Choix : on_time, overdue, not_evaluable) · `agl_unite` (20) ·
`agl_statutrapprochement` (Choix : Rapproche_GUCE, Sans_GUCE, Sans_No).
Lookups : `agl_client` → agl_client · `agl_fichiersource` → agl_fichiersource · `agl_dossierguce` → agl_dossierguce.

## 3. agl_dossierrfcv — Dossier RFCV (Utilisateur)
`agl_reference` (50, requis) · `agl_clientnom` (200) ·
`agl_nodossierspot` (50) · **`agl_nodossierspot_norm`** (50, indexé — jointure SPOT) ·
`agl_nofacture` (100) · `agl_daterfcv` (date) ·
`agl_norfcv` (50) · **`agl_norfcv_norm`** (50, indexé — jointure GUCE) ·
`agl_notransaction` (50, **interne OpenTrade — pas de jointure**) ·
`agl_datedemande`, `agl_datedocscomplets`, `agl_datetransmission` ·
`agl_etape` (même choix) · `agl_agent` · `agl_observations` ·
`agl_respectecheance` (Choix on_time/overdue/not_evaluable) · `agl_unite`.
Lookups : client, fichier source, `agl_dossierguce`, `agl_dossierspot`.

## 4. agl_dossierspot — Dossier SPOT (Organisation, clé alt. `agl_nodossier_norm`)
`agl_nodossier` (50, requis) · **`agl_nodossier_norm`** (50, clé alt.) ·
`agl_clientnom` (200) · `agl_nofacture` (100) · `agl_montant` (devise) ·
`agl_datedossier` · `agl_statut` (50). Format figé via `data/spot_modele.csv`.

## 5. agl_ecart — Écart (Utilisateur, file de traitement)
`agl_titre` (200, requis, ex `[FDI_SANS_GUCE] 260156400 — Client X`) ·
`agl_categorie` (Choix : FDI_SANS_GUCE, RFCV_SANS_GUCE_A_VERIFIER, BROUILLON_SANS_NUMERO, GUCE_ORPHELIN_TVF, SANS_ECHO_SPOT, SPOT_SANS_RFCV) ·
`agl_statut` (Ouvert, En cours, Résolu, Ignoré — défaut Ouvert) ·
`agl_priorite` (Basse, Normale, Haute, Critique) ·
`agl_description` (multiligne) · `agl_datedetection` · `agl_cle`/`agl_cle_norm` (50) · `agl_clientnom`.
Lookups : `agl_dossierguce`, `agl_dossierfdi`, `agl_dossierrfcv`, `agl_dossierspot` + `Propriétaire` (assigné à).

## 6. agl_fichiersource — Fichier source (Utilisateur, traçabilité)
`agl_nomfichier` (200, requis) · `agl_type` (GUCE/FDI/RFCV/SPOT) · `agl_onglet` (100) ·
`agl_nombrelignes` (nombre entier) · `agl_mapping` (multiligne JSON) · `agl_hash` (100) ·
`agl_dateimport` · `agl_statut` (Succès/Échec/Partiel).

## 7. agl_client — Client (Organisation, référentiel)
`agl_nom` (200, requis) · `agl_code` (50) · `agl_unite` (20, ex COM 13).

Après création : **Publier toutes les personnalisations** (`pac solution publish` ou bouton Publier).

## Supplément v1.1 — 3 contrôles demandés (à ajouter aux tables ci-dessus)

### CONTRÔLE 1 · GUCE présent ? Sinon afficher l'état (orphelins système)
Sur `agl_dossierguce`, ajoutez :
| agl_periode_guce | Période GUCE | Texte 7 | — | `YYYY-MM` extrait de `DATE_CREATION` (ex `2025-11`, `2026-08`). Indexé. |
| agl_presence_systeme | Présence système | Choix : `Present`, `Absent` | — | `Present` si `NUMERO_DEMANDE_norm` trouvé dans FDI (`agl_nofdi_norm`) OU RFCV (digits `agl_norfcv_norm`) OU SPOT lié. Sinon `Absent`. Calculé par FA-02. |
| agl_etat_controle1 | État contrôle 1 | Choix : `RAPPROCHE`, `ORPHELIN_A_VERIFIER`, `ORPHELIN_CONFIRME`, `NON_CONCERNE` | — | Affiché dans l'app (badge). `ORPHELIN_*` = dans GUCE mais pas dans nos systèmes. |
| agl_facture_agl_detectee | Facture AGL détectée | Oui/Non (bool) | Non | Préparé pour contrôle 2 (voir ci-dessous). |

Vues à créer : `C1 · GUCE sans écho système` (filtre `agl_presence_systeme=Absent`) · `C1 · Par état` (grouper `agl_etat_controle1`) · `C1 · Par période` (grouper `agl_periode_guce`).

### CONTRÔLE 2 · Factures AGL (préparé pour prochaines extractions)
Sur `agl_dossierfdi` / `agl_dossierrfcv` / `agl_dossierspot` / `agl_dossierguce`, ajoutez :
| agl_facture_agl | Facture AGL ? | Choix : `Oui`, `Non`, `A_VERIFIER` | `A_VERIFIER` | Règle v1.1 (extensible) : `Oui` si `No_facture` contient `AGL` (insensible casse) OU `Client`/`Importateur` contient `AGL` OU formato `F...AGL...`. Sinon `Non`. Quand la prochaine extraction apportera la vraie colonne facture AGL, remappez sans changer le modèle. |
| agl_facture_agl_norm | Facture AGL normalisée | Texte 100 | — | MAJ + sans espaces/tirets (ex `AGLFACEX009`). Indexé. Sert aux jointures futures. |

Sur `agl_ecart`, catégorie ajoutée : `FACTURE_AGL_A_VERIFIER` (facture suspecte AGL sans pièce / doublon) + colonne `agl_facture_agl` (Oui/Non).
Vue : `C2 · Factures AGL` (filtre `agl_facture_agl=Oui`) sur FDI/RFCV/SPOT + file écarts associée.

### CONTRÔLE 3 · Périodes dans l'analyse
Sur `agl_dossierfdi` / `agl_dossierrfcv` : `agl_periode` (Texte 7, `YYYY-MM` depuis `Date_demande` sinon `Date_creation`, ex `2026-08`). Sur `agl_ecart` : `agl_periode` recopiée (pour stats par période). Sur `agl_dossierguce` : `agl_periode_guce` (ci-dessus).
Règle : période = `YYYY-MM` ; si date vide → `INCONNUE`. Filtres app : `Du/Au` sur `agl_periode` + vues `Par période`. Power BI : axe `Periode`, mesures `Taux par période`, `Vieillissement`.
