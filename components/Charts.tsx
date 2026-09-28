"use client";

export function Bars({ data, top = 8 }: { data: { label: string; count: number }[]; top?: number }) {
  const rows = data.slice(0, top);
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="muted">Aucune donnée.</p>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.label} className="bar-row" title={`${r.label} : ${r.count}`}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(3, Math.round((r.count / max) * 100))}%` }} />
          </span>
          <b className="bar-count">{r.count}</b>
        </div>
      ))}
    </div>
  );
}

export function Donut({ parts }: { parts: { label: string; count: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.count, 0) || 1;
  let acc = 0;
  const segs = parts.map((p) => {
    const from = (acc / total) * 100;
    acc += p.count;
    const to = (acc / total) * 100;
    return `${p.color} ${from}% ${to}%`;
  });
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${segs.join(", ")})` }}>
        <div className="donut-hole">
          <b>{total}</b>
          <small>dossiers</small>
        </div>
      </div>
      <ul className="donut-legend">
        {parts.map((p) => (
          <li key={p.label}>
            <i style={{ background: p.color }} /> {p.label} <b>{p.count}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
