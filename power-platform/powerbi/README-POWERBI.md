# Power BI — Tableaux de bord Dataverse en direct

1. **Power BI Desktop > Obtenir des données > Dataverse** → URL `https://VOTRE-ENV.crm4.dynamics.com` → tables `agl_dossierguce`, `agl_dossierfdi`, `agl_dossierrfcv`, `agl_dossierspot`, `agl_ecart`.
2. **Modèle** : liaisons `agl_dossierfdi[agl_dossierguce]` → `agl_dossierguce[agl_dossierguceid]` (N:1, sens unique), idem RFCV→GUCE, RFCV→SPOT, Écarts→4 tables (inactives sauf besoin).
3. **Collez les mesures** de `mesures-DAX.dax`.
4. Pages : **01 Pilotage** (cartes taux + donuts + KPI cliquables) · **02 Écarts** (matrice par catégorie/unité + Top clients) · **03 Délais** (vieillissement brouillons, SLA) · **04 Traçabilité** (imports).
5. **Actualisation planifiée** (passerelle si besoin) + partage Pro/Premium (cf. `docs/ARBITRAGE-DATAVERSE-SHAREPOINT.md`).
