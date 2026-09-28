import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AGL — Croisement Déclarations Import",
  description:
    "Croisement local GUCE / SPOT / OpenTrade : FDI & RFCV, statistiques cliquables, exports Excel et Word. 100% local, aucune donnée envoyée.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
