# Relations (N:1, suppression `RemoveLink`)

| Nom | Primaire → Liée | Champ de recherche | Comportement |
|---|---|---|---|
| agl_fdi_guce | agl_dossierguce → agl_dossierfdi | `agl_dossierguce` | RemoveLink |
| agl_rfcv_guce | agl_dossierguce → agl_dossierrfcv | `agl_dossierguce` | RemoveLink |
| agl_rfcv_spot | agl_dossierspot → agl_dossierrfcv | `agl_dossierspot` | RemoveLink |
| agl_fdi_client / agl_rfcv_client | agl_client → FDI/RFCV | `agl_client` | RemoveLink |
| agl_fdi_fichier / agl_rfcv_fichier / agl_guce_fichier / agl_spot_fichier | agl_fichiersource → chaque table | `agl_fichiersource` | RemoveLink |
| agl_ecart_guce/fdi/rfcv/spot | chaque table → agl_ecart | 4 lookups | RemoveLink |

Règles de gestion (flux) : à la création/MAJ d'un FDI avec `agl_nofdi_norm` non vide → recherche GUCE (`agl_numerodemande` == norm) → renseigne lookup + `agl_statutrapprochement`. Idem RFCV (2 lookups). Sinon crée/MAJ `agl_ecart` + passe au `Résolu` quand le lien apparaît.
