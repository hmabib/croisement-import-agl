"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Gauge,
  FileCheck2,
  FileWarning,
  Database,
  AlertTriangle,
  Search,
  Table2,
  Lightbulb,
  Upload,
  Download,
  FileText,
  Sun,
  Moon,
  ShieldCheck,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import BulkImporter, { effectiveSource, type LoadedSource, type StagedFile } from "@/components/BulkImporter";
import { Bars, Donut } from "@/components/Charts";
import {
  buildFdi,
  buildGuce,
  buildInsights,
  buildRfcv,
  buildSpot,
  countBy,
  coverage,
  crossFdi,
  crossRfcv,
  guceOrphelins,
  inDateRange,
  keyDossier,
  keyNumero,
  matchSearch,
  norm,
  searchNumero,
  spotSansRfcv,
  type FdiCross,
  type RfcvCross,
} from "@/lib/cross";
import "./operations.css";

type Tab =
  | "pilotage" | "supervision" | "fdi" | "rfcv" | "spot"
  | "ecarts" | "recherche" | "dossiers" | "insights" | "imports";

const NAV: { id: Tab; icon: typeof LayoutDashboard; label: string; group: string }[] = [
  { id: "pilotage", icon: LayoutDashboard, label: "Pilotage", group: "Suivi" },
  { id: "supervision", icon: Gauge, label: "Supervision", group: "Suivi" },
  { id: "fdi", icon: FileCheck2, label: "FDI × GUCE", group: "Croisements" },
  { id: "rfcv", icon: FileWarning, label: "RFCV × GUCE × SPOT", group: "Croisements" },
  { id: "spot", icon: Database, label: "SPOT", group: "Croisements" },
  { id: "ecarts", icon: AlertTriangle, label: "Écarts / Absents", group: "Écarts" },
  { id: "recherche", icon: Search, label: "Recherche N°", group: "Écarts" },
  { id: "dossiers", icon: Table2, label: "Dossiers", group: "Données" },
  { id: "insights", icon: Lightbulb, label: "Insights", group: "Données" },
  { id: "imports", icon: Upload, label: "Imports", group: "Données" },
];

const TITLES: Record<Tab, string> = {
  pilotage: "Pilotage du croisement",
  supervision: "Supervision du pipeline",
  fdi: "FDI OpenTrade × GUCE",
  rfcv: "RFCV OpenTrade × GUCE × SPOT",
  spot: "Extraction SPOT",
  ecarts: "Écarts — absents de chaque état",
  recherche: "Recherche par numéro",
  dossiers: "Dossiers · table unifiée",
  insights: "Insights automatiques",
  imports: "Imports · chargement groupé local",
};

const ETAT_FDI: Record<FdiCross["etat"], string> = {
  rapproche: "Rapproché GUCE",
  "sans-guce": "FDI sans GUCE",
  "sans-numero": "Sans N° FDI",
};
const ETAT_RFCV: Record<RfcvCross["etat"], string> = {
  rapproche: "Rapproché GUCE",
  "sans-guce": "RFCV sans GUCE",
  "sans-numero": "Sans N° RFCV",
};

