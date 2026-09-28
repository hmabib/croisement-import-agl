"use client";

import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  FileCheck2,
  FileWarning,
  Database,
  Table2,
  Lightbulb,
  Upload,
  Download,
  FileText,
  Search,
  Sun,
  Moon,
  ShieldCheck,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import SourceImporter, { type LoadedSource } from "@/components/SourceImporter";
import { Bars, Donut } from "@/components/Charts";
import {
  buildFdi,
  buildGuce,
  buildInsights,
  buildRfcv,
  buildSpot,
  countBy,
  crossFdi,
  crossRfcv,
  guceOrphelins,
  inDateRange,
  keyDossier,
  keyNumero,
  mapFdi,
  mapGuce,
  mapRfcv,
  mapSpot,
  matchSearch,
  norm,
  type FdiCross,
  type RfcvCross,
} from "@/lib/cross";
import "./operations.css";

type Tab = "pilotage" | "fdi" | "rfcv" | "spot" | "dossiers" | "insights" | "imports";

const NAV: { id: Tab; icon: typeof LayoutDashboard; label: string; group: string }[] = [
  { id: "pilotage", icon: LayoutDashboard, label: "Pilotage", group: "Suivi" },
  { id: "fdi", icon: FileCheck2, label: "FDI × GUCE", group: "Croisements" },
  { id: "rfcv", icon: FileWarning, label: "RFCV × GUCE × SPOT", group: "Croisements" },
  { id: "spot", icon: Database, label: "SPOT", group: "Croisements" },
  { id: "dossiers", icon: Table2, label: "Dossiers", group: "Données" },
  { id: "insights", icon: Lightbulb, label: "Insights", group: "Données" },
  { id: "imports", icon: Upload, label: "Imports", group: "Données" },
];

