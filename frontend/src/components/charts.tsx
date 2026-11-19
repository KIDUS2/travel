import { useState, type ReactNode } from 'react';

/**
 * Small, dependency-free charts in the Teguwaz style.
 * Categorical order (validated for color-blind separation and contrast):
 * green, blue, amber. Single-series charts use green only.
 */
export const SERIES = ['#06742A', '#2F6FB0', '#C27C0E'] as const;

export const fmt = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-US'));

export interface BarDatum { label: string; value: number; detail?: string }

/** Vertical bars over time or categories, with hover tooltips and a table view. */
export function BarChart({ data, height = 200, color = SERIES[0], title, unit = '' }: {
  data: BarDatum[]; height?: number; color?: string; title: string; unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { l: 48, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length);
  const barW = Math.max(3, Math.min(28, bw * 0.62));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  const allWhole = data.every((d) => Number.isInteger(d.value));
  const ticks = allWhole && !Number.isInteger(nice / 2) ? [0, nice] : [0, nice / 2, nice];
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <figure className="chart" style={{ margin: 0 }}>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#E7E1D2" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="#5E5648">{fmt(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.l + i * bw + (bw - barW) / 2;
            const top = y(d.value);
            const h = Math.max(0, H - pad.b - top);
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                {h > 0 ? <path d={roundedTop(x, top, barW, h, Math.min(4, barW / 2))} fill={color} opacity={hover == null || hover === i ? 1 : 0.45} /> : null}
                {i % labelEvery === 0 ? <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#5E5648">{d.label}</text> : null}
              </g>
            );
          })}
        </svg>
        {hover != null ? (
          <div className="chart-tip" style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
            <strong>{fmt(data[hover].value)}{unit}</strong>
            <span>{data[hover].detail ?? data[hover].label}</span>
          </div>
        ) : null}
      </div>
      <TableView caption={title} rows={data.map((d) => [d.detail ?? d.label, `${d.value.toLocaleString('en-US')}${unit}`])} />
    </figure>
  );
}

/** Horizontal ranked bars with direct labels: one color, sorted by value. */
export function RankedBars({ items, color = SERIES[0], empty = 'Nothing yet' }: {
  items: { label: ReactNode; value: number; key: string }[]; color?: string; empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="muted small" style={{ margin: 0 }}>{empty}</p>;
  return (
    <ul className="ranked">
      {[...items].sort((a, b) => b.value - a.value).map((it) => (
        <li key={it.key}>
          <span className="ranked-label">{it.label}</span>
          <span className="ranked-track"><span style={{ width: `${(it.value / max) * 100}%`, background: color }} /></span>
          <span className="ranked-value">{fmt(it.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Parts of a whole as one bar with 2px gaps; direct labels double as the legend. */
export function SplitBar({ parts, label }: { parts: { label: string; value: number; color: string }[]; label: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="split" role="img" aria-label={`${label}: ${parts.map((p) => `${p.label} ${p.value}`).join(', ')}`}>
      <div className="split-bar">
        {total === 0 ? <span style={{ flex: 1, background: '#F0ECE0' }} /> : parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.label} title={`${p.label}: ${p.value}`} style={{ flex: p.value, background: p.color }} />
        ))}
      </div>
      <ul className="split-legend">
        {parts.map((p) => (
          <li key={p.label}>
            <span className="dot" style={{ background: p.color, borderRadius: 3 }} />
            {p.label} <strong>{p.value}</strong>
            <span className="muted">{total ? ` · ${Math.round((p.value / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'up' | 'muted' }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {note ? <span className={`kpi-note${tone === 'up' ? ' up' : ''}`}>{note}</span> : null}
    </div>
  );
}

function TableView({ caption, rows }: { caption: string; rows: string[][] }) {
  return (
    <details className="chart-table">
      <summary>Show as table</summary>
      <table className="data" style={{ minWidth: 0 }}>
        <caption className="sr-only">{caption}</caption>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r[0]}</td><td style={{ textAlign: 'right' }}>{r[1]}</td></tr>)}</tbody>
      </table>
    </details>
  );
}

function niceMax(v: number) {
  if (v <= 4) return Math.max(2, Math.ceil(v));
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
