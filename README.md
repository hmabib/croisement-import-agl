# Croisement Déclarations Import — GUCE / SPOT / OpenTrade (AGL)

Plateforme **100 % locale** de croisement des déclarations import.

- **GUCE** = état des RSCV & FDI du Guichet Unique → **source la plus véridique**.
- **SPOT** = outil métier maison AGL, transite toutes les opérations.
- **OpenTrade** = aide à la saisie / océrisation : étape 1 OpenTrade, étape 2 chargement GUCE.
  ⚠️ OpenTrade **ne déverse pas** les FDI/RFCV dans SPOT → d'où le besoin de croisement manuel.

## Fonctionnement (données 100 % locales)

1. Ouvrez l'app, allez sur **Imports**.
2. Glissez-déposez les 4 extractions (bulk accepté) :
   - `DOSSIERS_GUCE_AGL_*.xlsx` (80 000+ lignes OK, tout reste dans le navigateur)
   - `fdis-*.xlsx` (OpenTrade FDI)
   - `rfcvs-*.xlsx` (OpenTrade RFCV)
   - `EXTRACTION-SPOT-*.xlsx` (SPOT / OpenTrade)
3. La plateforme **classe, mappe et reconnaît** les colonnes automatiquement
   (panneau de correspondance modifiable).
4. Croisements automatiques :
   - `FDI.N° FDI` ↔ `GUCE.NUMERO_DEMANDE` (MODULE TVF)
   - `RFCV.N° RFCV` ↔ `GUCE.NUMERO_DEMANDE` (MODULE RFCV)
   - `RFCV.N° Dossier SPOT` ↔ `SPOT dossier`
5. Statistiques **cliquables**, filtres date, recherche, exports **Excel** + rapport **Word**.

> 🔒 Confidentialité : aucun fichier n'est envoyé sur Internet. Tout est parsé
> et croisé dans le navigateur (SheetJS côté client). Le déploiement Vercel
> ne sert qu'à héberger l'interface vide.

## Clés de rapprochement (constatées sur les extractions du 28/09/2026)

| Jointure | Taux constaté |
|---|---|
| FDI → GUCE (TVF, VALIDATED majoritaire) | ~84 % (382/455) |
| RFCV → GUCE (RFCV, SENT OK) | ~83 % (191/229) |
| Transaction OpenTrade (166…) | interne, pas dans GUCE |

## Dev local

```bash
npm install
npm run dev
npm run build
npm test
```

## Charte

Reprise d'**AGL Vides** : navy `#0A2240`, bleu `#14467C`, rouge `#E4002B`,
fond `#F2F5F9`, rail gauche + thèmes dark/light, exports Excel (`xlsx`)
et Word (`docx`).