const TITLES: Record<Tab, string> = {
  pilotage: "Pilotage du croisement",
  fdi: "FDI OpenTrade × GUCE",
  rfcv: "RFCV OpenTrade × GUCE × SPOT",
  spot: "Extraction SPOT",
  dossiers: "Dossiers · table unifiée",
  insights: "Insights automatiques",
  imports: "Imports · chargement manuel local",
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

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tab, setTab] = useState<Tab>("pilotage");
  const [sources, setSources] = useState<Record<string, LoadedSource | null>>({
    guce: null,
    fdi: null,
    rfcv: null,
    spot: null,
  });
  const [search, setSearch] = useState("");
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

  const setSrc = (name: string, s: LoadedSource | null) =>
    setSources((p) => ({ ...p, [name]: s }));

  // ---------- Jeux de données typés ----------
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
    () =>
      sources.spot ? buildSpot(sources.spot.header, sources.spot.rows, sources.spot.map) : [],
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

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const fR = fdi.filter((f) => f.etat === "rapproche").length;
    const fS = fdi.filter((f) => f.etat === "sans-guce").length;
    const rR = rfcv.filter((f) => f.etat === "rapproche").length;
    const rS = rfcv.filter((f) => f.etat === "sans-guce").length;
    const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
    return [
      { label: "GUCE (TOTAL)", value: guceRows.length },
      { label: "FDI rapprochés", value: `${fR}/${fdi.length} · ${pct(fR, fdi.length)}%` },
      { label: "FDI sans GUCE", value: fS },
      { label: "RFCV rapprochés", value: `${rR}/${rfcv.length} · ${pct(rR, rfcv.length)}%` },
      { label: "RFCV sans GUCE", value: rS },
      { label: "GUCE orphelins (TVF/RFCV)", value: orph.length },
      { label: "Lignes SPOT", value: spotRows.length },
      { label: "RFCV liés SPOT", value: rfcv.filter((f) => f.spotEtat === "lie-spot").length },
    ];
  }, [guceRows, fdi, rfcv, orph, spotRows]);

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
        spot: spotRows,
        spotHeader: sources.spot?.header || [],
        insights,
        kpis,
      });
      setNotice("Export Excel téléchargé (Synthèse, FDI_croise, RFCV_croise, GUCE_orphelins, SPOT, Insights).");
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
        insights,
      });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `Croisement_Import_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice("Rapport Word téléchargé.");
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

  return (
    <div className="ops-app" data-theme={theme}>
      <aside className="rail" aria-label="Navigation principale">
        <a className="rail-logo" href="#" onClick={(e) => { e.preventDefault(); setTab("pilotage"); }} aria-label="AGL — Accueil">
          <Logo theme="dark" />
        </a>
        <nav className="rail-links">
          {NAV.map((n, i) => {
            const newGroup = n.group !== NAV[i - 1]?.group;
            const Icon = n.icon;
            return (
              <span key={n.id}>
                {newGroup && <span className="rail-group">{n.group}</span>}
                <button className={tab === n.id ? "active" : ""} onClick={() => setTab(n.id)} title={n.label}>
                  <Icon size={17} />
                  <span className="rail-label">{n.label}</span>
                  {n.id === "fdi" && fdi.filter((f) => f.etat === "sans-guce").length > 0 && (
                    <span className="badge-n">{fdi.filter((f) => f.etat === "sans-guce").length}</span>
                  )}
                  {n.id === "rfcv" && rfcv.filter((f) => f.etat === "sans-guce").length > 0 && (
                    <span className="badge-n">{rfcv.filter((f) => f.etat === "sans-guce").length}</span>
                  )}
                  {n.id === "insights" && insights.length > 0 && (
                    <span className="badge-n">{insights.length}</span>
                  )}
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
                  .join(" · ") || "En attente des fichiers"}
              </small>
            </span>
            <button className="outline" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Thème clair / obscur">
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
              Aucun fichier chargé. Rendez-vous sur <b>Imports</b> et déposez vos 4 extractions
              (GUCE, FDI, RFCV, SPOT) — tout est traité dans le navigateur, rien n&apos;est envoyé.
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
                  <strong>{fdi.filter((f) => f.etat === "sans-guce").length}</strong>
                  <small>Cliquez : liste à déverser / vérifier</small>
                </button>
                <button className={`metric${etatRfcv === "sans-guce" ? " on" : ""}`} onClick={() => goRfcv("sans-guce")}>
                  <span>RFCV SANS GUCE</span>
                  <strong>{rfcv.filter((f) => f.etat === "sans-guce").length}</strong>
                  <small>Cliquez : liste à rapprocher</small>
                </button>
                <button className="metric" onClick={() => { resetFilters(); setTab("dossiers"); }}>
                  <span>GUCE ORPHELINS (TVF/RFCV)</span>
                  <strong>{orph.length.toLocaleString("fr-FR")}</strong>
                  <small>GUCE sans pendant OpenTrade</small>
                </button>
              </div>

              <div className="grid-2">
                <div className="panel">
                  <h3>FDI OpenTrade × GUCE</h3>
                  <p className="sub">Clé : N° FDI ↔ NUMERO_DEMANDE (TVF). Cliquez un onglet pour filtrer.</p>
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

              <div className="grid-2">
                <div className="panel">
                  <h3>FDI par étape OpenTrade</h3>
                  <p className="sub">Où s&apos;accumulent les dossiers ?</p>
                  <Bars data={fdiEtapes} />
                </div>
                <div className="panel">
                  <h3>RFCV par étape OpenTrade</h3>
                  <p className="sub">Brouillons = sans N° · Terminés = à retrouver au GUCE.</p>
                  <Bars data={rfcvEtapes} />
                </div>
              </div>

              <div className="panel">
                <h3>Top clients — FDI sans GUCE</h3>
                <p className="sub">Sur qui concentrer la relance de déversement ?</p>
                <Bars data={countBy(fdi.filter((f) => f.etat === "sans-guce"), (f) => f.row.client)} />
              </div>
            </>
          )}

          {(tab === "fdi" || tab === "rfcv" || tab === "dossiers" || tab === "spot") && (
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
                  <option value="sans-guce">FDI sans GUCE ({fdi.filter((f) => f.etat === "sans-guce").length})</option>
                  <option value="sans-numero">Sans N° FDI ({fdi.filter((f) => f.etat === "sans-numero").length})</option>
                </select>
              )}
              {tab === "rfcv" && (
                <select value={etatRfcv} onChange={(e) => setEtatRfcv(e.target.value)} title="État croisement">
                  <option value="all">Tous états</option>
                  <option value="rapproche">Rapproché GUCE ({rfcv.filter((f) => f.etat === "rapproche").length})</option>
                  <option value="sans-guce">RFCV sans GUCE ({rfcv.filter((f) => f.etat === "sans-guce").length})</option>
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
              <p className="sub">Export Excel filtré via le bouton Excel de l&apos;en-tête. Hausse de limite ci-dessous.</p>
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
                  ? `Fichier : ${sources.spot.fileName}. Colonnes reconnues : dossier, facture, client, montant, date, TCD (voir Imports pour ajuster).`
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

          {tab === "dossiers" && (
            <>
              <div className="panel">
                <h3>GUCE — {guceF.length.toLocaleString("fr-FR")} dossier(s)</h3>
                <p className="sub">Source véridique. Filtrez par module (TVF ≈ FDI, RFCV ≈ RFCV) et par date de création.</p>
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
                <p className="sub">Dossiers GUCE créés hors OpenTrade ou via un autre canal : à qualifier.</p>
                <Bars data={countBy(orph, (o) => o.importateur)} top={10} />
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
                      else if (ins.title.includes("TVF") || ins.title.includes("RFCV GUCE")) { resetFilters(); setTab("dossiers"); }
                      else if (ins.title.includes("dépassement")) setTab("insights");
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
                <ShieldCheck size={14} /> <b>Chargement manuel, 100 % local.</b> Les fichiers sont lus
                dans votre navigateur (bulk accepté, y compris GUCE 80 000+ lignes). Rien n&apos;est envoyé
                sur Internet — le déploiement Vercel n&apos;héberge que l&apos;interface vide.
              </div>
              {!sources.spot && (
                <div className="notice warn">
                  <b>SPOT :</b> l&apos;extraction « TCD 23-30 août » fournie est <b>tronquée/illisible</b>
                  (archive ZIP incomplète). Ré-exportez l&apos;extraction SPOT/OpenTrade complète puis
                  déposez-la ci-dessous — la plateforme choisira automatiquement l&apos;onglet le plus fourni.
                </div>
              )}
              <div className="src-grid">
                <SourceImporter name="guce" value={sources.guce} mapFn={mapGuce}
                  onLoad={(s) => { setSrc("guce", s); setNotice(`GUCE chargé : ${s.rows.length.toLocaleString("fr-FR")} lignes.`); }}
                  onClear={() => setSrc("guce", null)}
                  onRemap={(map) => sources.guce && setSrc("guce", { ...sources.guce, map })} />
                <SourceImporter name="fdi" value={sources.fdi} mapFn={mapFdi}
                  onLoad={(s) => { setSrc("fdi", s); setNotice(`FDI chargés : ${s.rows.length} lignes.`); }}
                  onClear={() => setSrc("fdi", null)}
                  onRemap={(map) => sources.fdi && setSrc("fdi", { ...sources.fdi, map })} />
                <SourceImporter name="rfcv" value={sources.rfcv} mapFn={mapRfcv}
                  onLoad={(s) => { setSrc("rfcv", s); setNotice(`RFCV chargés : ${s.rows.length} lignes.`); }}
                  onClear={() => setSrc("rfcv", null)}
                  onRemap={(map) => sources.rfcv && setSrc("rfcv", { ...sources.rfcv, map })} />
                <SourceImporter name="spot" value={sources.spot} mapFn={mapSpot}
                  onLoad={(s) => { setSrc("spot", s); setNotice(`SPOT chargé : ${s.rows.length.toLocaleString("fr-FR")} lignes.`); }}
                  onClear={() => setSrc("spot", null)}
                  onRemap={(map) => sources.spot && setSrc("spot", { ...sources.spot, map })} />
              </div>
              <div className="panel" style={{ marginTop: 14 }}>
                <h3>Exports & rapports</h3>
                <p className="sub">Excel multi-onglets (Synthèse, FDI_croise, RFCV_croise, GUCE_orphelins, SPOT, Insights) + rapport Word.</p>
                <p>
                  <label className="muted">Signataire du rapport (optionnel)</label>
                  <input placeholder="Nom de l'opérateur…" value={author} onChange={(e) => setAuthor(e.target.value)} style={{ maxWidth: 320 }} />
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
