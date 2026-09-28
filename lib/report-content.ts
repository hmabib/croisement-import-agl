// Contenu partagé des exports : interprétation (guide de lecture)
// et métadonnées (traçabilité). Utilisé par l'export Excel ET le rapport Word.

export type ReportFilesMeta = {
  label: string;
  fileName: string;
  rows: number;
  mapped: number;
  total: number;
  unmapped: string[];
}[];

export type ReportMeta = {
  at: string;
  author: string;
  appVersion: string;
  files: ReportFilesMeta;
  counts: { label: string; value: number | string }[];
};

export type InterpretationBlock = {
  indicateur: string;
  valeur: string;
  lecture: string;
  action: string;
};

const pctOf = (s: string): number | null => {
  const m = String(s).match(/(\d+)\s*%/);
  return m ? Number(m[1]) : null;
};

export function buildInterpretation(counts: { label: string; value: number | string }[]): InterpretationBlock[] {
  const get = (l: string) => String(counts.find((c) => c.label === l)?.value ?? "—");
  const num = (l: string) => Number(counts.find((c) => c.label === l)?.value ?? 0) || 0;
  const fdiRate = pctOf(get("FDI rapprochés"));
  const rfcvRate = pctOf(get("RFCV rapprochés"));
  const verdict = (r: number | null) =>
    r == null ? "non calculable (source manquante)" : r >= 95 ? "SAIN (≥ 95 %)" : r >= 80 ? "À SURVEILLER (80–95 %)" : "CRITIQUE (< 80 %)";

  return [
    {
      indicateur: "Règle d'or — GUCE = vérité terrain",
      valeur: "—",
      lecture:
        "Le GUCE (Guichet Unique) est la seule source officielle : un N° présent au GUCE existe administrativement, " +
        "un N° absent du GUCE n'est pas encore déversé ou doit être vérifié. OpenTrade est une aide à la saisie " +
        "(étape 1), le chargement GUCE est l'étape 2. SPOT est l'outil métier maison qui transite les opérations.",
      action: "En cas de désaccord entre deux sources, c'est toujours le statut GUCE qui tranche.",
    },
    {
      indicateur: "Taux de rapprochement FDI",
      valeur: get("FDI rapprochés"),
      lecture: `Part des FDI OpenTrade retrouvés au GUCE (MODULE TVF) : ${verdict(fdiRate)}. ` +
        "Un taux < 100 % est normal en continu (dossiers en cours de déversement) ; une dérive durable signale un " +
        "blocage de déversement ou des N° erronés.",
      action: "Relancer les dossiers « FDI sans GUCE » en commençant par les plus anciens et les clients récurrents.",
    },
    {
      indicateur: "FDI sans GUCE",
      valeur: get("FDI sans GUCE"),
      lecture: "N° FDI attribués par OpenTrade mais introuvables au GUCE : pas encore déversés, en rejet, ou N° saisi avec erreur.",
      action: "Vérifier chaque N° dans le GUCE, corriger les coquilles, déverser les dossiers en attente.",
    },
    {
      indicateur: "Taux de rapprochement RFCV",
      valeur: get("RFCV rapprochés"),
      lecture: `Part des RFCV OpenTrade retrouvés au GUCE (MODULE RFCV) : ${verdict(rfcvRate)}. Même lecture que les FDI.`,
      action: "Même conduite que les FDI : contrôle unitaire puis déversement.",
    },
    {
      indicateur: "RFCV sans GUCE",
      valeur: get("RFCV sans GUCE"),
      lecture: "N° RFCV (RCS…) avec Transaction OpenTrade mais sans écho GUCE.",
      action: "Prioriser les dossiers « Terminé » côté OpenTrade : ils devraient déjà être au GUCE.",
    },
    {
      indicateur: "Dossiers sans N° (brouillons)",
      valeur: `${num("FDI_brouillons_sans_num")} FDI · ${num("RFCV_brouillons_sans_num")} RFCV`,
      lecture: "Dossiers OpenTrade au stade Brouillon / Collecte documentaire, sans N° attribué : c'est l'encours normal de saisie.",
      action: "Surveiller le stock : un brouillon qui vieillit (> 15 jours) doit être relancé ou annulé.",
    },
    {
      indicateur: "GUCE orphelins (TVF/RFCV sans OpenTrade)",
      valeur: get("GUCE orphelins (TVF/RFCV)"),
      lecture: "Dossiers GUCE créés hors OpenTrade (autre canal, autre déclarant, FDI/RFCV papier). Volume élevé = normal si plusieurs canaux coexistent.",
      action: "Qualifier par importateur : identifier les flux structurellement hors OpenTrade pour les exclure du pilotage.",
    },
    {
      indicateur: "Lien RFCV ↔ SPOT",
      valeur: `${get("RFCV liés SPOT")} liés · ${get("RFCV sans écho SPOT")} sans écho`,
      lecture: "Rappel structurel : OpenTrade NE déverse PAS les FDI/RFCV dans SPOT. Le lien se fait manuellement via le N° Dossier SPOT. " +
        "Un « sans écho » signifie : dossier non encore créé dans SPOT, N° mal recopié, ou extraction SPOT partielle.",
      action: "Contrôler les N° Dossier SPOT sans écho, créer les dossiers SPOT manquants.",
    },
    {
      indicateur: "SPOT sans RFCV",
      valeur: get("SPOT sans RFCV"),
      lecture: "Dossiers SPOT qu'aucun RFCV ne réclame : opérations SPOT hors périmètre RFCV (autres régimes, dossiers internes) ou RFCV non encore saisi.",
      action: "Écarter les régimes hors périmètre ; pour le reste, créer le RFCV OpenTrade correspondant.",
    },
    {
      indicateur: "Dépassements d'échéance (overdue / late)",
      valeur: `${num("FDI_overdue")} FDI · ${num("RFCV_overdue")} RFCV`,
      lecture: "Dossiers dont l'échéance OpenTrade est dépassée : risque de pénalités et de blocage client.",
      action: "Traiter en priorité absolue, par ancienneté décroissante.",
    },
  ];
}

