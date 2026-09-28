import * as XLSX from "xlsx";
import type { FdiCross, GuceRow, Insight, RfcvCross, SpotRow } from "./cross";
import { buildInterpretation, buildMetadata, type ReportMeta } from "./report-content";

export type ExportInput = {
  fdi: FdiCross[];
  rfcv: RfcvCross[];
  orphelins: GuceRow[];
  spotSansRfcv: SpotRow[];
  spot: SpotRow[];
  insights: Insight[];
  kpis: { label: string; value: number | string }[];
  meta: ReportMeta;
};

export function exportWorkbook(input: ExportInput) {
  const book = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["Indicateur", "Valeur"],
      ...input.kpis.map((k) => [k.label, k.value]),
    ]),
    "Synthese",
  );

  // Page d'interprétation : guide de lecture explicite de chaque indicateur.
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ["Indicateur", "Valeur constatée", "Lecture (comment l'interpréter)", "Action recommandée"],
      ...buildInterpretation(input.kpis).map((b) => [b.indicateur, b.valeur, b.lecture, b.action]),
    ]),
    "Interpretation",
  );

  // Page de métadonnées : traçabilité complète du croisement.
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([["Champ", "Valeur"], ...buildMetadata(input.meta)]),
    "Metadonnees",
  );

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(
      input.fdi.map((f) => ({
        Reference: f.row.reference,
        Date_creation: f.row.dateCreation,
        Client: f.row.client,
        Facture: f.row.facture,
        Date_demande: f.row.dateDemande,
        Date_docs_complets: f.row.dateDocsComplets,
        Date_soumission: f.row.dateSoumission,
        Date_FDI: f.row.dateFdi,
        N_FDI: f.row.numeroFdi,
        Date_transmission: f.row.dateTransmission,
        Etape_OpenTrade: f.row.etape,
        Agent: f.row.agent,
        SLA: f.row.sla,
        Unite: f.row.unite,
        Etat_croisement:
          f.etat === "rapproche" ? "Rapproché GUCE" : f.etat === "sans-guce" ? "FDI sans GUCE" : "Sans N° FDI",
        GUCE_statut: f.guce?.statut || "",
        GUCE_module: f.guce?.module || "",
        GUCE_importateur: f.guce?.importateur || "",
        GUCE_exportateur: f.guce?.exportateur || "",
        GUCE_valeur_FOB: f.guce?.valeurFob || "",
        GUCE_date_creation: f.guce?.dateCreation || "",
      })),
    ),
    "FDI_croise",
  );

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(
      input.rfcv.map((f) => ({
        Reference: f.row.reference,
        Date_creation: f.row.dateCreation,
        Client: f.row.client,
        Dossier_SPOT: f.row.dossierSpot,
        Facture: f.row.facture,
        Date_demande: f.row.dateDemande,
        Date_docs_complets: f.row.dateDocsComplets,
        Date_RFCV: f.row.dateRfcv,
        N_RFCV: f.row.numeroRfcv,
        Date_transmission: f.row.dateTransmission,
        N_Transaction: f.row.transaction,
        Etape_OpenTrade: f.row.etape,
        Agent: f.row.agent,
        Respect_echeance: f.row.respect,
        Unite: f.row.unite,
        Etat_croisement:
          f.etat === "rapproche" ? "Rapproché GUCE" : f.etat === "sans-guce" ? "RFCV sans GUCE" : "Sans N° RFCV",
        GUCE_statut: f.guce?.statut || "",
        GUCE_importateur: f.guce?.importateur || "",
        GUCE_date_creation: f.guce?.dateCreation || "",
        Lien_SPOT:
          f.spotEtat === "lie-spot"
            ? `Lié SPOT (${f.spotCount})`
            : f.spotEtat === "sans-spot"
              ? "Dossier SPOT sans écho"
              : f.spotEtat === "spot-non-charge"
                ? "SPOT non chargé"
                : "Sans dossier",
      })),
    ),
    "RFCV_croise",
  );

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(
      input.orphelins.map((g) => ({
        NUMERO_DEMANDE: g.numero,
        MODULE: g.module,
        IMPORTATEUR: g.importateur,
        EXPORTATEUR: g.exportateur,
        VALEUR_FOB: g.valeurFob,
        STATUT: g.statut,
        DATE_CREATION: g.dateCreation,
        DERNIER_UTILISATEUR: g.dernierUser,
      })),
    ),
    "GUCE_orphelins",
  );

  if (input.spot.length) {
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        input.spot.map((s) => ({
          Dossier: s.dossier,
          Facture: s.facture,
          Client: s.client,
          Montant: s.montant,
          Date: s.date,
          TCD: s.tcd,
        })),
      ),
      "SPOT",
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        input.spotSansRfcv.map((s) => ({
          Dossier: s.dossier,
          Facture: s.facture,
          Client: s.client,
          Montant: s.montant,
          Date: s.date,
          TCD: s.tcd,
        })),
      ),
      "SPOT_sans_RFCV",
    );
  }

  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.json_to_sheet(
      input.insights.map((i) => ({
        Niveau: i.level,
        Titre: i.title,
        Detail: i.detail,
        Nombre: i.count,
      })),
    ),
    "Insights",
  );

  // Largeurs lisibles pour les pages de lecture.
  for (const name of ["Synthese", "Interpretation", "Metadonnees"]) {
    const ws = book.Sheets[name];
    if (ws) ws["!cols"] = [{ wch: 34 }, { wch: 26 }, { wch: 110 }, { wch: 90 }].slice(0, 4);
  }

  XLSX.writeFile(book, `Croisement_Import_GUCE_SPOT_OpenTrade_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
