# App pilotée (model-driven) — Croisement Import AGL

## Création (10 min, sans code)
1. **Power Apps > Apps > + Nouvelle app > Pilotée par modèle** → nom `Croisement Import AGL` → ajouter les 7 tables (`dataverse/schema-tables.md`).
2. **Plan de site** : remplacez par `app/sitemap-model-driven.xml` (Concepteur > … > Importer) ou recréez les 5 groupes ci-dessous.
3. **Vues/formulaires** : `dataverse/vues-formulaires.md` (créez les vues `FDI sans GUCE`, `File Ouverte`…).
4. **Publiez** puis **Partagez** : rôles `Opérateur` (lecture/écriture FDI/RFCV/Écarts), `Superviseur` (tout + suppression), `Admin`.

## Navigation cible
- **Pilotage** : Tableau de bord (graphiques natifs) · Taux rapprochement (lien Power BI) · Top clients à relancer.
- **Dossiers** : GUCE · FDI · RFCV · SPOT · Clients.
- **Écarts** : File Ouverte · Par catégorie · Mes écarts · Résolus 30 j.
- **Imports** : Fichiers sources · Nouvelle ingestion (lien flux FA-01).
- **Recherche** : champ unifié (voir § ci-dessous).

## Recherche par numéro unifiée
Dataverse : activez la **Recherche Dataverse** (PPAC > Fonctionnalités) sur `agl_nofdi`, `agl_nofdi_norm`, `agl_norfcv`, `agl_norfcv_norm`, `agl_notransaction`, `agl_nodossier_norm`, `agl_nofacture`.
Alternative sans admin : vue **Recherche N°** avec filtres rapides sur chaque table + 1 tableau de bord regroupant les 4 listes (même usage que la v1 web : « Où en est le dossier X ? » en 5 s).
