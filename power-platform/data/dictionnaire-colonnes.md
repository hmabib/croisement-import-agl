# Dictionnaire des colonnes (CSV → Dataverse)

## fdi.csv → agl_dossierfdi (v1.1 : + Facture_AGL, Periode, Etat_controle)
`Reference→agl_reference` (clé) · `Client→agl_clientnom` · `No_facture→agl_nofacture` ·
**`Facture_AGL→agl_facture_agl` (Oui/Non/A_VERIFIER, Oui si AGL dans facture/client — prêt colonne officielle)** · **`Facture_AGL_norm→agl_facture_agl_norm`** · **`Periode→agl_periode` (YYYY-MM)** ·
`No_FDI→agl_nofdi` · `No_FDI_norm→agl_nofdi_norm` (jointure GUCE) ·
`Date_demande→agl_datedemande` · `Date_docs_complets→agl_datedocscomplets` ·
`Date_soumission→agl_datesoumission` · `Date_FDI→agl_datefdi` ·
`Date_transmission→agl_datetransmission` · `Etape→agl_etape` (Brouillon/Collecte/Attente/Terminé) ·
`Agent→agl_agent` · `Observations→agl_observations` · `Echeance→agl_echeance` ·
`SLA→agl_sla` (on_time/overdue/not_evaluable) · `Unite→agl_unite` · `Statut_rapprochement→agl_statutrapprochement` · **`Etat_controle→agl_etat_controle`**.

## rfcv.csv → agl_dossierrfcv (v1.1 : idem + SPOT)
`Reference→agl_reference` · `No_Dossier_SPOT→agl_nodossierspot` · `No_Dossier_SPOT_norm→agl_nodossierspot_norm` (jointure SPOT) ·
`No_RFCV→agl_norfcv` · `No_RFCV_norm→agl_norfcv_norm` (jointure GUCE) ·
`No_Transaction→agl_notransaction` (**interne, pas de jointure**) · autres champs analogues FDI +
`Respect_echeance→agl_respectecheance` · **`Facture_AGL→agl_facture_agl` · `Facture_AGL_norm` · `Periode→agl_periode` · `Etat_controle`**.

## guce.csv → agl_dossierguce (v1.1 : + C1/C2/C3)
`NUMERO_DEMANDE→agl_numerodemande` (clé alt.) · `NUMERO_DEMANDE_norm` (calculé) ·
`MODULE→agl_module` · `CODE_IMPORTATEUR→agl_codeimportateur` · `IMPORTATEUR→agl_importateur` ·
`CODE_EXPORTATEUR→agl_codeexportateur` · `EXPORTATEUR→agl_exportateur` ·
`VALEUR_FOB→agl_valeurfob` (devise) · `STATUT→agl_statutguce` ·
`DATE_CREATION→agl_datecreation` · **`Periode_GUCE→agl_periode_guce` (YYYY-MM)** · **`Presence_systeme→agl_presence_systeme` (Present/Absent — C1)** · **`Etat_controle1→agl_etat_controle1` (RAPPROCHE/ORPHELIN_A_VERIFIER/ORPHELIN_CONFIRME)** · **`Facture_AGL_detectee→agl_facture_agl_detectee`** ·
`LAST_DATE_UPADATE→agl_lastdateupdate` ·
`UTILISATEUR_CREATEUR→agl_utilisateurcreateur` · `DERNIER_UTILISATEUR→agl_dernierutilisateur`.

## ecarts.csv → agl_ecart (v1.1 : + GUCE_SANS_ECHO_SYSTEME, FACTURE_AGL_A_VERIFIER, Periode, Facture_AGL)
`Categorie→agl_categorie` (FDI_SANS_GUCE / RFCV_SANS_GUCE_A_VERIFIER / BROUILLON_SANS_NUMERO / GUCE_SANS_ECHO_SYSTEME / FACTURE_AGL_A_VERIFIER / SANS_ECHO_SPOT / SPOT_SANS_RFCV) ·
`Reference_source→agl_titre` (préfixé) · `Cle→agl_cle` · `Cle_norm→agl_cle_norm` ·
`Client→agl_clientnom` · **`Periode→agl_periode` · `Facture_AGL→agl_facture_agl`** · `Statut→agl_statut` (Ouvert) · `Description→agl_description`.

## spot_modele.csv → agl_dossierspot
`No_Dossier_SPOT→agl_nodossier` · `No_Dossier_SPOT_norm→agl_nodossier_norm` (clé alt.) · reste 1:1.
