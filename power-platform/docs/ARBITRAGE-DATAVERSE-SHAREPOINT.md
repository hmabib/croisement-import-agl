# Arbitrage Dataverse vs SharePoint (recommandation : Dataverse)

| Critère | A · Dataverse (recommandée) | B · SharePoint Lists |
|---|---|---|
| 80 504 GUCE | Natif, indexé, délégable | Seuil 5 000 éléments → contournement obligatoire |
| Relations FDI/RFCV/SPOT | N:1, vues, règles métier | Recherches limitées, formules fragiles |
| Power BI temps réel | Connecteur direct, refresh planifié | Possible mais lent/limité |
| Gouvernance/ALM | Pipelines DEV→TEST→PROD, solutions | Pas d'ALM, paliers vite atteints |
| Coût | Premium (par user/app) + Pages/BI | Inclus M365 |

Décision : **Dataverse** (trancher en P0). SharePoint uniquement en dépannage transitoire (< 5 000 lignes, sans relations).
