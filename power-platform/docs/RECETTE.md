# Recette — jeu de tests + 3 contrôles v1.1 (base vide → chargez exemples d'abord)

1. **Taux (référence v1)** : FDI 86,6 % (394/455), RFCV 83,8 % (191/228) — seuils ≥95 sain / 80-95 surveiller. Rejouez via `scripts/calculer-croisement.py` après chargement.
2. **Recherche N°** : `260156418` (FDI) → carte GUCE + ligne FDI ; `RCS26127059` → GUCE + RFCV + SPOT si lié ; `1665482` (transaction) → seule ligne RFCV (interne, normal).
3. **Écarts** : catégories présentes (`+ GUCE_SANS_ECHO_SYSTEME, FACTURE_AGL_A_VERIFIER`), `File Ouverte` triée, assignation + passage `Résolu` après correction.
4. **C1** : importez `guce_exemple_3.csv` seul → la ligne doit apparaître dans `C1 · GUCE sans écho système` (`Presence=Absent`, `Etat=ORPHELIN_A_VERIFIER`) + écart créé. Ajoutez ensuite le FDI/RFCV correspondant → passe à `Present/RAPPROCHE`, écart `Résolu`.
5. **C2** : importez `rfcv_exemple_3.csv` (`No_facture=AGL-FAC-EX-009`) → `Facture_AGL=Oui` + visible en `C2 · Factures AGL`. Préparez le mapping de la vraie colonne facture des prochaines extractions (changer FA-01 only).
6. **C3** : vérifiez `Periode` (`2026-08`, `2025-11`) + filtre `Du/Au` + mesures Power BI par période.
7. **Imports** : réimport idempotent (upsert clés alt.), `Fichier source` tracé (lignes, hash, statut).
8. **SPOT** : bloquez l'import si format ≠ `spot_modele.csv` (rejet explicite).
