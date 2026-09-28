// Moteur de croisement GUCE / SPOT / OpenTrade — 100 % local, sans dépendance.
// Clés constatées sur extractions du 28/09/2026 :
//   FDI.N° FDI  (ex 260156418)  ↔ GUCE.NUMERO_DEMANDE (MODULE TVF)
//   RFCV.N° RFCV (ex RCS26127059) ↔ GUCE.NUMERO_DEMANDE (MODULE RFCV)
//   RFCV.N° Dossier SPOT (ex 26200924) ↔ SPOT dossier
//   N° Transaction OpenTrade (ex 1665482) = identifiant interne, hors GUCE.

export type GuceRow = {
  numero: string;
  module: string;
  codeImportateur: string;
  importateur: string;
  codeExportateur: string;
  exportateur: string;
  valeurFob: string;
  statut: string;
  dateCreation: string; // ISO yyyy-mm-dd ou ""
  lastUpdate: string;
  userCreateur: string;
  dernierUser: string;
};

export type FdiRow = {
  reference: string;
  dateCreation: string;
  client: string;
  dateDemande: string;
  dateDocsComplets: string;
  facture: string;
  dateSoumission: string;
  dateFdi: string;
  numeroFdi: string;
  dateTransmission: string;
  etape: string;
  agent: string;
  observations: string;
  echeance: string;
  sla: string;
  unite: string;
};

export type RfcvRow = {
  reference: string;
  dateCreation: string;
  client: string;
  dossierSpot: string;
  dateDemande: string;
  dateDocsComplets: string;
  facture: string;
  dateRfcv: string;
  numeroRfcv: string;
  dateTransmission: string;
  transaction: string;
  etape: string;
  agent: string;
  observations: string;
  echeance: string;
  respect: string;
  unite: string;
};

export type SpotRow = {
  raw: Record<string, string>;
  dossier: string;
  facture: string;
  client: string;
  montant: string;
  date: string; // ISO ou ""
  tcd: string;
};

export type SourceName = "guce" | "fdi" | "rfcv" | "spot";

// ---------- Normalisation ----------
const ACCENTS = /[àáâãäå]/g;
export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
void ACCENTS;

/** Clé GUCE / FDI / RFCV : RCS conservé en majuscules, sinon chiffres. */
export function keyNumero(s: unknown): string {
  const t = String(s ?? "").toUpperCase().replace(/[\s.\-_/\\]+/g, "").trim();
  if (!t) return "";
  if (t.startsWith("RCS")) return t.replace(/[^A-Z0-9]/g, "");
  const d = t.replace(/[^0-9]/g, "");
  return d;
}

/** Clé dossier SPOT : premier bloc alphanumérique (gère "26071195//3"). */
export function keyDossier(s: unknown): string {
  const t = String(s ?? "").toUpperCase().trim();
  if (!t) return "";
  const m = t.match(/[A-Z0-9]+/);
  return m ? m[0] : "";
}

const MONTHS_FR: Record<string, string> = {
  janv: "01", jan: "01", fevr: "02", fev: "02", feb: "02", mars: "03", mar: "03",
  avr: "04", apr: "04", mai: "05", may: "05", juin: "06", jun: "06",
  juil: "07", jul: "07", aout: "08", aou: "08", aug: "08", sept: "09", sep: "09",
  oct: "10", nov: "11", dec: "12", decembre: "12",
};

