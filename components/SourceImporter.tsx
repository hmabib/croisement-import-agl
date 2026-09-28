"use client";

import { useRef, useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import type { FieldMap, SourceName } from "@/lib/cross";

export type LoadedSource = {
  name: SourceName;
  fileName: string;
  header: string[];
  rows: string[][];
  map: FieldMap;
  unmapped: string[];
  error?: string;
};

const LABELS: Record<SourceName, { title: string; hint: string; accept: string }> = {
  guce: {
    title: "GUCE — vérité terrain",
    hint: "DOSSIERS_GUCE_AGL_*.xlsx · NUMERO_DEMANDE, MODULE, STATUT…",
    accept: ".xlsx,.xls,.csv",
  },
  fdi: {
    title: "OpenTrade — FDI",
    hint: "fdis-*.xlsx · Reference, N° FDI, Étape, Unité…",
    accept: ".xlsx,.xls,.csv",
  },
  rfcv: {
    title: "OpenTrade — RFCV",
    hint: "rfcvs-*.xlsx · N° RFCV, Transaction, Dossier SPOT…",
    accept: ".xlsx,.xls,.csv",
  },
  spot: {
    title: "SPOT — extraction métier",
    hint: "EXTRACTION-SPOT-*.xlsx · dossier, facture, client…",
    accept: ".xlsx,.xls,.csv",
  },
};

const FIELD_LABELS: Record<string, Record<string, string>> = {
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

export default function SourceImporter({
  name,
  value,
  mapFn,
  onLoad,
  onClear,
  onRemap,
}: {
  name: SourceName;
  value: LoadedSource | null;
  mapFn: (header: string[]) => { map: FieldMap; unmapped: string[] };
  onLoad: (s: LoadedSource) => void;
  onClear: () => void;
  onRemap: (map: FieldMap) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const meta = LABELS[name];

  async function handleFile(f: File) {
    setBusy(true);
    setError("");
    try {
      // Import local uniquement : le fichier ne quitte jamais le navigateur.
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      // Prend la feuille la plus fournie (les exports SPOT ont 10 onglets).
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
      const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "", raw: true }) as unknown[][];
      // Ligne d'en-tête = première ligne contenant au moins 3 cellules texte non vides.
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
      const body = (aoa.slice(hi + 1) as unknown[][]).map((r) =>
        header.map((_, i) => {
          const c = r[i];
          if (c instanceof Date) return c.toISOString().slice(0, 10);
          return String(c ?? "").trim();
        }),
      ).filter((r) => r.some((c) => c !== ""));
      if (!header.some((h) => h)) throw new Error("En-tête introuvable : vérifiez le fichier.");
      const { map, unmapped } = mapFn(header);
      onLoad({ name, fileName: `${f.name} · onglet « ${best} »`, header, rows: body, map, unmapped });
    } catch (e) {
      const msg = (e as Error).message || "Lecture impossible.";
      // Cas connu : l'extraction SPOT/OpenTrade TCD 23-30 août est tronquée (zip incomplet).
      setError(
        name === "spot" && /zip|corrupt|trunca|invalid/i.test(msg)
          ? "Fichier SPOT illisible (archive tronquée, cas constaté sur l'extraction TCD 23-30 août). Ré-exportez l'extraction SPOT/OpenTrade puis rechargez-la ici."
          : `Lecture impossible : ${msg}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const fields = value ? Object.keys(value.map) : [];
  const mapped = value ? fields.filter((f) => value.map[f] != null).length : 0;

  return (
    <div className="src-card">
      <div className="src-head">
        <div>
          <b>{meta.title}</b>
          <small>{meta.hint}</small>
        </div>
        {value && (
          <button className="icon-btn" onClick={onClear} title="Retirer ce fichier">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {!value ? (
        <button
          className="dropzone"
          disabled={busy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
        >
          <FileUp size={20} />
          <span>{busy ? "Lecture locale…" : "Cliquez ou déposez le fichier (bulk accepté, 100 % local)"}</span>
          <input
            ref={input}
            type="file"
            accept={meta.accept}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </button>
      ) : (
        <div className="src-loaded">
          <p className="src-file">
            <CheckCircle2 size={14} /> {value.fileName} — <b>{value.rows.length.toLocaleString("fr-FR")}</b> lignes
          </p>
          <p className="muted">
            {mapped}/{fields.length} champs reconnus
            {value.unmapped.length > 0 && ` · ${value.unmapped.length} colonne(s) non mappée(s) conservée(s)`}
          </p>
          <details>
            <summary>Correspondance des colonnes (modifiable)</summary>
            <div className="map-grid">
              {fields.map((f) => (
                <label key={f}>
                  <span>{FIELD_LABELS[name][f] || f}</span>
                  <select
                    value={value.map[f] == null ? "" : String(value.map[f])}
                    onChange={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      onRemap({ ...value.map, [f]: v });
                    }}
                  >
                    <option value="">— non mappé —</option>
                    {value.header.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `COL ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
        </div>
      )}
      {error && (
        <p className="error-text">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
    </div>
  );
}