function minMax(dates: string[]): { min: string; max: string } {
  const ds = dates.filter(Boolean).sort();
  return { min: ds[0] || "—", max: ds[ds.length - 1] || "—" };
}

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("pilotage");
  const [sources, setSources] = useState<Record<Source, LoadedSource | null>>({
    guce: null,
    fdi: null,
    rfcv: null,
    spot: null,
  });
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [launch, setLaunch] = useState<{ at: string; files: string[] } | null>(null);
  const [search, setSearch] = useState("");
  const [numeroQ, setNumeroQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [etape, setEtape] = useState("all");
  const [unite, setUnite] = useState("all");
  const [etatFdi, setEtatFdi] = useState("all");
  const [etatRfcv, setEtatRfcv] = useState("all");
  const [moduleGuce, setModuleGuce] = useState("all");
  const [notice, setNotice] = useState("");
  const [author, setAuthor] = useState("");
  const [limit, setLimit] = useState(200);
  const [busy, setBusy] = useState(false);

  // Thème persisté (le sélecteur dark/light restait purement visuel).
  useEffect(() => {
    try {
      const t = localStorage.getItem("croisement-theme");
      if (t === "light" || t === "dark") setTheme(t);
      const a = localStorage.getItem("croisement-author") || "";
      if (a) setAuthor(a);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("croisement-theme", theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    setLimit(200);
  }, [tab]);
  function setAuthorPersist(v: string) {
    setAuthor(v);
    try {
      localStorage.setItem("croisement-author", v);
    } catch {}
  }

  function handleLaunch(record: Record<Source, LoadedSource | null>, files: string[]) {
    setSources((p) => ({
      guce: record.guce ?? p.guce,
      fdi: record.fdi ?? p.fdi,
      rfcv: record.rfcv ?? p.rfcv,
      spot: record.spot ?? p.spot,
    }));
    setLaunch({ at: new Date().toISOString(), files });
    setStaged([]);
    resetFilters();
    setNotice(`Croisement lancé : ${files.join(" · ")}. Résultats dans Supervision et Pilotage.`);
    setTab("supervision");
  }

  // ---------- Jeux de données typés (actifs = lancés, pas les staged) ----------
  const guceRows = useMemo(
    () => (sources.guce ? buildGuce(sources.guce.rows, sources.guce.map) : []),
    [sources.guce],
  );
  const fdiRows = useMemo(
    () => (sources.fdi ? buildFdi(sources.fdi.rows, sources.fdi.map) : []),
    [sources.fdi],
  );
  const rfcvRows = useMemo(
    () => (sources.rfcv ? buildRfcv(sources.rfcv.rows, sources.rfcv.map) : []),
    [sources.rfcv],
  );
  const spotRows = useMemo(
    () => (sources.spot ? buildSpot(sources.spot.header, sources.spot.rows, sources.spot.map) : []),
    [sources.spot],
  );

  const guceIdx = useMemo(() => {
    const m = new Map<string, (typeof guceRows)[number]>();
    for (const g of guceRows) {
      const k = keyNumero(g.numero);
      if (k && !m.has(k)) m.set(k, g);
    }
    return m;
  }, [guceRows]);

  const spotIdx = useMemo(() => {
    if (!sources.spot) return null;
    const m = new Map<string, number>();
    for (const s of spotRows) {
      const k = keyDossier(s.dossier);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [spotRows, sources.spot]);

  const fdi = useMemo(() => crossFdi(fdiRows, guceIdx), [fdiRows, guceIdx]);
  const rfcv = useMemo(() => crossRfcv(rfcvRows, guceIdx, spotIdx), [rfcvRows, guceIdx, spotIdx]);
  const orph = useMemo(() => {
    const fk = new Set(fdi.filter((f) => f.etat === "rapproche").map((f) => f.key));
    const rk = new Set(rfcv.filter((f) => f.etat === "rapproche").map((f) => f.key));
    return guceOrphelins(guceRows, fk, rk);
  }, [guceRows, fdi, rfcv]);
  const spotOrph = useMemo(() => {
    const rk = new Set(rfcvRows.map((r) => keyDossier(r.dossierSpot)).filter(Boolean));
    return spotSansRfcv(spotRows, rk);
  }, [spotRows, rfcvRows]);
  const insights = useMemo(
    () => (sources.guce || sources.fdi || sources.rfcv ? buildInsights(fdi, rfcv, orph, !!sources.spot) : []),
    [fdi, rfcv, orph, sources],
  );

  // ---------- Filtres ----------
  const fdiEtapes = useMemo(() => countBy(fdi, (f) => f.row.etape), [fdi]);
  const fdiUnites = useMemo(() => countBy(fdi, (f) => f.row.unite), [fdi]);
  const rfcvEtapes = useMemo(() => countBy(rfcv, (f) => f.row.etape), [rfcv]);
  const rfcvUnites = useMemo(() => countBy(rfcv, (f) => f.row.unite), [rfcv]);
  const guceModules = useMemo(() => countBy(guceRows, (g) => g.module), [guceRows]);
  const guceStatuts = useMemo(() => countBy(guceRows, (g) => g.statut), [guceRows]);

  function dateOk(iso: string) {
    if (!from && !to) return true;
    return inDateRange(iso, from, to);
  }

  const fdiF = useMemo(
    () =>
      fdi.filter(
        (f) =>
          (etatFdi === "all" || f.etat === etatFdi) &&
          (etape === "all" || f.row.etape === etape) &&
          (unite === "all" || f.row.unite === unite) &&
          dateOk(f.row.dateCreation) &&
          matchSearch([f.row.reference, f.row.client, f.row.facture, f.row.numeroFdi, f.row.agent, f.guce?.importateur || ""], search),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fdi, etatFdi, etape, unite, from, to, search],
  );

  const rfcvF = useMemo(
    () =>
      rfcv.filter(
        (f) =>
          (etatRfcv === "all" || f.etat === etatRfcv) &&
          (etape === "all" || f.row.etape === etape) &&
          (unite === "all" || f.row.unite === unite) &&
          dateOk(f.row.dateCreation) &&
          matchSearch(
            [f.row.reference, f.row.client, f.row.facture, f.row.numeroRfcv, f.row.transaction, f.row.dossierSpot, f.row.agent],
            search,
          ),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rfcv, etatRfcv, etape, unite, from, to, search],
  );

  const guceF = useMemo(
    () =>
      guceRows.filter(
        (g) =>
          (moduleGuce === "all" || g.module === moduleGuce) &&
          dateOk(g.dateCreation) &&
          matchSearch([g.numero, g.importateur, g.exportateur, g.statut], search),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guceRows, moduleGuce, from, to, search],
  );

  // Écarts filtrés (recherche + dates globales).
  const ecFdiSans = useMemo(
    () => fdi.filter((f) => f.etat === "sans-guce" && dateOk(f.row.dateCreation) && matchSearch([f.row.numeroFdi, f.row.client, f.row.facture], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fdi, from, to, search],
  );
  const ecRfcvSans = useMemo(
    () => rfcv.filter((f) => f.etat === "sans-guce" && dateOk(f.row.dateCreation) && matchSearch([f.row.numeroRfcv, f.row.client, f.row.dossierSpot, f.row.transaction], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rfcv, from, to, search],
  );
  const ecSansNum = useMemo(
    () => [
      ...fdi.filter((f) => f.etat === "sans-numero").map((f) => ({ type: "FDI", ref: f.row.reference, client: f.row.client, etape: f.row.etape, date: f.row.dateCreation, unite: f.row.unite })),
      ...rfcv.filter((f) => f.etat === "sans-numero").map((f) => ({ type: "RFCV", ref: f.row.reference, client: f.row.client, etape: f.row.etape, date: f.row.dateCreation, unite: f.row.unite })),
    ].filter((r) => dateOk(r.date) && matchSearch([r.ref, r.client], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fdi, rfcv, from, to, search],
  );
  const ecOrph = useMemo(
    () => orph.filter((g) => dateOk(g.dateCreation) && matchSearch([g.numero, g.importateur], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orph, from, to, search],
  );
  const ecRfcvSansSpot = useMemo(
    () => rfcv.filter((f) => f.spotEtat === "sans-spot" && dateOk(f.row.dateCreation) && matchSearch([f.row.numeroRfcv, f.row.client, f.row.dossierSpot], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rfcv, from, to, search],
  );
  const ecSpotSansRfcv = useMemo(
    () => spotOrph.filter((s) => dateOk(s.date) && matchSearch([s.dossier, s.client, s.facture], search)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spotOrph, from, to, search],
  );

  // Recherche par numéro (unifiée, 4 états).
  const numeroRes = useMemo(
    () => (numeroQ.trim() ? searchNumero(numeroQ, guceRows, fdi, rfcv, spotRows) : null),
    [numeroQ, guceRows, fdi, rfcv, spotRows],
  );

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const fR = fdi.filter((f) => f.etat === "rapproche").length;
    const fS = fdi.filter((f) => f.etat === "sans-guce").length;
    const rR = rfcv.filter((f) => f.etat === "rapproche").length;
    const rS = rfcv.filter((f) => f.etat === "sans-guce").length;
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
    const overdue = (s: string) => /overdue|late/.test(norm(s));
    return [
      { label: "GUCE (TOTAL)", value: guceRows.length },
      { label: "FDI rapprochés", value: `${fR}/${fdi.length} · ${pct(fR, fdi.length)}%` },
      { label: "FDI sans GUCE", value: fS },
      { label: "RFCV rapprochés", value: `${rR}/${rfcv.length} · ${pct(rR, rfcv.length)}%` },
      { label: "RFCV sans GUCE", value: rS },
      { label: "GUCE orphelins (TVF/RFCV)", value: orph.length },
      { label: "Lignes SPOT", value: spotRows.length },
      { label: "RFCV liés SPOT", value: rfcv.filter((f) => f.spotEtat === "lie-spot").length },
      { label: "RFCV sans écho SPOT", value: rfcv.filter((f) => f.spotEtat === "sans-spot").length },
      { label: "SPOT sans RFCV", value: spotOrph.length },
      { label: "FDI_brouillons_sans_num", value: fdi.filter((f) => f.etat === "sans-numero").length },
      { label: "RFCV_brouillons_sans_num", value: rfcv.filter((f) => f.etat === "sans-numero").length },
      { label: "FDI_overdue", value: fdi.filter((f) => overdue(f.row.sla)).length },
      { label: "RFCV_overdue", value: rfcv.filter((f) => overdue(f.row.respect)).length },
    ];
  }, [guceRows, fdi, rfcv, orph, spotRows, spotOrph]);

  const filesMeta = useMemo(
    () =>
      (
        [
          sources.guce && { label: "GUCE (vérité terrain)", fileName: sources.guce.fileName, rows: guceRows.length, ...coverage(sources.guce.map), unmapped: sources.guce.unmapped },
          sources.fdi && { label: "OpenTrade FDI", fileName: sources.fdi.fileName, rows: fdiRows.length, ...coverage(sources.fdi.map), unmapped: sources.fdi.unmapped },
          sources.rfcv && { label: "OpenTrade RFCV", fileName: sources.rfcv.fileName, rows: rfcvRows.length, ...coverage(sources.rfcv.map), unmapped: sources.rfcv.unmapped },
          sources.spot && { label: "SPOT", fileName: sources.spot.fileName, rows: spotRows.length, ...coverage(sources.spot.map), unmapped: sources.spot.unmapped },
        ].filter(Boolean) as {
          label: string; fileName: string; rows: number; mapped: number; total: number; pct: number; unmapped: string[];
        }[]
      ),
    [sources, guceRows, fdiRows, rfcvRows, spotRows],
  );

  const loaded = sources.guce || sources.fdi || sources.rfcv || sources.spot;

  function resetFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    setEtape("all");
    setUnite("all");
    setEtatFdi("all");
    setEtatRfcv("all");
    setModuleGuce("all");
    setLimit(200);
  }

  function goFdi(etat: string) {
    resetFilters();
    setEtatFdi(etat);
    setTab("fdi");
  }
  function goRfcv(etat: string) {
    resetFilters();
    setEtatRfcv(etat);
    setTab("rfcv");
  }

  async function exportExcel() {
    setBusy(true);
    try {
      const { exportWorkbook } = await import("@/lib/export-workbook");
      exportWorkbook({
        fdi: fdiF,
        rfcv: rfcvF,
        orphelins: orph,
        spotSansRfcv: spotOrph,
        spot: spotRows,
        insights,
        kpis,
        meta: { at: new Date().toISOString(), author, appVersion: "1.1.0", files: filesMeta, counts: kpis },
      });
      setNotice("Export Excel téléchargé (Synthèse, Interprétation, Métadonnées, FDI/RFCV croisés, orphelins, SPOT, Insights).");
    } catch (e) {
      setNotice(`Export Excel impossible : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function exportWord() {
    setBusy(true);
    try {
      const { buildWordReport } = await import("@/lib/word-report");
      const blob = await buildWordReport({
        at: new Date().toISOString(),
        author,
        kpis,
        fdiSansGuce: fdi.filter((f) => f.etat === "sans-guce"),
        rfcvSansGuce: rfcv.filter((f) => f.etat === "sans-guce"),
        orphelins: orph,
        spotSansRfcv: spotOrph,
        insights,
        meta: { at: new Date().toISOString(), author, appVersion: "1.1.0", files: filesMeta, counts: kpis },
      });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `Croisement_Import_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice("Rapport Word téléchargé (synthèse, écarts, interprétation, métadonnées).");
    } catch (e) {
      setNotice(`Rapport Word impossible : ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const fdiDonut = [
    { label: "Rapprochés GUCE", count: fdi.filter((f) => f.etat === "rapproche").length, color: "#2e9e7b" },
    { label: "Sans GUCE", count: fdi.filter((f) => f.etat === "sans-guce").length, color: "#e4002b" },
    { label: "Sans N°", count: fdi.filter((f) => f.etat === "sans-numero").length, color: "#8da1b4" },
  ];
  const rfcvDonut = [
    { label: "Rapprochés GUCE", count: rfcv.filter((f) => f.etat === "rapproche").length, color: "#2e9e7b" },
    { label: "Sans GUCE", count: rfcv.filter((f) => f.etat === "sans-guce").length, color: "#e4002b" },
    { label: "Sans N°", count: rfcv.filter((f) => f.etat === "sans-numero").length, color: "#8da1b4" },
  ];

  const fdiSansCount = fdi.filter((f) => f.etat === "sans-guce").length;
  const rfcvSansCount = rfcv.filter((f) => f.etat === "sans-guce").length;
  const ecartsTotal = ecFdiSans.length + ecRfcvSans.length + ecSansNum.length + ecOrph.length + ecRfcvSansSpot.length + ecSpotSansRfcv.length;

  // Supervision : couverture mapping + fraîcheur par source.
  const supRows = [
    sources.guce && { key: "GUCE", file: sources.guce.fileName, rows: guceRows.length, cov: coverage(sources.guce.map), range: minMax(guceRows.map((g) => g.dateCreation)), vital: true },
    sources.fdi && { key: "FDI", file: sources.fdi.fileName, rows: fdiRows.length, cov: coverage(sources.fdi.map), range: minMax(fdiRows.map((f) => f.dateCreation)), vital: false },
    sources.rfcv && { key: "RFCV", file: sources.rfcv.fileName, rows: rfcvRows.length, cov: coverage(sources.rfcv.map), range: minMax(rfcvRows.map((f) => f.dateCreation)), vital: false },
    sources.spot && { key: "SPOT", file: sources.spot.fileName, rows: spotRows.length, cov: coverage(sources.spot.map), range: minMax(spotRows.map((f) => f.date)), vital: false },
  ].filter(Boolean) as { key: string; file: string; rows: number; cov: { mapped: number; total: number; pct: number }; range: { min: string; max: string }; vital: boolean }[];

  return (
    <div className="ops-app" data-theme={theme}>
      <aside className="rail" aria-label="Navigation principale">
        <a className="rail-logo" href="#" onClick={(e) => { e.preventDefault(); setTab("pilotage"); }} aria-label="AGL — Accueil">
          <Logo theme={theme} />
        </a>
        <nav className="rail-links">
          {NAV.map((n, i) => {
            const newGroup = n.group !== NAV[i - 1]?.group;
            const Icon = n.icon;
            const badge =
              n.id === "fdi" ? fdiSansCount
              : n.id === "rfcv" ? rfcvSansCount
              : n.id === "ecarts" ? ecartsTotal
              : n.id === "insights" ? insights.length
              : 0;
            return (
              <span key={n.id}>
                {newGroup && <span className="rail-group">{n.group}</span>}
                <button className={tab === n.id ? "active" : ""} onClick={() => setTab(n.id)} title={n.label}>
                  <Icon size={17} />
                  <span className="rail-label">{n.label}</span>
                  {badge > 0 && <span className="badge-n">{badge > 999 ? `${Math.round(badge / 100) / 10}k` : badge}</span>}
                </button>
              </span>
            );
          })}
        </nav>
        <div className="rail-foot">
          <ShieldCheck size={14} /> 100 % local
          <br />aucun envoi réseau
        </div>
      </aside>

      <div className="workspace">
        <header className="ops-header">
          <div>
            <div className="eyebrow">AGL · IMPORT <span>◆</span> GUCE — VÉRITÉ TERRAIN <span>◆</span> 100 % LOCAL</div>
            <h1>{TITLES[tab]} <span>· FDI & RFCV</span></h1>
          </div>
          <div className="header-actions">
            <span className="local-status">
              <span className="live-dot" />Local — rien ne part sur Internet
              <small>
                {[sources.guce && `${guceRows.length.toLocaleString("fr-FR")} GUCE`, sources.fdi && `${fdi.length} FDI`, sources.rfcv && `${rfcv.length} RFCV`, sources.spot && `${spotRows.length.toLocaleString("fr-FR")} SPOT`]
                  .filter(Boolean)
                  .join(" · ") || "En attente du croisement"}
              </small>
            </span>
            <button className="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}>
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="outline" onClick={exportWord} disabled={busy || !loaded}>
              <FileText size={15} /> Word
            </button>
            <button className="primary" onClick={exportExcel} disabled={busy || !loaded}>
              <Download size={15} /> Excel
            </button>
          </div>
        </header>

        <div className="page">
          {notice && (
            <div className="notice">
              {notice}{" "}
              <button className="icon-btn" onClick={() => setNotice("")} aria-label="Fermer">
                <X size={13} />
              </button>
            </div>
          )}

          {!loaded && tab !== "imports" && (
            <div className="notice warn">
              Aucun croisement lancé. Rendez-vous sur <b>Imports</b> : déposez tous les fichiers en une fois,
              contrôlez la reconnaissance, puis cliquez <b>Lancer le croisement</b>.
              <button className="primary" style={{ marginLeft: 12 }} onClick={() => setTab("imports")}>
                <Upload size={14} /> Aller aux imports
              </button>
            </div>
          )}

          {tab === "pilotage" && (
            <>
              <div className="metrics">
                <button className="metric" onClick={() => { resetFilters(); setTab("dossiers"); }}>
                  <span>GUCE · VÉRITÉ TERRAIN</span>
                  <strong>{guceRows.length.toLocaleString("fr-FR")}</strong>
                  <small>Cliquez : voir les dossiers GUCE</small>
                </button>
                <button className={`metric${etatFdi === "sans-guce" ? " on" : ""}`} onClick={() => goFdi("sans-guce")}>
                  <span>FDI SANS GUCE</span>
                  <strong>{fdiSansCount}</strong>
                  <small>Cliquez : liste à déverser / vérifier</small>
                </button>
                <button className={`metric${etatRfcv === "sans-guce" ? " on" : ""}`} onClick={() => goRfcv("sans-guce")}>
                  <span>RFCV SANS GUCE</span>
                  <strong>{rfcvSansCount}</strong>
                  <small>Cliquez : liste à rapprocher</small>
                </button>
                <button className="metric" onClick={() => { resetFilters(); setTab("ecarts"); }}>
                  <span>TOUS LES ÉCARTS</span>
                  <strong>{ecartsTotal.toLocaleString("fr-FR")}</strong>
                  <small>Cliquez : absents de chaque état</small>
                </button>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <h3>FDI OpenTrade × GUCE</h3>
                  <p className="sub">Clé : N° FDI ↔ NUMERO_DEMANDE (TVF).</p>
                  <Donut parts={fdiDonut} />
                  <div className="kv">
                    <span>Taux rapprochement<b>{fdi.length ? Math.round((fdi.filter((f) => f.etat === "rapproche").length / fdi.length) * 100) : 0} %</b></span>
                    <span>Terminés<b>{fdi.filter((f) => norm(f.row.etape).includes("termine")).length}</b></span>
                    <span>Brouillons<b>{fdi.filter((f) => norm(f.row.etape).includes("brouillon")).length}</b></span>
                  </div>
                  <p style={{ marginTop: 12 }}>
                    <button className="outline" onClick={() => goFdi("rapproche")}>Voir rapprochés</button>{" "}
                    <button className="primary" onClick={() => goFdi("sans-guce")}>Voir sans GUCE</button>
                  </p>
                </div>
                <div className="panel">
                  <h3>RFCV OpenTrade × GUCE × SPOT</h3>
                  <p className="sub">Clés : N° RFCV ↔ NUMERO (RFCV) · Dossier SPOT ↔ SPOT.</p>
                  <Donut parts={rfcvDonut} />
                  <div className="kv">
                    <span>Liés SPOT<b>{rfcv.filter((f) => f.spotEtat === "lie-spot").length}</b></span>
                    <span>Sans écho SPOT<b>{rfcv.filter((f) => f.spotEtat === "sans-spot").length}</b></span>
                    <span>SPOT {sources.spot ? "chargé" : "non chargé"}<b>{spotRows.length.toLocaleString("fr-FR")}</b></span>
                  </div>
                  <p style={{ marginTop: 12 }}>
                    <button className="outline" onClick={() => goRfcv("rapproche")}>Voir rapprochés</button>{" "}
                    <button className="primary" onClick={() => goRfcv("sans-guce")}>Voir sans GUCE</button>
                  </p>
                </div>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <h3>GUCE par MODULE</h3>
                  <p className="sub">TVF ≈ FDI · RFCV ≈ RFCV · EC, E-LICENCE… contexte.</p>
                  <Bars data={guceModules} top={10} />
                </div>
                <div className="panel">
                  <h3>GUCE par STATUT</h3>
                  <p className="sub">VALIDATED / SENT OK = aboutis · CANCELLED / REJECTED = à purger.</p>
                  <Bars data={guceStatuts} top={10} />
                </div>
              </div>

              <div className="panel">
                <h3>Top clients — FDI sans GUCE</h3>
                <p className="sub">Sur qui concentrer la relance de déversement ?</p>
                <Bars data={countBy(fdi.filter((f) => f.etat === "sans-guce"), (f) => f.row.client)} />
              </div>
            </>
          )}

          {tab === "supervision" && (
            <>
              <div className="steps">
                <span className={`step ${loaded ? "done" : "on"}`}>1 · Chargement</span>
                <span className={`step ${launch ? "done" : staged.length ? "on" : ""}`}>2 · Reconnaissance</span>
                <span className={`step ${launch ? "done" : ""}`}>3 · Croisement lancé</span>
                <span className="step">4 · Exploitation</span>
              </div>
              {!sources.guce && loaded && (
                <div className="notice warn">
                  <b>GUCE absent :</b> sans la vérité terrain, les états « sans GUCE » ne sont pas vérifiables.
                  Rechargez l&apos;extraction GUCE dans Imports.
                </div>
              )}
              {!sources.spot && loaded && (
                <div className="notice">
                  <b>SPOT non chargé :</b> le lien RFCV ↔ SPOT est suspendu. Rappel : l&apos;extraction TCD 23-30 août
                  fournie est tronquée — ré-exportez-la complète.
                </div>
              )}
              <div className="sup-grid">
                {(["guce", "fdi", "rfcv", "spot"] as Source[]).map((s) => {
                  const info = supRows.find((r) => r.key.toLowerCase() === s);
                  return (
                    <div key={s} className="panel sup-card">
                      <h3>{s.toUpperCase()} {info?.vital && <span className="badge b-info">vérité terrain</span>}</h3>
                      {!info ? (
                        <p className="muted">Non chargé — <button className="outline" onClick={() => setTab("imports")}>Importer</button></p>
                      ) : (
                        <>
                          <p className="sub">{info.file}</p>
                          <div className="kv">
                            <span>Lignes<b>{info.rows.toLocaleString("fr-FR")}</b></span>
                            <span>Mapping<b>{info.cov.mapped}/{info.cov.total} ({info.cov.pct}%)</b></span>
                          </div>
                          <p className="muted">Période : {info.range.min} → {info.range.max}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="panel">
                <h3>Dernier lancement</h3>
                {!launch ? (
                  <p className="muted">Aucun croisement lancé pour l&apos;instant — déposez les fichiers dans Imports.</p>
                ) : (
                  <>
                    <p className="sub">Lancé le {new Date(launch.at).toLocaleString("fr-FR")}</p>
                    <ul className="muted">
                      {launch.files.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                    <div className="kv">
                      <span>FDI rapprochés<b>{fdi.filter((f) => f.etat === "rapproche").length}/{fdi.length}</b></span>
                      <span>RFCV rapprochés<b>{rfcv.filter((f) => f.etat === "rapproche").length}/{rfcv.length}</b></span>
                      <span>Écarts totaux<b>{ecartsTotal.toLocaleString("fr-FR")}</b></span>
                    </div>
                  </>
                )}
                <p style={{ marginTop: 12 }}>
                  <button className="outline" onClick={() => setTab("imports")}><Upload size={14} /> Compléter / relancer (Imports)</button>{" "}
                  <button className="primary" onClick={() => setTab("ecarts")}>Voir les écarts</button>
                </p>
              </div>
            </>
          )}

          {(tab === "fdi" || tab === "rfcv" || tab === "dossiers" || tab === "spot" || tab === "ecarts") && (
            <div className="filter-bar">
              <span className="search-box">
                <Search size={14} />
                <input
                  placeholder="Recherche : client, facture, N°, agent…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="icon-btn" onClick={() => setSearch("")} aria-label="Effacer">
                    <X size={13} />
                  </button>
                )}
              </span>
              <span className="date-filter">
                Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </span>
              {(tab === "fdi" || tab === "rfcv") && (
                <>
                  <select value={etape} onChange={(e) => setEtape(e.target.value)} title="Étape OpenTrade">
                    <option value="all">Toutes étapes</option>
                    {(tab === "fdi" ? fdiEtapes : rfcvEtapes).map((s) => (
                      <option key={s.label} value={s.label}>{s.label} ({s.count})</option>
                    ))}
                  </select>
                  <select value={unite} onChange={(e) => setUnite(e.target.value)} title="Unité">
                    <option value="all">Toutes unités</option>
                    {(tab === "fdi" ? fdiUnites : rfcvUnites).map((s) => (
                      <option key={s.label} value={s.label}>{s.label} ({s.count})</option>
                    ))}
                  </select>
                </>
              )}
              {tab === "fdi" && (
                <select value={etatFdi} onChange={(e) => setEtatFdi(e.target.value)} title="État croisement">
                  <option value="all">Tous états</option>
                  <option value="rapproche">Rapproché GUCE ({fdi.filter((f) => f.etat === "rapproche").length})</option>
                  <option value="sans-guce">FDI sans GUCE ({fdiSansCount})</option>
                  <option value="sans-numero">Sans N° FDI ({fdi.filter((f) => f.etat === "sans-numero").length})</option>
                </select>
              )}
              {tab === "rfcv" && (
                <select value={etatRfcv} onChange={(e) => setEtatRfcv(e.target.value)} title="État croisement">
                  <option value="all">Tous états</option>
                  <option value="rapproche">Rapproché GUCE ({rfcv.filter((f) => f.etat === "rapproche").length})</option>
                  <option value="sans-guce">RFCV sans GUCE ({rfcvSansCount})</option>
                  <option value="sans-numero">Sans N° RFCV ({rfcv.filter((f) => f.etat === "sans-numero").length})</option>
                </select>
              )}
              {tab === "dossiers" && (
                <select value={moduleGuce} onChange={(e) => setModuleGuce(e.target.value)} title="Module GUCE">
                  <option value="all">Tous modules</option>
                  {guceModules.map((s) => (
                    <option key={s.label} value={s.label}>{s.label} ({s.count})</option>
                  ))}
                </select>
              )}
              <button className="outline" onClick={resetFilters}>Réinitialiser</button>
            </div>
          )}

          {tab === "fdi" && (
            <div className="panel">
              <h3>FDI croisés — {fdiF.length} ligne(s)</h3>
              <p className="sub">Export Excel filtré via le bouton Excel de l&apos;en-tête.</p>
              <div className="table-scroll">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>État</th><th>N° FDI</th><th>Client</th><th>Facture</th><th>Étape</th>
                      <th>Créé le</th><th>Unité</th><th>GUCE statut</th><th>GUCE importateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fdiF.slice(0, limit).map((f, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${f.etat === "rapproche" ? "b-ok" : f.etat === "sans-guce" ? "b-err" : "b-grey"}`}>
                            {ETAT_FDI[f.etat]}
                          </span>
                        </td>
                        <td><b>{f.row.numeroFdi || "—"}</b><br /><span className="muted">{f.row.reference}</span></td>
                        <td className="wrap">{f.row.client}</td>
                        <td>{f.row.facture}</td>
                        <td>{f.row.etape}<br /><span className="muted">{f.row.sla}</span></td>
                        <td>{f.row.dateCreation}</td>
                        <td>{f.row.unite}</td>
                        <td>{f.guce?.statut || "—"}</td>
                        <td className="wrap">{f.guce?.importateur || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fdiF.length > limit && (
                <p><button className="outline" onClick={() => setLimit(limit + 300)}>Afficher plus ({fdiF.length - limit} restants)</button></p>
              )}
            </div>
          )}

          {tab === "rfcv" && (
            <div className="panel">
              <h3>RFCV croisés — {rfcvF.length} ligne(s)</h3>
              <p className="sub">OpenTrade ne déverse pas les RFCV dans SPOT : la colonne SPOT rapproche via N° Dossier SPOT.</p>
              <div className="table-scroll">
                <table className="grid">
                  <thead>
                    <tr>
                      <th>État GUCE</th><th>N° RFCV</th><th>Client</th><th>Dossier SPOT</th><th>Lien SPOT</th>
                      <th>Étape</th><th>Créé le</th><th>Unité</th><th>GUCE statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfcvF.slice(0, limit).map((f, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${f.etat === "rapproche" ? "b-ok" : f.etat === "sans-guce" ? "b-err" : "b-grey"}`}>
                            {ETAT_RFCV[f.etat]}
                          </span>
                        </td>
                        <td><b>{f.row.numeroRfcv || "—"}</b><br /><span className="muted">Tr. {f.row.transaction || "—"}</span></td>
                        <td className="wrap">{f.row.client}</td>
                        <td>{f.row.dossierSpot || "—"}</td>
                        <td>
                          <span className={`badge ${f.spotEtat === "lie-spot" ? "b-ok" : f.spotEtat === "sans-spot" ? "b-warn" : "b-grey"}`}>
                            {f.spotEtat === "lie-spot" ? `Lié (${f.spotCount})` : f.spotEtat === "sans-spot" ? "Sans écho" : f.spotEtat === "spot-non-charge" ? "SPOT —" : "—"}
                          </span>
                        </td>
                        <td>{f.row.etape}<br /><span className="muted">{f.row.respect}</span></td>
                        <td>{f.row.dateCreation}</td>
                        <td>{f.row.unite}</td>
                        <td>{f.guce?.statut || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rfcvF.length > limit && (
                <p><button className="outline" onClick={() => setLimit(limit + 300)}>Afficher plus ({rfcvF.length - limit} restants)</button></p>
              )}
            </div>
          )}

          {tab === "spot" && (
            <div className="panel">
              <h3>SPOT — {spotRows.length.toLocaleString("fr-FR")} ligne(s)</h3>
              <p className="sub">
                {sources.spot
                  ? `Fichier : ${sources.spot.fileName}.`
                  : "Aucune extraction SPOT chargée. Allez sur Imports."}
              </p>
              {sources.spot && (
                <div className="table-scroll">
                  <table className="grid">
                    <thead>
                      <tr><th>Dossier</th><th>Client</th><th>Facture</th><th>Montant</th><th>Date</th><th>TCD</th></tr>
                    </thead>
                    <tbody>
                      {spotRows
                        .filter((s) => matchSearch([s.dossier, s.client, s.facture, s.tcd], search) && dateOk(s.date))
                        .slice(0, limit)
                        .map((s, i) => (
                          <tr key={i}>
                            <td><b>{s.dossier || "—"}</b></td>
                            <td className="wrap">{s.client || "—"}</td>
                            <td>{s.facture || "—"}</td>
                            <td>{s.montant || "—"}</td>
                            <td>{s.date || "—"}</td>
                            <td>{s.tcd || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "ecarts" && (
            <>
              <div className="panel">
                <h3><span className="badge b-err">{ecFdiSans.length}</span> FDI OpenTrade absents du GUCE</h3>
                <p className="sub">N° FDI attribués mais introuvables au GUCE : à déverser / vérifier.</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead><tr><th>N° FDI</th><th>Client</th><th>Facture</th><th>Étape</th><th>Créé le</th></tr></thead>
                    <tbody>
                      {ecFdiSans.slice(0, limit).map((f, i) => (
                        <tr key={i}><td><b>{f.row.numeroFdi}</b></td><td className="wrap">{f.row.client}</td><td>{f.row.facture}</td><td>{f.row.etape}</td><td>{f.row.dateCreation}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p><button className="primary" onClick={() => goFdi("sans-guce")}>Ouvrir la liste complète</button></p>
              </div>
              <div className="panel">
                <h3><span className="badge b-err">{ecRfcvSans.length}</span> RFCV OpenTrade absents du GUCE</h3>
                <p className="sub">N° RFCV avec Transaction mais sans écho GUCE (MODULE RFCV).</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead><tr><th>N° RFCV</th><th>Transaction</th><th>Client</th><th>Dossier SPOT</th><th>Étape</th></tr></thead>
                    <tbody>
                      {ecRfcvSans.slice(0, limit).map((f, i) => (
                        <tr key={i}><td><b>{f.row.numeroRfcv}</b></td><td>{f.row.transaction}</td><td className="wrap">{f.row.client}</td><td>{f.row.dossierSpot || "—"}</td><td>{f.row.etape}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p><button className="primary" onClick={() => goRfcv("sans-guce")}>Ouvrir la liste complète</button></p>
              </div>
              <div className="panel">
                <h3><span className="badge b-warn">{ecSansNum.length}</span> Dossiers sans N° (brouillons / collecte)</h3>
                <p className="sub">Encours normal de saisie : sans N° FDI/RFCV attribué.</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead><tr><th>Type</th><th>Référence</th><th>Client</th><th>Étape</th><th>Créé le</th><th>Unité</th></tr></thead>
                    <tbody>
                      {ecSansNum.slice(0, limit).map((r, i) => (
                        <tr key={i}><td>{r.type}</td><td>{r.ref}</td><td className="wrap">{r.client}</td><td>{r.etape}</td><td>{r.date}</td><td>{r.unite}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel">
                <h3><span className="badge b-info">{ecOrph.length.toLocaleString("fr-FR")}</span> GUCE orphelins (TVF/RFCV sans OpenTrade)</h3>
                <p className="sub">Créés hors OpenTrade ou via un autre canal.</p>
                <Bars data={countBy(ecOrph, (o) => o.importateur)} top={10} />
              </div>
              <div className="panel">
                <h3><span className="badge b-warn">{ecRfcvSansSpot.length}</span> RFCV sans écho SPOT</h3>
                <p className="sub">N° Dossier SPOT sans correspondance dans l&apos;extraction SPOT.</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead><tr><th>N° RFCV</th><th>Client</th><th>Dossier SPOT</th><th>Créé le</th></tr></thead>
                    <tbody>
                      {ecRfcvSansSpot.slice(0, limit).map((f, i) => (
                        <tr key={i}><td><b>{f.row.numeroRfcv || "—"}</b></td><td className="wrap">{f.row.client}</td><td>{f.row.dossierSpot}</td><td>{f.row.dateCreation}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="panel">
                <h3><span className="badge b-info">{ecSpotSansRfcv.length.toLocaleString("fr-FR")}</span> SPOT sans RFCV (sens inverse)</h3>
                <p className="sub">Dossiers SPOT qu&apos;aucun RFCV ne réclame : hors périmètre ou RFCV à créer.</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead><tr><th>Dossier</th><th>Client</th><th>Facture</th><th>Date</th></tr></thead>
                    <tbody>
                      {ecSpotSansRfcv.slice(0, limit).map((s, i) => (
                        <tr key={i}><td><b>{s.dossier}</b></td><td className="wrap">{s.client}</td><td>{s.facture}</td><td>{s.date}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === "recherche" && (
            <div className="panel">
              <h3>Recherche par numéro — tous les états en une fois</h3>
              <p className="sub">Saisissez un N° FDI (260…), N° RFCV (RCS…), N° Transaction (166…), dossier SPOT, facture ou référence : la plateforme retrouve le dossier dans GUCE, OpenTrade et SPOT.</p>
              <span className="search-box" style={{ maxWidth: 520 }}>
                <Search size={16} />
                <input
                  placeholder="Ex : 260156418 · RCS26127059 · 1665482 · 26200924 · n° facture…"
                  value={numeroQ}
                  onChange={(e) => setNumeroQ(e.target.value)}
                  style={{ fontSize: 14 }}
                />
                {numeroQ && (
                  <button className="icon-btn" onClick={() => setNumeroQ("")} aria-label="Effacer">
                    <X size={14} />
                  </button>
                )}
              </span>
              {!numeroRes && <p className="muted" style={{ marginTop: 14 }}>En attente d&apos;un numéro…</p>}
              {numeroRes && (
                <div style={{ marginTop: 14 }}>
                  {numeroRes.guce.length + numeroRes.fdi.length + numeroRes.rfcv.length + numeroRes.spot.length === 0 && (
                    <p className="muted">Aucun dossier trouvé pour « {numeroQ} » dans les 4 états.</p>
                  )}
                  {numeroRes.guce.length > 0 && (
                    <>
                      <h3><span className="badge b-ok">GUCE · {numeroRes.guce.length}</span> vérité terrain</h3>
                      <div className="table-scroll">
                        <table className="grid">
                          <thead><tr><th>NUMERO</th><th>MODULE</th><th>IMPORTATEUR</th><th>STATUT</th><th>FOB</th><th>Créé le</th></tr></thead>
                          <tbody>
                            {numeroRes.guce.map((g, i) => (
                              <tr key={i}><td><b>{g.numero}</b></td><td>{g.module}</td><td className="wrap">{g.importateur}</td><td>{g.statut}</td><td>{g.valeurFob}</td><td>{g.dateCreation}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {numeroRes.fdi.length > 0 && (
                    <>
                      <h3 style={{ marginTop: 16 }}><span className="badge b-info">OpenTrade FDI · {numeroRes.fdi.length}</span></h3>
                      <div className="table-scroll">
                        <table className="grid">
                          <thead><tr><th>N° FDI</th><th>Client</th><th>Facture</th><th>Étape</th><th>État GUCE</th></tr></thead>
                          <tbody>
                            {numeroRes.fdi.map((f, i) => (
                              <tr key={i}><td><b>{f.row.numeroFdi || "—"}</b></td><td className="wrap">{f.row.client}</td><td>{f.row.facture}</td><td>{f.row.etape}</td><td>{ETAT_FDI[f.etat]}{f.guce ? ` (${f.guce.statut})` : ""}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {numeroRes.rfcv.length > 0 && (
                    <>
                      <h3 style={{ marginTop: 16 }}><span className="badge b-info">OpenTrade RFCV · {numeroRes.rfcv.length}</span></h3>
                      <div className="table-scroll">
                        <table className="grid">
                          <thead><tr><th>N° RFCV</th><th>Transaction</th><th>Dossier SPOT</th><th>Client</th><th>État GUCE</th></tr></thead>
                          <tbody>
                            {numeroRes.rfcv.map((f, i) => (
                              <tr key={i}><td><b>{f.row.numeroRfcv || "—"}</b></td><td>{f.row.transaction}</td><td>{f.row.dossierSpot || "—"}</td><td className="wrap">{f.row.client}</td><td>{ETAT_RFCV[f.etat]}{f.guce ? ` (${f.guce.statut})` : ""}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  {numeroRes.spot.length > 0 && (
                    <>
                      <h3 style={{ marginTop: 16 }}><span className="badge b-grey">SPOT · {numeroRes.spot.length}</span></h3>
                      <div className="table-scroll">
                        <table className="grid">
                          <thead><tr><th>Dossier</th><th>Client</th><th>Facture</th><th>Montant</th><th>Date</th></tr></thead>
                          <tbody>
                            {numeroRes.spot.map((s, i) => (
                              <tr key={i}><td><b>{s.dossier}</b></td><td className="wrap">{s.client}</td><td>{s.facture}</td><td>{s.montant}</td><td>{s.date}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "dossiers" && (
            <>
              <div className="panel">
                <h3>GUCE — {guceF.length.toLocaleString("fr-FR")} dossier(s)</h3>
                <p className="sub">Source véridique. TVF ≈ FDI, RFCV ≈ RFCV.</p>
                <div className="table-scroll">
                  <table className="grid">
                    <thead>
                      <tr><th>NUMERO</th><th>MODULE</th><th>IMPORTATEUR</th><th>STATUT</th><th>FOB</th><th>Créé le</th><th>Rapproché OT</th></tr>
                    </thead>
                    <tbody>
                      {guceF.slice(0, limit).map((g, i) => {
                        const k = keyNumero(g.numero);
                        const rap = fdi.some((f) => f.key === k && f.etat === "rapproche") || rfcv.some((f) => f.key === k && f.etat === "rapproche");
                        return (
                          <tr key={i}>
                            <td><b>{g.numero}</b></td>
                            <td>{g.module}</td>
                            <td className="wrap">{g.importateur}</td>
                            <td>{g.statut}</td>
                            <td>{g.valeurFob}</td>
                            <td>{g.dateCreation}</td>
                            <td>
                              <span className={`badge ${rap ? "b-ok" : "b-warn"}`}>{rap ? "Oui" : "Non"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {guceF.length > limit && (
                  <p><button className="outline" onClick={() => setLimit(limit + 500)}>Afficher plus ({(guceF.length - limit).toLocaleString("fr-FR")} restants)</button></p>
                )}
              </div>
              <div className="panel">
                <h3>GUCE orphelins (TVF/RFCV sans OpenTrade) — {orph.length.toLocaleString("fr-FR")}</h3>
                <p className="sub">Dossiers GUCE créés hors OpenTrade ou via un autre canal : détail complet dans Écarts.</p>
                <Bars data={countBy(orph, (o) => o.importateur)} top={10} />
                <p><button className="outline" onClick={() => { resetFilters(); setTab("ecarts"); }}>Ouvrir les écarts</button></p>
              </div>
            </>
          )}

          {tab === "insights" && (
            <>
              <div className="panel">
                <h3>Insights — cliquez pour voir les dossiers</h3>
                <p className="sub">Chaque carte applique le filtre correspondant.</p>
                {!insights.length && <p className="muted">Chargez au moins un fichier pour générer les insights.</p>}
                {insights.map((ins, i) => (
                  <button
                    key={i}
                    className="insight"
                    onClick={() => {
                      if (ins.title.includes("FDI OpenTrade absents")) goFdi("sans-guce");
                      else if (ins.title.includes("FDI sans N°")) { resetFilters(); setEtatFdi("sans-numero"); setTab("fdi"); }
                      else if (ins.title.includes("RFCV OpenTrade absents")) goRfcv("sans-guce");
                      else if (ins.title.includes("RFCV sans N°")) { resetFilters(); setEtatRfcv("sans-numero"); setTab("rfcv"); }
                      else if (ins.title.includes("SPOT")) setTab("imports");
                      else if (ins.title.includes("TVF") || ins.title.includes("RFCV GUCE")) { resetFilters(); setTab("ecarts"); }
                      else if (ins.title.includes("dépassement")) setTab("ecarts");
                    }}
                  >
                    <span className={`badge lvl ${ins.level === "danger" ? "b-err" : ins.level === "warn" ? "b-warn" : ins.level === "ok" ? "b-ok" : "b-info"}`}>
                      {ins.count} · {ins.level}
                    </span>
                    <b>{ins.title}</b>
                    <p>{ins.detail}</p>
                  </button>
                ))}
              </div>
              <div className="grid-2">
                <div className="panel">
                  <h3>FDI par unité</h3>
                  <Bars data={fdiUnites} />
                </div>
                <div className="panel">
                  <h3>RFCV par unité</h3>
                  <Bars data={rfcvUnites} />
                </div>
              </div>
            </>
          )}

          {tab === "imports" && (
            <>
              <div className="notice">
                <ShieldCheck size={14} /> <b>Chargement groupé, 100 % local.</b> Déposez tous les fichiers en une fois :
                la plateforme <b>reconnaît</b> chaque source (GUCE / FDI / RFCV / SPOT), vous validez le mapping,
                puis vous cliquez <b>Lancer le croisement</b>. Rien n&apos;est calculé ni envoyé avant ce clic.
              </div>
              {!sources.spot && staged.every((s) => effectiveSource(s) !== "spot") && (
                <div className="notice warn">
                  <b>SPOT :</b> l&apos;extraction « TCD 23-30 août » fournie est <b>tronquée/illisible</b>.
                  Ré-exportez l&apos;extraction SPOT/OpenTrade complète puis déposez-la ici.
                </div>
              )}
              <div className="panel">
                <h3>Étape 1+2 · Dépôt groupé & reconnaissance</h3>
                <p className="sub">Bulk accepté, y compris GUCE 80 000+ lignes. La zone se vide après chaque lancement.</p>
                <BulkImporter staged={staged} setStaged={setStaged} onLaunch={handleLaunch} />
              </div>
              {loaded && (
                <div className="panel">
                  <h3>Sources actives (dernier croisement)</h3>
                  <ul className="muted">
                    {filesMeta.map((f, i) => (
                      <li key={i}>{f.label} : {f.fileName} — {f.rows.toLocaleString("fr-FR")} lignes — mapping {f.mapped}/{f.total}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="panel">
                <h3>Exports & rapports</h3>
                <p className="sub">Excel : Synthèse + <b>Interprétation</b> + <b>Métadonnées</b> + onglets croisés. Word : synthèse, écarts, interprétation détaillée, métadonnées.</p>
                <p>
                  <label className="muted">Signataire du rapport (optionnel, mémorisé)</label>
                  <input placeholder="Nom de l'opérateur…" value={author} onChange={(e) => setAuthorPersist(e.target.value)} style={{ maxWidth: 320 }} />
                </p>
                <p>
                  <button className="primary" onClick={exportExcel} disabled={busy || !loaded}>
                    <Download size={15} /> Export Excel croisé
                  </button>{" "}
                  <button className="outline" onClick={exportWord} disabled={busy || !loaded}>
                    <FileText size={15} /> Rapport Word
                  </button>
                </p>
              </div>
            </>
          )}

          <p className="muted" style={{ marginTop: 18 }}>
            AGL — Croisement Déclarations Import · GUCE (vérité terrain) · SPOT (outil métier) · OpenTrade (aide à la saisie) ·
            OpenTrade ne déverse pas les FDI/RFCV dans SPOT : ce croisement comble ce manque. Données 100 % locales.
          </p>
        </div>
      </div>
    </div>
  );
}

type Source = "guce" | "fdi" | "rfcv" | "spot";
