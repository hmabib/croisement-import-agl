# Clés de croisement — validées sur extractions réelles (PPT slides 5 & 10)

| Jointure | Clé OpenTrade | Clé cible | Normalisation | Taux 29/09/2026 |
|---|---|---|---|---|
| FDI → GUCE (TVF) | `N° FDI` ex `260156418` | `GUCE.NUMERO_DEMANDE` | chiffres seuls | **394 / 455 = 86,6 %** (PPT : 382/455 = 84 % au 28/09 — écart = refresh GUCE 24/09) |
| RFCV → GUCE | `N° RFCV` ex `RCS26127059` | `GUCE.NUMERO_DEMANDE` | MAJ, espaces/tirets supprimés, RCS conservé | **191 / 228 = 83,8 %** (PPT : 191/229) |
| RFCV → SPOT | `N° Dossier SPOT` ex `26071195//3` → `26071195` | `SPOT.N° Dossier` | base avant `//` | **En attente SPOT complet** (extraction reçue tronquée) |

- `N° Transaction` (ex `1665482`) = **interne OpenTrade**, aucune jointure.
- Brouillons sans N° : 156 FDI + 338 RFCV = normal (< 15 j), à relancer au-delà.
- Seuils de lecture : ≥ 95 % sain · 80-95 % à surveiller · < 80 % alerte.
- Rejouabilité : `scripts/calculer-croisement.py` + flux `FA-02`.

## v1.1 — 3 contrôles ajoutés

**C1 · GUCE → nos systèmes (afficher l'état si absent).**
Pour chaque `GUCE.NUMERO_DEMANDE_norm` : cherché dans `FDI.No_FDI_norm` ∪ `RFCV digits(No_RFCV_norm)` ∪ `SPOT lié`. Si trouvé → `Presence_systeme=Present`, `Etat_controle1=RAPPROCHE`. Sinon → `Absent` + `Etat_controle1=ORPHELIN_A_VERIFIER` (puis `ORPHELIN_CONFIRME` après revue manuelle) + ligne `agl_ecart` catégorie `GUCE_SANS_ECHO_SYSTEME`. L'app affiche le badge d'état + la vue `C1`.

**C2 · Factures AGL (préparé).**
Heuristique v1.1 en attendant la colonne officielle des prochaines extractions : `Facture_AGL=Oui` si `UPPER(No_facture)` contient `AGL` ou `UPPER(Client)` contient `AGL`. Normalisée en `Facture_AGL_norm` (MAJ, sans séparateurs). FA-01/FA-02 la calculent à chaque ingestion ; quand la vraie colonne arrivera, changez seulement le mapping (pas le modèle). Écarts `FACTURE_AGL_A_VERIFIER` si facture AGL sans GUCE ou doublon.

**C3 · Périodes.**
`Periode` (`YYYY-MM`) extraite de `Date_demande` (sinon `Date_creation`) côté FDI/RFCV, de `DATE_CREATION` côté GUCE (`Periode_GUCE`). Toute stat (taux, écarts, Top clients, SLA) est déclinable **par période** + filtre `Du/Au`. Voir `powerbi/mesures-DAX.dax` (mesures `par période`) et vues `Par période`.
