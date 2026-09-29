# Vues & formulaires recommandés (App Designer)

## Vues système par table
- **FDI** : `FDI rapprochés` (statut=Rapproche_GUCE) · `FDI sans GUCE` · `Brouillons sans N°` (nofdi vide) · `Par unité` (grouper COM xx) · `Overdue` (sla=overdue).
- **RFCV** : idem + `Avec dossier SPOT` / `Sans écho SPOT`.
- **GUCE** : `TVF` · `RFCV` · `Orphelins TVF` (sans FDI lié — via vue N:1).
- **Écarts** : `File Ouverte` (statut=Ouvert, tri priorité) · `Par catégorie` · `Mes écarts` (propriétaire = moi) · `Résolus 30 j`.
- **Fichiers sources** : `Derniers imports` (tri date desc).

## Formulaires principaux (glisser-déposer, 5 min chacun)
- FDI/RFCV : En-tête = Référence + badges (Étape, SLA, Statut rapprochement) ; onglets **Dossier** (client, facture, dates, agent, unité), **Rapprochement** (N° + norm + lookups GUCE/SPOT), **Suivi** (observations, échéance, fichier source).
- GUCE : **Dossier** (demande, module, statut, valeur FOB, importateur/exportateur) + sous-grilles **FDI liés / RFCV liés**.
- Écart : **Traitement** (catégorie, statut, priorité, assigné à, description, clés) + lookups liés.

## Tableaux de bord model-driven
- **Pilotage** : graphiques natifs (donuts rapprochement via vues) + liste `File Ouverte`.
- Le BI avancé (taux, Top clients, vieillissement) reste dans **Power BI** (`powerbi/`).

## v1.1 — Vues contrôles (à créer en +)
- `C1 · GUCE sans écho système` : `agl_presence_systeme = Absent`, colonnes : N° Demande, Module, Importateur, Période, État contrôle 1, Facture AGL. Tri : Période desc.
- `C1 · Orphelins à confirmer` : `agl_etat_controle1 = ORPHELIN_A_VERIFIER` → action : confirmer (`ORPHELIN_CONFIRME`) ou rapprocher (remplit lookup).
- `C2 · Factures AGL` (FDI + RFCV + SPOT) : `agl_facture_agl = Oui`, colonnes : Référence, Facture, Facture norm, Client, Période, État.
- `C3 · Par période` : sur chaque table, grouper/trier par `agl_periode` / `agl_periode_guce` + filtre `Du/Au`.
- `Écarts C1/C2` : `Catégorie = GUCE_SANS_ECHO_SYSTEME ou FACTURE_AGL_A_VERIFIER`, avec colonne `Période` + `Facture_AGL`.
Formulaires : ajoutez les 3 badges (Présence système / État contrôle / Facture AGL / Période) en en-tête FDI/RFCV/GUCE.
