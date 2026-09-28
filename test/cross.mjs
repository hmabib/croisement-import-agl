// Test du moteur de croisement sur les VRAIES extractions (lecture seule).
// Usage: node --experimental-strip-types test/cross.mjs  (Node >= 22.6)
import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const BASE = "/Users/admin/CROISEMENT DECLARATION IMPORT";

// --- mini lecteur xlsx sans dépendance : on passe par openpyxl-like ? Non.
// On utilise le paquet xlsx du projet (déjà installé via npm install).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import {
  buildFdi,
  buildGuce,
  buildInsights,
  buildRfcv,
  crossFdi,
  crossRfcv,
  guceOrphelins,
  keyDossier,
  keyNumero,
  mapFdi,
  mapGuce,
  mapRfcv,
  mapSpot,
  matchSearch,
  norm,
  recognizeSource,
  searchNumero,
  spotSansRfcv,
  toISODate,
} from "../lib/cross.ts";

function loadAOA(path, sheet) {
  const wb = XLSX.readFile(path, { cellDates: true });
  const ws = wb.Sheets[sheet ?? wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
}

const guceAOA = loadAOA(`${BASE}/DOSSIERS_GUCE_AGL_24092026 (version 1).xlsx`, "DEMANDES AGL 2025");
const fdiAOA = loadAOA(`${BASE}/fdis-2026-09-28.xlsx`);
const rfcvAOA = loadAOA(`${BASE}/rfcvs-2026-09-28.xlsx`);

const gHeader = guceAOA[0].map(String);
const fHeader = fdiAOA[0].map(String);
const rHeader = rfcvAOA[0].map(String);

const gMap = mapGuce(gHeader).map;
const fMap = mapFdi(fHeader).map;
const rMap = mapRfcv(rHeader).map;

const str = (aoa) => aoa.slice(1).map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? "").trim())));

const guce = buildGuce(str(guceAOA), gMap);
const fdis = buildFdi(str(fdiAOA), fMap);
const rfcvs = buildRfcv(str(rfcvAOA), rMap);

test("mapping auto reconnaît les colonnes clés", () => {
  assert.ok(gMap.numero != null, "GUCE NUMERO_DEMANDE");
  assert.ok(gMap.module != null && gMap.statut != null, "GUCE MODULE/STATUT");
  assert.ok(fMap.numeroFdi != null && fMap.etape != null, "FDI N°/Étape");
  assert.ok(rMap.numeroRfcv != null && rMap.transaction != null && rMap.dossierSpot != null, "RFCV N°/Transaction/SPOT");
});

test("volumes conformes aux extractions", () => {
  assert.equal(guce.length, 80504);
  assert.equal(fdis.length, 611);
  assert.equal(rfcvs.length, 566);
});

test("normalisation des clés", () => {
  assert.equal(keyNumero("260156418"), "260156418");
  assert.equal(keyNumero("RCS26127059"), "RCS26127059");
  assert.equal(keyNumero(""), "");
  assert.equal(keyDossier("26071195//3"), "26071195");
  assert.equal(toISODate("31/08/2026"), "2026-08-31");
  assert.equal(toISODate("17-NOV-25 00:00:00"), "2025-11-17");
  assert.ok(toISODate("31 août 2026, 16:37").startsWith("2026-08-31"));
});

test("croisement FDI → GUCE ~84%", () => {
  const idx = new Map(guce.map((g) => [keyNumero(g.numero), g]));
  const crossed = crossFdi(fdis, idx);
  const rap = crossed.filter((c) => c.etat === "rapproche").length;
  const withNum = crossed.filter((c) => c.etat !== "sans-numero").length;
  console.log(`   FDI rapprochés: ${rap}/${withNum}`);
  assert.ok(withNum === 455, `FDI avec N° attendus 455, vu ${withNum}`);
  assert.ok(rap >= 370 && rap <= 395, `rapprochés attendus ~382, vu ${rap}`);
  assert.ok(crossed.filter((c) => c.etat === "rapproche" && c.guce.module === "TVF").length >= 370);
});

test("croisement RFCV → GUCE ~83%", () => {
  const idx = new Map(guce.map((g) => [keyNumero(g.numero), g]));
  const crossed = crossRfcv(rfcvs, idx, null);
  const rap = crossed.filter((c) => c.etat === "rapproche").length;
  console.log(`   RFCV rapprochés: ${rap}/229`);
  assert.ok(rap >= 185 && rap <= 200, `rapprochés attendus ~191, vu ${rap}`);
  assert.ok(crossed.filter((c) => c.etat === "sans-numero").length >= 300, "brouillons sans N° attendus");
});

