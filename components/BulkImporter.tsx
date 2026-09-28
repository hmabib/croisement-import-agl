"use client";

import { useRef, useState } from "react";
import { FileUp, Trash2, Play, CheckCircle2, HelpCircle, Eraser } from "lucide-react";
import {
  coverage,
  mapFnFor,
  recognizeSource,
  type FieldMap,
  type SourceName,
  type SourceScore,
} from "@/lib/cross";

export type LoadedSource = {
  name: SourceName;
  fileName: string;
  header: string[];
  rows: string[][];
  map: FieldMap;
  unmapped: string[];
};

export type StagedFile = {
  id: string;
  fileName: string;
  sheet: string;
  size: number;
  header: string[];
  rows: string[][];
  detected: SourceName | "inconnu";
  scores: SourceScore[];
  assigned: SourceName | "ignorer" | "auto";
  map: FieldMap;
  unmapped: string[];
};

const SOURCE_LABEL: Record<SourceName, string> = {
  guce: "GUCE",
  fdi: "FDI",
  rfcv: "RFCV",
  spot: "SPOT",
};

const FIELD_LABELS: Record<SourceName, Record<string, string>> = {
  guce: {
    numero: "NUMERO_DEMANDE", module: "MODULE", codeImportateur: "CODE_IMPORTATEUR", importateur: "IMPORTATEUR",
    codeExportateur: "CODE_EXPORTATEUR", exportateur: "EXPORTATEUR", valeurFob: "VALEUR_FOB", statut: "STATUT",
    dateCreation: "DATE_CREATION", lastUpdate: "LAST_UPDATE", userCreateur: "CREATEUR", dernierUser: "DERNIER_USER",
  },
  fdi: {
    reference: "Reference", dateCreation: "Date création", client: "Client", dateDemande: "Date demande",
    dateDocsComplets: "Docs complets", facture: "N° facture", dateSoumission: "Soumission", dateFdi: "Date FDI",
    numeroFdi: "N° FDI", dateTransmission: "Transmission", etape: "Étape", agent: "Agent",
    observations: "Observations", echeance: "Échéance", sla: "SLA", unite: "Unité",
  },
  rfcv: {
    reference: "Reference", dateCreation: "Date création", client: "Client", dossierSpot: "Dossier SPOT",
    dateDemande: "Date demande", dateDocsComplets: "Docs complets", facture: "N° facture", dateRfcv: "Date RFCV",
    numeroRfcv: "N° RFCV", dateTransmission: "Transmission", transaction: "N° Transaction", etape: "Étape",
    agent: "Agent", observations: "Observations", echeance: "Échéance", respect: "Respect échéance", unite: "Unité",
  },
  spot: {
    dossier: "Dossier", facture: "Facture", client: "Client", montant: "Montant", date: "Date", tcd: "TCD",
  },
};

export function effectiveSource(sf: StagedFile): SourceName | null {
  if (sf.assigned === "ignorer") return null;
  if (sf.assigned !== "auto") return sf.assigned;
  return sf.detected === "inconnu" ? null : sf.detected;
}