export function toISODate(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number" && isFinite(v) && v > 20000 && v < 80000) {
    // serial Excel
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = Number(y) > 50 ? "19" + y : "20" + y;
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})\s+([a-zéû\.]+)\s+(\d{2,4})/i);
  if (m) {
    const key = norm(m[2]).replace(/\./g, "").slice(0, 4);
    const mm = MONTHS_FR[key] || MONTHS_FR[key.slice(0, 3)] || "01";
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${mm}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})-([A-Z]{3})-(\d{2})\b/i); // 17-NOV-25 (GUCE)
  if (m) {
    const mm =
      { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" }[
        m[2].toUpperCase()
      ] || "01";
    return `20${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return "";
}

export function cell(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString("fr-FR");
  return String(v).trim();
}

// ---------- Mapping colonnes (reconnaissance auto) ----------
export type FieldMap = Record<string, number | null>;

function buildMap(header: string[], aliases: Record<string, string[]>): { map: FieldMap; unmapped: string[] } {
  const Hn = header.map(norm);
  const map: FieldMap = {};
  for (const [field, list] of Object.entries(aliases)) {
    let found: number | null = null;
    for (const a of list) {
      const i = Hn.indexOf(norm(a));
      if (i >= 0) {
        found = i;
        break;
      }
    }
    // repli : contient
    if (found == null) {
      for (const a of list) {
        const na = norm(a);
        const i = Hn.findIndex((h) => h.includes(na) || na.includes(h));
        if (i >= 0) {
          found = i;
          break;
        }
      }
    }
    map[field] = found;
  }
  const used = new Set(Object.values(map).filter((v) => v != null) as number[]);
  const unmapped = header.filter((_, i) => !used.has(i));
  return { map, unmapped };
}

export const GUCE_ALIASES: Record<string, string[]> = {
  numero: ["numero_demande", "numero demande", "n° demande", "num demande"],
  module: ["module"],
  codeImportateur: ["code_importateur", "code importateur"],
  importateur: ["importateur"],
  codeExportateur: ["code_exportateur", "code exportateur"],
  exportateur: ["exportateur"],
  valeurFob: ["valeur_fob", "valeur fob", "fob"],
  statut: ["statut", "status"],
  dateCreation: ["date_creation", "date creation"],
  lastUpdate: ["last_date_upadate", "last date", "derniere mise a jour", "last update"],
  userCreateur: ["utilisateur_createur", "utilisateur createur"],
  dernierUser: ["dernier_utilisateur", "dernier utilisateur"],
};

export const FDI_ALIASES: Record<string, string[]> = {
  reference: ["reference", "référence"],
  dateCreation: ["date de creation", "date création"],
  client: ["client"],
  dateDemande: ["date demande"],
  dateDocsComplets: ["date docs complets", "docs complets"],
  facture: ["n° facture", "numero facture", "facture"],
  dateSoumission: ["date soumission", "soumission"],
  dateFdi: ["date fdi"],
  numeroFdi: ["n° fdi", "numero fdi", "num fdi"],
  dateTransmission: ["date transmission", "transmission"],
  etape: ["etape", "étape"],
  agent: ["agent"],
  observations: ["observations"],
  echeance: ["echeance", "échéance"],
  sla: ["sla"],
  unite: ["unite", "unité"],
};

export const RFCV_ALIASES: Record<string, string[]> = {
  reference: ["reference", "référence"],
  dateCreation: ["date de creation", "date création"],
  client: ["client"],
  dossierSpot: ["n° dossier spot", "dossier spot", "dossier"],
  dateDemande: ["date demande"],
  dateDocsComplets: ["date docs complets", "docs complets"],
  facture: ["n° facture", "numero facture", "facture"],
  dateRfcv: ["date rfcv"],
  numeroRfcv: ["n° rfcv", "numero rfcv"],
  dateTransmission: ["date transmission", "transmission"],
  transaction: ["n° transaction", "transaction"],
  etape: ["etape", "étape"],
  agent: ["agent"],
  observations: ["observations"],
  echeance: ["echeance", "échéance"],
  respect: ["respect echeance", "respect échéance"],
  unite: ["unite", "unité"],
};

export const SPOT_ALIASES: Record<string, string[]> = {
  dossier: ["dossier", "n° dossier", "numero dossier", "dossier spot", "ref dossier", "n dossier"],
  facture: ["facture", "n° facture", "numero facture", "invoice"],
  client: ["client", "importateur", "customer", "nom client"],
  montant: ["montant", "valeur", "fob", "total", "amount"],
  date: ["date", "date creation", "date dossier", "created"],
  tcd: ["tcd", "tc", "conteneur", "container"],
};

export function mapGuce(header: string[]) {
  return buildMap(header, GUCE_ALIASES);
}
export function mapFdi(header: string[]) {
  return buildMap(header, FDI_ALIASES);
}
export function mapRfcv(header: string[]) {
  return buildMap(header, RFCV_ALIASES);
}
export function mapSpot(header: string[]) {
  return buildMap(header, SPOT_ALIASES);
}

// ---------- Construction lignes ----------
function pick(row: string[], map: FieldMap, field: string): string {
  const i = map[field];
  return i == null ? "" : cell(row[i]);
}

export function buildGuce(rows: string[][], map: FieldMap): GuceRow[] {
  return rows.map((r) => ({
    numero: cell(r[map.numero ?? -1] ?? ""),
    module: pick(r, map, "module"),
    codeImportateur: pick(r, map, "codeImportateur"),
    importateur: pick(r, map, "importateur"),
    codeExportateur: pick(r, map, "codeExportateur"),
    exportateur: pick(r, map, "exportateur"),
    valeurFob: pick(r, map, "valeurFob"),
    statut: pick(r, map, "statut"),
    dateCreation: toISODate(r[map.dateCreation ?? -1]),
    lastUpdate: toISODate(r[map.lastUpdate ?? -1]),
    userCreateur: pick(r, map, "userCreateur"),
    dernierUser: pick(r, map, "dernierUser"),
  }));
}

export function buildFdi(rows: string[][], map: FieldMap): FdiRow[] {
  return rows.map((r) => ({
    reference: pick(r, map, "reference"),
    dateCreation: toISODate(r[map.dateCreation ?? -1]),
    client: pick(r, map, "client"),
    dateDemande: toISODate(r[map.dateDemande ?? -1]),
    dateDocsComplets: toISODate(r[map.dateDocsComplets ?? -1]),
    facture: pick(r, map, "facture"),
    dateSoumission: toISODate(r[map.dateSoumission ?? -1]),
    dateFdi: toISODate(r[map.dateFdi ?? -1]),
    numeroFdi: cell(r[map.numeroFdi ?? -1] ?? ""),
    dateTransmission: toISODate(r[map.dateTransmission ?? -1]),
    etape: pick(r, map, "etape"),
    agent: pick(r, map, "agent"),
    observations: pick(r, map, "observations"),
    echeance: pick(r, map, "echeance"),
    sla: pick(r, map, "sla"),
    unite: pick(r, map, "unite"),
  }));
}

export function buildRfcv(rows: string[][], map: FieldMap): RfcvRow[] {
  return rows.map((r) => ({
    reference: pick(r, map, "reference"),
    dateCreation: toISODate(r[map.dateCreation ?? -1] ?? ""),
    client: pick(r, map, "client"),
    dossierSpot: cell(r[map.dossierSpot ?? -1] ?? ""),
    dateDemande: toISODate(r[map.dateDemande ?? -1]),
    dateDocsComplets: toISODate(r[map.dateDocsComplets ?? -1]),
    facture: pick(r, map, "facture"),
    dateRfcv: toISODate(r[map.dateRfcv ?? -1]),
    numeroRfcv: cell(r[map.numeroRfcv ?? -1] ?? ""),
    dateTransmission: toISODate(r[map.dateTransmission ?? -1]),
    transaction: cell(r[map.transaction ?? -1] ?? ""),
    etape: pick(r, map, "etape"),
    agent: pick(r, map, "agent"),
    observations: pick(r, map, "observations"),
    echeance: pick(r, map, "echeance"),
    respect: pick(r, map, "respect"),
    unite: pick(r, map, "unite"),
  }));
}

export function buildSpot(header: string[], rows: string[][], map: FieldMap): SpotRow[] {
  return rows.map((r) => {
    const raw: Record<string, string> = {};
    header.forEach((h, i) => {
      raw[h || `COL_${i + 1}`] = cell(r[i]);
    });
    return {
      raw,
      dossier: pick(r, map, "dossier"),
      facture: pick(r, map, "facture"),
      client: pick(r, map, "client"),
      montant: pick(r, map, "montant"),
      date: toISODate(r[map.date ?? -1]),
      tcd: pick(r, map, "tcd"),
    };
  });
}

// ---------- Croisement ----------
export type FdiCross = { row: FdiRow; key: string; etat: "rapproche" | "sans-guce" | "sans-numero"; guce?: GuceRow };
export type RfcvCross = {
  row: RfcvRow;
  key: string;
  etat: "rapproche" | "sans-guce" | "sans-numero";
  guce?: GuceRow;
  spotKey: string;
  spotCount: number;
  spotEtat: "lie-spot" | "sans-spot" | "spot-non-charge" | "sans-dossier";
};

export function crossFdi(fdis: FdiRow[], guceIdx: Map<string, GuceRow>): FdiCross[] {
  return fdis.map((row) => {
    const key = keyNumero(row.numeroFdi);
    if (!key) return { row, key, etat: "sans-numero" as const };
    const guce = guceIdx.get(key);
    return guce
      ? { row, key, etat: "rapproche" as const, guce }
      : { row, key, etat: "sans-guce" as const };
  });
}

export function crossRfcv(rfcvs: RfcvRow[], guceIdx: Map<string, GuceRow>, spotIdx: Map<string, number> | null): RfcvCross[] {
  return rfcvs.map((row) => {
    const key = keyNumero(row.numeroRfcv);
    const base = !key
      ? { row, key, etat: "sans-numero" as const, guce: undefined as GuceRow | undefined }
      : guceIdx.get(key)
        ? { row, key, etat: "rapproche" as const, guce: guceIdx.get(key) }
        : { row, key, etat: "sans-guce" as const, guce: undefined as GuceRow | undefined };
    const spotKey = keyDossier(row.dossierSpot);
    let spotCount = 0;
    let spotEtat: RfcvCross["spotEtat"];
    if (!spotKey) spotEtat = "sans-dossier";
    else if (spotIdx == null) spotEtat = "spot-non-charge";
    else {
      spotCount = spotIdx.get(spotKey) ?? 0;
      spotEtat = spotCount > 0 ? "lie-spot" : "sans-spot";
    }
    return { ...base, spotKey, spotCount, spotEtat };
  });
}

export function guceOrphelins(guce: GuceRow[], fdiKeys: Set<string>, rfcvKeys: Set<string>) {
  return guce.filter((g) => {
    const k = keyNumero(g.numero);
    if (!k) return false;
    if (g.module === "TVF") return !fdiKeys.has(k);
    if (g.module === "RFCV") return !rfcvKeys.has(k);
    return false;
  });
}

/** SPOT sans RFCV : dossiers SPOT qu'aucun RFCV ne réclame (sens inverse). */
export function spotSansRfcv(spot: SpotRow[], rfcvSpotKeys: Set<string>): SpotRow[] {
  return spot.filter((s) => {
    const k = keyDossier(s.dossier);
    if (!k) return false;
    return !rfcvSpotKeys.has(k);
  });
}

// ---------- Recherche par numéro (unifiée, tous états) ----------
export type NumeroSearch = {
  guce: GuceRow[];
  fdi: FdiCross[];
  rfcv: RfcvCross[];
  spot: SpotRow[];
};

/** Un N° (FDI, RFCV, Transaction, dossier SPOT, facture, référence) → hits dans les 4 états. */
export function searchNumero(
  q: string,
  guce: GuceRow[],
  fdi: FdiCross[],
  rfcv: RfcvCross[],
  spot: SpotRow[],
  max = 60,
): NumeroSearch {
  const out: NumeroSearch = { guce: [], fdi: [], rfcv: [], spot: [] };
  const nq = norm(q);
  if (!nq) return out;
  const k = keyNumero(q);
  const kd = keyDossier(q);
  const hit = (v: unknown) => {
    const nv = norm(v);
    if (!nv) return false;
    if (k && (keyNumero(v) === k || (nv.startsWith("rcs") && keyNumero(v) === k))) return true;
    if (kd && kd.length >= 4 && keyDossier(v) === kd) return true;
    return nq.length >= 3 && nv.includes(nq);
  };
  for (const g of guce) {
    if (out.guce.length >= max) break;
    if (hit(g.numero) || hit(g.codeImportateur)) out.guce.push(g);
  }
  for (const f of fdi) {
    if (out.fdi.length >= max) break;
    if (hit(f.row.numeroFdi) || hit(f.row.reference) || hit(f.row.facture)) out.fdi.push(f);
  }
  for (const f of rfcv) {
    if (out.rfcv.length >= max) break;
    if (hit(f.row.numeroRfcv) || hit(f.row.transaction) || hit(f.row.dossierSpot) || hit(f.row.reference) || hit(f.row.facture))
      out.rfcv.push(f);
  }
  for (const s of spot) {
    if (out.spot.length >= max) break;
    if (hit(s.dossier) || hit(s.facture) || hit(s.tcd)) out.spot.push(s);
  }
  return out;
}

// ---------- Stats / insights ----------
export function countBy<T>(rows: T[], fn: (r: T) => string): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = fn(r) || "—";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export type Insight = {
  level: "danger" | "warn" | "ok" | "info";
  title: string;
  detail: string;
  count: number;
};

export function buildInsights(
  fdi: FdiCross[],
  rfcv: RfcvCross[],
  orphelins: GuceRow[],
  spotLoaded: boolean,
): Insight[] {
  const out: Insight[] = [];
  const fdiSans = fdi.filter((f) => f.etat === "sans-guce");
  if (fdiSans.length)
    out.push({
      level: "danger",
      title: "FDI OpenTrade absents du GUCE",
      detail: `${fdiSans.length} N° FDI introuvables dans le GUCE : pas encore déversés ou à vérifier (vérité GUCE).`,
      count: fdiSans.length,
    });
  const fdiSansNum = fdi.filter((f) => f.etat === "sans-numero");
  if (fdiSansNum.length)
    out.push({
      level: "warn",
      title: "FDI sans N° attribué",
      detail: `${fdiSansNum.length} dossiers OpenTrade au stade Brouillon / Attente validation, sans N° FDI.`,
      count: fdiSansNum.length,
    });
  const rfcvSans = rfcv.filter((f) => f.etat === "sans-guce");
  if (rfcvSans.length)
    out.push({
      level: "danger",
      title: "RFCV OpenTrade absents du GUCE",
      detail: `${rfcvSans.length} N° RFCV avec Transaction mais sans écho GUCE (MODULE RFCV).`,
      count: rfcvSans.length,
    });
  const rfcvSansNum = rfcv.filter((f) => f.etat === "sans-numero");
  if (rfcvSansNum.length)
    out.push({
      level: "warn",
      title: "RFCV sans N° (brouillons)",
      detail: `${rfcvSansNum.length} dossiers sans N° RFCV : collecte documentaire / brouillons.`,
      count: rfcvSansNum.length,
    });
  const rfcvSansSpot = rfcv.filter((f) => f.spotEtat === "sans-spot");
  if (spotLoaded && rfcvSansSpot.length)
    out.push({
      level: "warn",
      title: "RFCV sans dossier SPOT retrouvé",
      detail: `${rfcvSansSpot.length} N° Dossier SPOT sans correspondance dans l'extraction SPOT.`,
      count: rfcvSansSpot.length,
    });
  if (!spotLoaded)
    out.push({
      level: "info",
      title: "SPOT non chargé",
      detail: "Chargez l'extraction SPOT pour rapprocher les N° Dossier SPOT des RFCV.",
      count: 0,
    });
  const tvfOrph = orphelins.filter((o) => o.module === "TVF").length;
  const rfcvOrph = orphelins.filter((o) => o.module === "RFCV").length;
  if (tvfOrph)
    out.push({
      level: "info",
      title: "Dossiers TVF GUCE sans FDI OpenTrade",
      detail: `${tvfOrph} NUMERO TVF du GUCE sans N° FDI rapproché (créés hors OpenTrade ou autre canal).`,
      count: tvfOrph,
    });
  if (rfcvOrph)
    out.push({
      level: "info",
      title: "Dossiers RFCV GUCE sans RFCV OpenTrade",
      detail: `${rfcvOrph} NUMERO RFCV du GUCE sans N° RFCV rapproché.`,
      count: rfcvOrph,
    });
  const overdueFdi = fdi.filter((f) => norm(f.row.sla).includes("overdue") || norm(f.row.sla).includes("late"));
  if (overdueFdi.length)
    out.push({
      level: "warn",
      title: "FDI en dépassement d'échéance",
      detail: `${overdueFdi.length} FDI OpenTrade en overdue/late : à relancer en priorité.`,
      count: overdueFdi.length,
    });
  const overdueRfcv = rfcv.filter(
    (f) => norm(f.row.respect).includes("overdue") || norm(f.row.respect).includes("late"),
  );
  if (overdueRfcv.length)
    out.push({
      level: "warn",
      title: "RFCV en dépassement d'échéance",
      detail: `${overdueRfcv.length} RFCV OpenTrade en overdue/late.`,
      count: overdueRfcv.length,
    });
  if (!out.length)
    out.push({ level: "ok", title: "Croisement sain", detail: "Tout est rapproché, aucun écart détecté.", count: 0 });
  return out;
}