test("insights non vides", () => {
  const idx = new Map(guce.map((g) => [keyNumero(g.numero), g]));
  const fc = crossFdi(fdis, idx);
  const rc = crossRfcv(rfcvs, idx, null);
  const orph = guceOrphelins(guce, new Set(fc.filter((f) => f.etat === "rapproche").map((f) => f.key)), new Set(rc.filter((f) => f.etat === "rapproche").map((f) => f.key)));
  const ins = buildInsights(fc, rc, orph, false);
  console.log("   insights:", ins.map((i) => `${i.title} (${i.count})`).join(" | "));
  assert.ok(ins.some((i) => i.title.includes("FDI OpenTrade absents")));
  assert.ok(ins.some((i) => i.title.includes("RFCV OpenTrade absents")));
  assert.ok(orph.length > 10000, `orphelins TVF/RFCV attendus en masse, vu ${orph.length}`);
});

test("reconnaissance auto des 3 sources connues", () => {
  const g = recognizeSource(gHeader);
  const f = recognizeSource(fHeader);
  const r = recognizeSource(rHeader);
  console.log("   GUCE ->", g.best, g.scores.map((s) => `${s.source}:${Math.round(s.score * 100)}%`).join(" "));
  console.log("   FDI  ->", f.best, f.scores.map((s) => `${s.source}:${Math.round(s.score * 100)}%`).join(" "));
  console.log("   RFCV ->", r.best, r.scores.map((s) => `${s.source}:${Math.round(s.score * 100)}%`).join(" "));
  assert.equal(g.best, "guce");
  assert.equal(f.best, "fdi");
  assert.equal(r.best, "rfcv");
});

test("recherche par numero unifiee", () => {
  const idx = new Map(guce.map((g) => [keyNumero(g.numero), g]));
  const fc = crossFdi(fdis, idx);
  const rc = crossRfcv(rfcvs, idx, null);
  // N° FDI réel : présent OpenTrade + GUCE
  const knownFdi = fdis.find((f) => keyNumero(f.numeroFdi) && idx.has(keyNumero(f.numeroFdi)));
  const hit = searchNumero(knownFdi.numeroFdi, guce, fc, rc, []);
  assert.ok(hit.fdi.length >= 1, "FDI retrouvé");
  assert.ok(hit.guce.length >= 1, "GUCE retrouvé");
  // N° RFCV réel
  const knownRfcv = rfcvs.find((r) => keyNumero(r.numeroRfcv) && idx.has(keyNumero(r.numeroRfcv)));
  const hit2 = searchNumero(knownRfcv.numeroRfcv, guce, fc, rc, []);
  assert.ok(hit2.rfcv.length >= 1 && hit2.guce.length >= 1, "RFCV + GUCE retrouvés");
  // Transaction interne -> retrouvée côté RFCV uniquement
  const withTrans = rfcvs.find((r) => r.transaction && r.transaction.length >= 5);
  const hit3 = searchNumero(withTrans.transaction, guce, fc, rc, []);
  assert.ok(hit3.rfcv.length >= 1, "Transaction retrouvée");
  // Inconnu -> vide
  const hit4 = searchNumero("ZZZ999XXX000", guce, fc, rc, []);
  assert.ok(hit4.guce.length + hit4.fdi.length + hit4.rfcv.length + hit4.spot.length === 0, "vide attendu");
});

test("SPOT sans RFCV = miroir du lien dossier", () => {
  const idx = new Map(guce.map((g) => [keyNumero(g.numero), g]));
  const rc = crossRfcv(rfcvs, idx, null);
  const keys = new Set(rc.filter((c) => c.spotKey).map((c) => c.spotKey));
  const fakeSpot = [
    { raw: {}, dossier: "26200924", facture: "X", client: "C", montant: "", date: "", tcd: "" },
    { raw: {}, dossier: "99999999", facture: "Y", client: "C", montant: "", date: "", tcd: "" },
  ];
  void keys;
  const orph = spotSansRfcv(fakeSpot, new Set(["26200924"]));
  assert.equal(orph.length, 1);
  assert.equal(orph[0].dossier, "99999999");
});

void readFileSync;