export function buildMetadata(meta: ReportMeta): [string, string][] {
  const rows: [string, string][] = [
    ["Date de génération", new Date(meta.at).toLocaleString("fr-FR")],
    ["Généré par", meta.author || "—"],
    ["Application", `Croisement Déclarations Import AGL v${meta.appVersion} (100 % locale, aucune donnée envoyée)`],
    ["Référentiel", "GUCE = vérité terrain · SPOT = outil métier maison · OpenTrade = aide à la saisie (étape 1, chargement GUCE = étape 2)"],
    ["Clé FDI ↔ GUCE", "N° FDI normalisé (chiffres) ↔ GUCE.NUMERO_DEMANDE, MODULE TVF de préférence"],
    ["Clé RFCV ↔ GUCE", "N° RFCV normalisé (RCS conservé, ex RCS26127059) ↔ GUCE.NUMERO_DEMANDE, MODULE RFCV"],
    ["Clé RFCV ↔ SPOT", "N° Dossier SPOT normalisé (premier bloc alphanumérique, ex « 26071195//3 » → 26071195)"],
    ["N° Transaction", "Identifiant interne OpenTrade (ex 1665482) : n'existe ni au GUCE ni dans SPOT"],
    ["Normalisation", "Majuscules, espaces/points/tirets supprimés ; dates FR (31/08/2026, 31 août 2026, 17-NOV-25) converties en ISO"],
    ["Reconnaissance auto", "Score = champs reconnus / champs attendus + bonus de signature ; seuil 30 %, en-dessous : assignation manuelle"],
    ["Seuils de lecture", "Taux rapprochement : ≥ 95 % sain · 80–95 % à surveiller · < 80 % critique"],
  ];
  meta.files.forEach((f) => {
    rows.push([
      `Fichier ${f.label}`,
      `${f.fileName} — ${f.rows.toLocaleString("fr-FR")} lignes — mapping ${f.mapped}/${f.total}` +
        (f.unmapped.length ? ` — hors mapping : ${f.unmapped.slice(0, 8).join(", ")}${f.unmapped.length > 8 ? "…" : ""}` : " — mapping complet"),
    ]);
  });
  rows.push(["Périmètre exporté", "Onglets FDI_croise / RFCV_croise = lignes FILTRÉES au moment de l'export (voir filtres ci-dessous si précisés) ; autres onglets = périmètre complet croisé"]);
  return rows;
}
