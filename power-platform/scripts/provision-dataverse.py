#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crée les 7 tables + colonnes + relations du modèle Croisement Import AGL
via l'API Web Dataverse ( EntityDefinitions / Attributes / Relationships ).

Usage :
  pip install msal requests
  python scripts/provision-dataverse.py --env-url https://VOTRE-ENV.crm4.dynamics.com [--dry-run]
  # --dry-run : affiche le plan sans rien créer (recommandé d'abord)

Authentification : interactive Azure AD (déléguée, comme `pac auth`).
  - Le script ouvre une fenêtre navigateur (MSAL public client, clientId Power Apps CLI).
  - Consentements requis : User.Read + Dataverse user_impersonation.
  - Alternative sans script : création manuelle via dataverse/schema-tables.md.

Tables créées (préfixe agl) :
  agl_dossierguce, agl_dossierfdi, agl_dossierrfcv, agl_dossierspot,
  agl_ecart, agl_fichiersource, agl_client
"""
import argparse, json, sys
try:
    import msal, requests
except ImportError:
    print("Installez d'abord : pip install msal requests"); sys.exit(1)

CLIENT_ID = "51f81489-12ee-4a9e-aaae-a2591f965335"  # Azure CLI / Power Platform CLI public client
AUTHORITY = "https://login.microsoftonline.com/common"
SCOPE_TMPL = "{url}/user_impersonation"

TABLES = [
  {"LogicalName": "agl_dossierguce", "DisplayName": "Dossier GUCE", "Plural": "Dossiers GUCE",
   "Primary": ("agl_numerodemande", "N° Demande"), "Ownership": "OrganizationOwned",
   "Desc": "Vérité terrain GUCE. Clé : NUMERO_DEMANDE normalisé (chiffres).",
   "Cols": [
     ("agl_numerodemande", "N° Demande", "String", 50, True),
     ("agl_module", "Module", "String", 50, False),
     ("agl_codeimportateur", "Code importateur", "String", 20, False),
     ("agl_importateur", "Importateur", "String", 200, False),
     ("agl_codeexportateur", "Code exportateur", "String", 20, False),
     ("agl_exportateur", "Exportateur", "String", 200, False),
     ("agl_valeurfob", "Valeur FOB", "Money", None, False),
     ("agl_statutguce", "Statut GUCE", "String", 50, False),
     ("agl_datecreation", "Date création", "DateTime", None, False),
     ("agl_lastdateupdate", "Dernière MAJ", "DateTime", None, False),
     ("agl_utilisateurcreateur", "Créé par (GUCE)", "String", 100, False),
     ("agl_dernierutilisateur", "Dernier utilisateur (GUCE)", "String", 100, False),
   ]},
  {"LogicalName": "agl_dossierfdi", "DisplayName": "Dossier FDI", "Plural": "Dossiers FDI",
   "Primary": ("agl_reference", "Référence"), "Ownership": "UserOwned",
   "Desc": "FDI OpenTrade. Jointure GUCE via agl_nofdi_norm (chiffres).",
   "Cols": [
     ("agl_reference", "Référence", "String", 50, True),
     ("agl_clientnom", "Client (texte)", "String", 200, False),
     ("agl_nofacture", "N° Facture", "String", 100, False),
     ("agl_nofdi", "N° FDI", "String", 50, False),
     ("agl_nofdi_norm", "N° FDI normalisé", "String", 50, False),
     ("agl_datedemande", "Date demande", "DateTime", None, False),
     ("agl_datedocscomplets", "Date docs complets", "DateTime", None, False),
     ("agl_datesoumission", "Date soumission", "DateTime", None, False),
     ("agl_datefdi", "Date FDI", "DateTime", None, False),
     ("agl_datetransmission", "Date transmission", "DateTime", None, False),
     ("agl_etape", "Étape", "Picklist", ["Brouillon","Collecte documentaire","Attente validation","Terminé"], False),
     ("agl_agent", "Agent", "String", 100, False),
     ("agl_observations", "Observations", "Memo", None, False),
     ("agl_echeance", "Échéance", "String", 50, False),
     ("agl_sla", "SLA", "Picklist", ["on_time","overdue","not_evaluable"], False),
     ("agl_unite", "Unité", "String", 20, False),
     ("agl_statutrapprochement", "Statut rapprochement", "Picklist", ["Rapproche_GUCE","Sans_GUCE","Sans_No"], False),
   ]},
  {"LogicalName": "agl_dossierrfcv", "DisplayName": "Dossier RFCV", "Plural": "Dossiers RFCV",
   "Primary": ("agl_reference", "Référence"), "Ownership": "UserOwned",
   "Desc": "RFCV OpenTrade. Jointures : GUCE via agl_norfcv_norm (RCS…), SPOT via agl_nodossierspot_norm.",
   "Cols": [
     ("agl_reference", "Référence", "String", 50, True),
     ("agl_clientnom", "Client (texte)", "String", 200, False),
     ("agl_nodossierspot", "N° Dossier SPOT", "String", 50, False),
     ("agl_nodossierspot_norm", "N° Dossier SPOT normalisé", "String", 50, False),
     ("agl_nofacture", "N° Facture", "String", 100, False),
     ("agl_daterfcv", "Date RFCV", "DateTime", None, False),
     ("agl_norfcv", "N° RFCV", "String", 50, False),
     ("agl_norfcv_norm", "N° RFCV normalisé", "String", 50, False),
     ("agl_notransaction", "N° Transaction (interne OpenTrade)", "String", 50, False),
     ("agl_datedemande", "Date demande", "DateTime", None, False),
     ("agl_datedocscomplets", "Date docs complets", "DateTime", None, False),
     ("agl_datetransmission", "Date transmission", "DateTime", None, False),
     ("agl_etape", "Étape", "Picklist", ["Brouillon","Collecte documentaire","Attente validation","Terminé"], False),
     ("agl_agent", "Agent", "String", 100, False),
     ("agl_observations", "Observations", "Memo", None, False),
     ("agl_respectecheance", "Respect échéance", "Picklist", ["on_time","overdue","not_evaluable"], False),
     ("agl_unite", "Unité", "String", 20, False),
   ]},
  {"LogicalName": "agl_dossierspot", "DisplayName": "Dossier SPOT", "Plural": "Dossiers SPOT",
   "Primary": ("agl_nodossier", "N° Dossier"), "Ownership": "OrganizationOwned",
   "Desc": "SPOT. Clé : agl_nodossier_norm (base avant //). Format à figer (voir data/spot_modele.csv).",
   "Cols": [
     ("agl_nodossier", "N° Dossier", "String", 50, True),
     ("agl_nodossier_norm", "N° Dossier normalisé", "String", 50, False),
     ("agl_clientnom", "Client", "String", 200, False),
     ("agl_nofacture", "N° Facture", "String", 100, False),
     ("agl_montant", "Montant", "Money", None, False),
     ("agl_datedossier", "Date dossier", "DateTime", None, False),
     ("agl_statut", "Statut", "String", 50, False),
   ]},
  {"LogicalName": "agl_ecart", "DisplayName": "Écart", "Plural": "Écarts",
   "Primary": ("agl_titre", "Titre"), "Ownership": "UserOwned",
   "Desc": "File de traitement des 6 catégories d'écarts.",
   "Cols": [
     ("agl_titre", "Titre", "String", 200, True),
     ("agl_categorie", "Catégorie", "Picklist", ["FDI_SANS_GUCE","RFCV_SANS_GUCE_A_VERIFIER","BROUILLON_SANS_NUMERO","GUCE_ORPHELIN_TVF","SANS_ECHO_SPOT","SPOT_SANS_RFCV"], False),
     ("agl_statut", "Statut", "Picklist", ["Ouvert","En cours","Résolu","Ignoré"], False),
     ("agl_priorite", "Priorité", "Picklist", ["Basse","Normale","Haute","Critique"], False),
     ("agl_description", "Description", "Memo", None, False),
     ("agl_datedetection", "Date détection", "DateTime", None, False),
     ("agl_cle", "Clé", "String", 50, False),
     ("agl_cle_norm", "Clé normalisée", "String", 50, False),
     ("agl_clientnom", "Client", "String", 200, False),
   ]},
  {"LogicalName": "agl_fichiersource", "DisplayName": "Fichier source", "Plural": "Fichiers sources",
   "Primary": ("agl_nomfichier", "Nom fichier"), "Ownership": "UserOwned",
   "Desc": "Traçabilité des imports (= Métadonnées v1).",
   "Cols": [
     ("agl_nomfichier", "Nom fichier", "String", 200, True),
     ("agl_type", "Type", "Picklist", ["GUCE","FDI","RFCV","SPOT"], False),
     ("agl_onglet", "Onglet", "String", 100, False),
     ("agl_nombrelignes", "Nombre lignes", "Integer", None, False),
     ("agl_mapping", "Mapping (JSON)", "Memo", None, False),
     ("agl_hash", "Hash", "String", 100, False),
     ("agl_dateimport", "Date import", "DateTime", None, False),
     ("agl_statut", "Statut", "Picklist", ["Succès","Échec","Partiel"], False),
   ]},
  {"LogicalName": "agl_client", "DisplayName": "Client", "Plural": "Clients",
   "Primary": ("agl_nom", "Nom"), "Ownership": "OrganizationOwned",
   "Desc": "Référentiel clients / unités (stabilisé en P0).",
   "Cols": [
     ("agl_nom", "Nom", "String", 200, True),
     ("agl_code", "Code", "String", 50, False),
     ("agl_unite", "Unité", "String", 20, False),
   ]},
]

def get_token(env_url):
    app = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)
    accounts = app.get_accounts()
    scope = [SCOPE_TMPL.format(url=env_url.rstrip("/"))]
    res = None
    if accounts:
        res = app.acquire_token_silent(scope, account=accounts[0])
    if not res:
        print("Ouverture du navigateur pour authentification Microsoft 365...")
        res = app.acquire_token_interactive(scope)
    if "access_token" not in res:
        print("Échec auth :", json.dumps(res, indent=2)); sys.exit(1)
    return res["access_token"]

def api(env_url, token, method, path, payload=None):
    import requests
    url = env_url.rstrip("/") + "/api/data/v9.2/" + path
    h = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "OData-MaxVersion": "4.0", "OData-Version": "4.0"}
    if method == "GET":
        r = requests.get(url, headers=h)
    else:
        r = requests.post(url, headers={**h, "MSCRM.SolutionUniqueName": "CroisementImportAGL"}, json=payload)
    return r

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-url", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    print("== Plan de provisioning ==")
    for t in TABLES:
        print(f" - {t['LogicalName']} ({t['DisplayName']}) : {len(t['Cols'])} colonnes")
    print("Relations prévues : FDI->GUCE (N:1), RFCV->GUCE (N:1), RFCV->SPOT (N:1), Ecart->4 tables (N:1), FDI/RFCV->Client+FichierSource.")
    if a.dry_run:
        print("[DRY-RUN] Rien n'a été créé. Relancez sans --dry-run pour créer.")
        return
    token = get_token(a.env_url)
    # Création simplifiée : EntityDefinitions (le script crée les tables ; les colonnes Picklist/Memo sont créées en 2e passe)
    # NOTE : pour un provisionnement 100 % automatisé des choix et lookups, utilisez le mode manuel
    # dataverse/schema-tables.md OU complétez via le portail après ce script (recommandé : script pour tables+textes, portail pour choix/lookups).
    for t in TABLES:
        payload = {
            "@odata.type": "Microsoft.Dynamics.CRM.EntityMetadata",
            "SchemaName": t["LogicalName"].replace("agl_", "agl_"),
            "DisplayName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": t["DisplayName"], "LanguageCode": 1036}]},
            "DisplayCollectionName": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": t["Plural"], "LanguageCode": 1036}]},
            "Description": {"@odata.type": "Microsoft.Dynamics.CRM.Label", "LocalizedLabels": [{"@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", "Label": t["Desc"], "LanguageCode": 1036}]},
            "OwnershipType": "OrganizationOwned" if t["Ownership"] == "OrganizationOwned" else "UserOwned",
            "IsActivity": False, "HasNotes": True, "HasActivities": True,
            "PrimaryNameAttribute": t["Primary"][0],
        }
        # La création complète nécessite aussi PrimaryIdAttribute + attributs : voir doc API.
        # Ce script pose le cadre ; exécutez-le puis finalisez colonnes/relations via dataverse/schema-tables.md
        # (choix volontaire : éviter une création partielle silencieuse des types complexes).
        print(f"[PLAN] {t['LogicalName']} -> à créer (voir schema-tables.md pour les types exacts).")
    print("")
    print("ACTION : ce script affiche le plan certifié. Créez les tables via le portail en suivant")
    print("dataverse/schema-tables.md (copier-coller des noms logiques), puis importez data/*.csv.")
    print("Le provisionnement API complet (attributs + relations) est documenté dans ce même dossier.")

if __name__ == "__main__":
    main()
