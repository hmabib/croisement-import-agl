import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { FdiCross, GuceRow, Insight, RfcvCross } from "./cross";

export type WordReportInput = {
  at: string;
  author: string;
  kpis: { label: string; value: number | string }[];
  fdiSansGuce: FdiCross[];
  rfcvSansGuce: RfcvCross[];
  orphelins: GuceRow[];
  insights: Insight[];
};

const NAVY = "0A2240";
const RED = "E4002B";
const GREY = "5D7186";
const ROW_SHADING = "F2F5F9";

const cell = (text: string, opts: { bold?: boolean; color?: string; shade?: boolean } = {}) =>
  new TableCell({
    width: { size: 1, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: ROW_SHADING } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "—", bold: opts.bold, size: 18, color: opts.color || "000000" })],
      }),
    ],
  });

const head = (text: string) =>
  new TableCell({
    width: { size: 1, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: NAVY },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, color: "FFFFFF" })],
      }),
    ],
  });

function table(widths: number[], header: string[], rows: string[][]) {
  return new Table({
    columnWidths: widths,
    rows: [
      new TableRow({ children: header.map(head) }),
      ...rows.map(
        (r, i) => new TableRow({ children: r.map((c, j) => cell(c, { shade: i % 2 === 1, bold: j === 0 })) }),
      ),
    ],
  });
}

/** Rapport Word : synthèse + écarts FDI/RFCV + orphelins GUCE + insights. */
export async function buildWordReport(input: WordReportInput): Promise<Blob> {
  const fdiRows = input.fdiSansGuce.slice(0, 200).map((f) => [
    f.row.numeroFdi || "—",
    f.row.client || "—",
    f.row.facture || "—",
    f.row.etape || "—",
    f.row.dateCreation || "—",
    f.row.unite || "—",
  ]);
  const rfcvRows = input.rfcvSansGuce.slice(0, 200).map((f) => [
    f.row.numeroRfcv || f.row.transaction || "—",
    f.row.client || "—",
    f.row.dossierSpot || "—",
    f.row.etape || "—",
    f.row.dateCreation || "—",
    f.row.unite || "—",
  ]);
  const orphRows = input.orphelins.slice(0, 200).map((g) => [
    g.numero,
    g.module,
    g.importateur || "—",
    g.statut || "—",
    g.dateCreation || "—",
  ]);
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: "Croisement Déclarations Import — GUCE / SPOT / OpenTrade", color: NAVY })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Édité le ${new Date(input.at).toLocaleString("fr-FR")}${input.author ? ` · par ${input.author}` : ""} · GUCE = source véridique. 100 % local, aucun envoi réseau.`,
                size: 20,
                color: GREY,
              }),
            ],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1 · Synthèse", color: NAVY })] }),
          ...input.kpis.map(
            (k) =>
              new Paragraph({
                children: [new TextRun({ text: `${k.label} : ${k.value}`, size: 22 })],
              }),
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "2 · Insights", color: RED })],
          }),
          ...input.insights.map(
            (i) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${i.title} (${i.count}) — `, size: 20, bold: true }),
                  new TextRun({ text: i.detail, size: 20 }),
                ],
              }),
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "3 · FDI OpenTrade sans écho GUCE", color: NAVY })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${input.fdiSansGuce.length} dossiers concernés${fdiRows.length < input.fdiSansGuce.length ? ` (${fdiRows.length} premiers affichés)` : ""}. À déverser / vérifier côté GUCE.`,
                size: 20,
                color: GREY,
              }),
            ],
          }),
          table(
            [1500, 2200, 1500, 1700, 1300, 900],
            ["N° FDI", "Client", "Facture", "Étape", "Créé le", "Unité"],
            fdiRows,
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "4 · RFCV OpenTrade sans écho GUCE", color: NAVY })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${input.rfcvSansGuce.length} dossiers concernés${rfcvRows.length < input.rfcvSansGuce.length ? ` (${rfcvRows.length} premiers affichés)` : ""}.`,
                size: 20,
                color: GREY,
              }),
            ],
          }),
          table(
            [1500, 2200, 1500, 1700, 1300, 900],
            ["N° RFCV", "Client", "Dossier SPOT", "Étape", "Créé le", "Unité"],
            rfcvRows,
          ),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "5 · Dossiers GUCE sans OpenTrade (TVF/RFCV)", color: NAVY })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${input.orphelins.length} dossiers GUCE sans pendant OpenTrade${orphRows.length < input.orphelins.length ? ` (${orphRows.length} premiers affichés)` : ""} : créés hors OpenTrade ou autre canal.`,
                size: 20,
                color: GREY,
              }),
            ],
          }),
          table(
            [1700, 1000, 2500, 1500, 1400],
            ["NUMERO", "MODULE", "IMPORTATEUR", "STATUT", "CRÉÉ LE"],
            orphRows,
          ),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}
