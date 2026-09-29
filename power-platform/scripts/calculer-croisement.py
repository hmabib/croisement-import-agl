#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Rejoue les 3 controles en local (v1.1). Compatible base VIDE (0 ligne -> stats vides).
# C1 : GUCE present dans nos systemes ? Sinon Presence=Absent + Etat ORPHELIN_A_VERIFIER + ecart GUCE_SANS_ECHO_SYSTEME.
# C2 : Facture AGL ? (heuristique : 'AGL' dans No_facture ou Client, en attendant colonne officielle).
# C3 : Periode YYYY-MM (Date_demande sinon Date_creation / DATE_CREATION GUCE).
# Usage : python scripts/calculer-croisement.py
import csv, re, os
from collections import Counter
BASE = os.path.join(os.path.dirname(__file__), "..", "data")

def nfdi(s):
    return re.sub(r"\D", "", str(s or "").upper())

def nrfcv(s):
    s = str(s or "").upper().strip()
    s = re.sub(r"[\s\-\.\/\\_]+", "", s)
    return re.sub(r"[^A-Z0-9]", "", s)

def nfact(s):
    return re.sub(r"[^A-Z0-9]", "", str(s or "").upper().replace(" ", "").replace("-", "").replace(".", "").replace("/", ""))

def est_facture_agl(nofact, client):
    t = (str(nofact or "") + " " + str(client or "")).upper()
    return "AGL" in t

def periode_de(*dates):
    for d in dates:
        if not d:
            continue
        s = str(d).strip()
        m = re.search(r"(20\d{2})[-/.](\d{1,2})", s)
        if m:
            return "%s-%02d" % (m.group(1), int(m.group(2)))
        m = re.search(r"(\d{1,2})[-/](\d{1,2})[-/](20\d{2})", s)
        if m:
            return "%s-%02d" % (m.group(3), int(m.group(2)))
        m = re.search(r"(\d{1,2})-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)-(\d{2,4})", s.upper())
        if m:
            mon = {"JAN":"01","FEB":"02","MAR":"03","APR":"04","MAY":"05","JUN":"06","JUL":"07","AUG":"08","SEP":"09","OCT":"10","NOV":"11","DEC":"12"}[m.group(2)]
            yy = m.group(3)
            yyyy = "20"+yy if len(yy)==2 else yy
            return "%s-%s" % (yyyy, mon)
        m = re.search(r"(20\d{2})", s)
        if m:
            return m.group(1)+"-01"
    return "INCONNUE"

def load(n):
    with open(os.path.join(BASE, n), encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

guce = load("guce.csv"); fdi = load("fdi.csv"); rfcv = load("rfcv.csv")
if not guce and not fdi and not rfcv:
    print("Base VIDE : 0 ligne. Chargez sur la plateforme puis relancez (voir docs/CHARGEMENT-PLATEFORME.md).")
    print("Regles actives : C1 Presence_systeme/Etat_controle1, C2 Facture_AGL (Oui si AGL dans facture/client), C3 Periode YYYY-MM.")
    raise SystemExit(0)

fdi_norms = set((x.get("No_FDI_norm") or nfdi(x.get("No_FDI"))) for x in fdi if (x.get("No_FDI_norm") or x.get("No_FDI")))
rfcv_digits = set(re.sub(r"\D", "", (x.get("No_RFCV_norm") or nrfcv(x.get("No_RFCV")))) for x in rfcv if (x.get("No_RFCV_norm") or x.get("No_RFCV")))

def gkey(g):
    return (g.get("NUMERO_DEMANDE_norm") or nfdi(g.get("NUMERO_DEMANDE")))

c1_absents = [g for g in guce if gkey(g) not in fdi_norms and re.sub(r"\D", "", gkey(g)) not in rfcv_digits and gkey(g) not in rfcv_digits]
print("C1 - GUCE=%d | presents=%d | absents de nos systemes=%d -> afficher Etat_controle1 + vue C1" % (len(guce), len(guce)-len(c1_absents), len(c1_absents)))

def c2count(rows, f_fact, f_cli):
    return sum(1 for r in rows if est_facture_agl(r.get(f_fact), r.get(f_cli)))
print("C2 - Factures AGL : FDI=%d RFCV=%d GUCE=%d (heuristique AGL ; pret pour colonne officielle)" % (c2count(fdi,"No_facture","Client"), c2count(rfcv,"No_facture","Client"), c2count(guce,"VALEUR_FOB","IMPORTATEUR")))

pf = Counter(periode_de(x.get("Date_demande"), x.get("Date_creation")) for x in fdi) if fdi else {}
pr = Counter(periode_de(x.get("Date_demande"), x.get("Date_creation")) for x in rfcv) if rfcv else {}
pg = Counter(periode_de(g.get("DATE_CREATION")) for g in guce) if guce else {}
print("C3 - Periodes FDI:", dict(list(pf.items())[:10]))
print("C3 - Periodes RFCV:", dict(list(pr.items())[:10]))
print("C3 - Periodes GUCE:", dict(list(pg.items())[:10]))
print("Rappel : N_Transaction interne, jamais rapproche. Filtrez Du/Au sur Periode dans l'app + Power BI.")