/** Parse 100 % local : le fichier ne quitte jamais le navigateur. */
async function parseFile(f: File): Promise<Omit<StagedFile, "id" | "detected" | "scores" | "assigned" | "map" | "unmapped">> {
  const XLSX = await import("xlsx");
  const buf = await f.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  // Feuille la plus fournie (les exports SPOT/OpenTrade ont ~10 onglets).
  let best = wb.SheetNames[0];
  let bestLen = -1;
  for (const n of wb.SheetNames) {
    const ws = wb.Sheets[n];
    const ref = ws["!ref"] || "";
    const m = ref.match(/:([A-Z]+)(\d+)$/);
    const len = m ? Number(m[2]) : 0;
    if (len > bestLen) {
      bestLen = len;
      best = n;
    }
  }
  const ws = wb.Sheets[best];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true }) as unknown[][];
  let hi = 0;
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const texts = (aoa[i] || []).filter((c) => typeof c === "string" && c.trim().length > 1).length;
    if (texts >= 3) {
      hi = i;
      break;
    }
  }
  const header = ((aoa[hi] || []) as unknown[]).map((c) =>
    c instanceof Date ? c.toISOString() : String(c ?? "").trim(),
  );
  if (!header.some((h) => h)) throw new Error("En-tête introuvable : vérifiez le fichier.");
  const rows = (aoa.slice(hi + 1) as unknown[][])
    .map((r) =>
      header.map((_, i) => {
        const c = r[i];
        if (c instanceof Date) return c.toISOString().slice(0, 10);
        return String(c ?? "").trim();
      }),
    )
    .filter((r) => r.some((c) => c !== ""));
  return { fileName: f.name, sheet: best, size: f.size, header, rows };
}

let SEQ = 0;