// ---------- Reconnaissance auto de source (chargeur groupé) ----------
// Score = champs reconnus / champs attendus + bonus de signature.
// Seuil 0.30 en-dessous → "inconnu" (l'opérateur assigne manuellement).
export type SourceScore = { source: SourceName; score: number; matched: number; total: number };

export function recognizeSource(header: string[]): { best: SourceName | "inconnu"; scores: SourceScore[] } {
  const defs: { source: SourceName; map: FieldMap }[] = [
    { source: "guce", map: mapGuce(header).map },
    { source: "fdi", map: mapFdi(header).map },
    { source: "rfcv", map: mapRfcv(header).map },
    { source: "spot", map: mapSpot(header).map },
  ];
  const scores = defs
    .map(({ source, map }) => {
      const keys = Object.keys(map);
      const matched = keys.filter((k) => map[k] != null).length;
      let score = keys.length ? matched / keys.length : 0;
      if (source === "guce" && map.numero != null && map.module != null && map.statut != null) score += 0.25;
      if (source === "fdi" && map.numeroFdi != null) score += 0.3;
      if (source === "rfcv" && (map.transaction != null || map.numeroRfcv != null) && map.dossierSpot != null)
        score += 0.3;
      return { source, score, matched, total: keys.length };
    })
    .sort((a, b) => b.score - a.score);
  return { best: scores[0].score >= 0.3 ? scores[0].source : "inconnu", scores };
}

export function mapFnFor(source: SourceName): (header: string[]) => { map: FieldMap; unmapped: string[] } {
  return source === "guce" ? mapGuce : source === "fdi" ? mapFdi : source === "rfcv" ? mapRfcv : mapSpot;
}

export function coverage(map: FieldMap): { mapped: number; total: number; pct: number } {
  const keys = Object.keys(map);
  const mapped = keys.filter((k) => map[k] != null).length;
  return { mapped, total: keys.length, pct: keys.length ? Math.round((mapped / keys.length) * 100) : 0 };
}

// ---------- Filtres ----------
export function inDateRange(iso: string, from: string, to: string): boolean {
  if (!iso) return false;
  if (from && iso < from) return false;
  if (to && iso > to) return false;
  return true;
}

export function matchSearch(hay: string[], q: string): boolean {
  const nq = norm(q);
  if (!nq) return true;
  return hay.some((h) => norm(h).includes(nq));
}
