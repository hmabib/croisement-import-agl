import Image from "next/image";

/**
 * Logo officiel AGL (réutilisé d'AGL Vides).
 * - public/agl-logo.png : bleu marine sur fond clair
 * - public/agl-logo-white.png : blanc pour fond marine
 */
export default function Logo({
  height = 36,
  theme = "dark",
  title = "Croisement Import",
  sub = "GUCE · SPOT · OpenTrade",
}: {
  height?: number;
  theme?: "dark" | "light";
  title?: string;
  sub?: string;
}) {
  const src = theme === "dark" ? "/agl-logo-white.png" : "/agl-logo.png";
  const width = Math.round(height * 1.88);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <Image
        src={src}
        alt="AGL — Africa Global Logistics"
        width={width}
        height={height}
        priority
        style={{ objectFit: "contain" }}
      />
      <span style={{ lineHeight: 1.25 }}>
        <span className="agl-logo-title" style={{ display: "block", fontWeight: 800, fontSize: 15 }}>
          {title}
        </span>
        <span className="agl-logo-sub" style={{ display: "block", fontSize: 11 }}>
          {sub}
        </span>
      </span>
    </span>
  );
}