export default function BulkImporter({
  staged,
  setStaged,
  onLaunch,
}: {
  staged: StagedFile[];
  setStaged: (s: StagedFile[]) => void;
  onLaunch: (record: Record<SourceName, LoadedSource | null>, files: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function addFiles(files: FileList | File[]) {
    setBusy(true);
    setErrors([]);
    const errs: string[] = [];
    const next: StagedFile[] = [];
    for (const f of Array.from(files)) {
      try {
        const p = await parseFile(f);
        const rec = recognizeSource(p.header);
        const mapSrc = rec.best === "inconnu" ? rec.scores[0].source : rec.best;
        const { map, unmapped } = mapFnFor(mapSrc)(p.header);
        next.push({
          ...p,
          id: `${Date.now()}-${SEQ++}`,
          detected: rec.best,
          scores: rec.scores,
          assigned: "auto",
          map,
          unmapped,
        });
      } catch (e) {
        const msg = (e as Error).message || "Lecture impossible.";
        errs.push(
          `${f.name} : ` +
            (/zip|corrupt|trunca|invalid|header|ref/i.test(msg) && /spot|tcd|extraction/i.test(f.name)
              ? "fichier illisible (archive tronquée — cas constaté sur l'extraction SPOT TCD 23-30 août : ré-exportez puis rechargez)."
              : msg),
        );
      }
    }
    setStaged([...staged, ...next]);
    setErrors(errs);
    setBusy(false);
  }

  function reassign(id: string, assigned: StagedFile["assigned"]) {
    setStaged(
      staged.map((sf) => {
        if (sf.id !== id) return sf;
        if (assigned === "auto" || assigned === "ignorer") return { ...sf, assigned };
        const { map, unmapped } = mapFnFor(assigned)(sf.header);
        return { ...sf, assigned, map, unmapped };
      }),
    );
  }

  function remap(id: string, map: FieldMap) {
    setStaged(staged.map((sf) => (sf.id === id ? { ...sf, map } : sf)));
  }

  const ready = staged.filter((sf) => effectiveSource(sf) != null);
  const waiting = staged.filter((sf) => effectiveSource(sf) == null);

  function launch() {
    const record: Record<SourceName, LoadedSource | null> = { guce: null, fdi: null, rfcv: null, spot: null };
    const files: string[] = [];
    for (const sf of staged) {
      const src = effectiveSource(sf);
      if (!src) continue;
      record[src] = {
        name: src,
        fileName: `${sf.fileName} · « ${sf.sheet} »`,
        header: sf.header,
        rows: sf.rows,
        map: sf.map,
        unmapped: sf.unmapped,
      };
      files.push(`${SOURCE_LABEL[src]} ← ${sf.fileName}`);
    }
    onLaunch(record, files);
  }

  return (
    <div>
      <button
        className="dropzone"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
      >
        <FileUp size={22} />
        <b>{busy ? "Lecture locale en cours…" : "Déposez TOUS les fichiers ici (GUCE + FDI + RFCV + SPOT)"}</b>
        <span>Cliquez pour sélectionner plusieurs fichiers · bulk accepté · 100 % local, rien n&apos;est envoyé</span>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </button>

      {errors.map((e, i) => (
        <p key={i} className="error-text">⚠ {e}</p>
      ))}

      {staged.length > 0 && (
        <div className="stage-list">
          {staged.map((sf) => {
            const eff = effectiveSource(sf);
            const cov = coverage(sf.map);
            const bestScore = sf.scores[0];
            return (
              <div key={sf.id} className="stage-card">
                <div className="stage-head">
                  <div>
                    <b>{sf.fileName}</b>
                    <small>
                      « {sf.sheet} » · {sf.rows.length.toLocaleString("fr-FR")} lignes ·{" "}
                      {(sf.size / 1024 / 1024).toFixed(1)} Mo
                    </small>
                  </div>
                  <button className="icon-btn" onClick={() => setStaged(staged.filter((s) => s.id !== sf.id))} title="Retirer">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="stage-recog">
                  {sf.detected !== "inconnu" ? (
                    <span className="badge b-ok">
                      <CheckCircle2 size={12} /> Reconnu : {SOURCE_LABEL[sf.detected]} ·{" "}
                      {Math.round(Math.min(1, bestScore.score) * 100)} %
                    </span>
                  ) : (
                    <span className="badge b-warn">
                      <HelpCircle size={12} /> Non reconnu — assignez la source manuellement
                    </span>
                  )}
                  <label>
                    Source retenue
                    <select value={sf.assigned} onChange={(e) => reassign(sf.id, e.target.value as StagedFile["assigned"])}>
                      <option value="auto">
                        Auto{sf.detected !== "inconnu" ? ` (${SOURCE_LABEL[sf.detected]})` : " (à assigner)"}
                      </option>
                      <option value="guce">GUCE — vérité terrain</option>
                      <option value="fdi">OpenTrade — FDI</option>
                      <option value="rfcv">OpenTrade — RFCV</option>
                      <option value="spot">SPOT — extraction métier</option>
                      <option value="ignorer">Ignorer ce fichier</option>
                    </select>
                  </label>
                </div>
                {eff && (
                  <p className="muted">
                    Mappage {SOURCE_LABEL[eff]} : <b>{cov.mapped}/{cov.total}</b> champs ({cov.pct} %)
                    {sf.unmapped.length > 0 && ` · ${sf.unmapped.length} colonne(s) conservée(s) hors mapping`}
                  </p>
                )}
                {eff && (
                  <details>
                    <summary>Correspondance des colonnes — {SOURCE_LABEL[eff]} (modifiable avant lancement)</summary>
                    <div className="map-grid">
                      {Object.keys(sf.map).map((f) => (
                        <label key={f}>
                          <span>{FIELD_LABELS[eff][f] || f}</span>
                          <select
                            value={sf.map[f] == null ? "" : String(sf.map[f])}
                            onChange={(e) => remap(sf.id, { ...sf.map, [f]: e.target.value === "" ? null : Number(e.target.value) })}
                          >
                            <option value="">— non mappé —</option>
                            {sf.header.map((h, i) => (
                              <option key={i} value={i}>{h || `COL ${i + 1}`}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <p className="muted">Scores de reconnaissance : {sf.scores.map((s) => `${SOURCE_LABEL[s.source]} ${Math.round(Math.min(1, s.score) * 100)}%`).join(" · ")}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {staged.length > 0 && (
        <div className="launch-bar">
          <span className="muted">
            <b>{ready.length}</b> fichier(s) prêt(s)
            {waiting.length > 0 && <> · <b>{waiting.length}</b> en attente d&apos;assignation</>}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="outline" onClick={() => setStaged([])}>
              <Eraser size={14} /> Tout effacer
            </button>
            <button className="primary big" onClick={launch} disabled={ready.length === 0}>
              <Play size={16} /> Lancer le croisement ({ready.length})
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
