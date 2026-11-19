import { geoEqualEarth, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world110 from 'world-atlas/countries-110m.json';
import type { Memory } from '../api/types';
import { formatEthiopianAm } from '../lib/ethiopianDate';
import { regionName } from '../lib/regions';
import { Icon } from './Icon';

/**
 * Explore your travels on a world map you can move freely: drag to pan,
 * scroll or use +/− to zoom, jump to any country, tap a place to see its
 * memories. Detail increases as you zoom (Natural Earth 1:110m → 1:50m).
 */

type CountryProps = { name: string };
type CountryFeature = Feature<Geometry, CountryProps>;

const W = 1000;
const H = 560;

function countriesFrom(topo: unknown): CountryFeature[] {
  const t = topo as Topology<{ countries: GeometryCollection<CountryProps> }>;
  return (feature(t, t.objects.countries) as FeatureCollection<Geometry, CountryProps>).features;
}

const COUNTRIES_110 = countriesFrom(world110);
const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' });
const path = geoPath(projection);

interface Place {
  key: string;
  name: string;
  lat: number;
  lng: number;
  regionCode: string | null;
  memories: Memory[];
}

function placesFrom(memories: Memory[]): Place[] {
  const map = new Map<string, Place>();
  for (const m of memories) {
    if (m.latitude == null || m.longitude == null) continue;
    const key = (m.placeName?.trim().toLowerCase()) || `${m.latitude.toFixed(2)},${m.longitude.toFixed(2)}`;
    const p = map.get(key) ?? { key, name: m.placeName ?? m.title, lat: m.latitude, lng: m.longitude, regionCode: m.regionCode, memories: [] };
    p.memories.push(m);
    map.set(key, p);
  }
  return [...map.values()];
}

const SHORTCUTS: { label: string; am: string; bounds: [[number, number], [number, number]] }[] = [
  { label: 'World', am: 'ዓለም', bounds: [[-180, -58], [180, 80]] },
  { label: 'Africa', am: 'አፍሪካ', bounds: [[-18, -35], [52, 37.5]] },
  { label: 'East Africa', am: 'ምሥራቅ አፍሪካ', bounds: [[28, -6], [52, 18]] },
  { label: 'Ethiopia', am: 'ኢትዮጵያ', bounds: [[33, 3.3], [48, 15]] },
];

export function ExploreMap({ memories, visitedCountryIds }: { memories: Memory[]; visitedCountryIds: Set<string> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [detailed, setDetailed] = useState<CountryFeature[] | null>(null);
  const [ethiopia, setEthiopia] = useState<CountryFeature | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState('');

  const places = useMemo(() => placesFrom(memories), [memories]);

  // Set up drag / wheel / pinch zoom once.
  useEffect(() => {
    if (!svgRef.current) return;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 120])
      .translateExtent([[-W * 0.25, -H * 0.25], [W * 1.25, H * 1.25]])
      .on('zoom', (e) => setT(e.transform));
    zoomRef.current = z;
    select(svgRef.current).call(z).on('dblclick.zoom', null);
    // Start on the traveler's places if they have any.
    const pts = placesFrom(memories);
    if (pts.length) fitLngLat(pts.map((p) => [p.lng, p.lat]), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // More detail once zoomed in.
  useEffect(() => {
    if (t.k < 3 || detailed) return;
    let cancelled = false;
    import('world-atlas/countries-50m.json').then((m) => { if (!cancelled) setDetailed(countriesFrom(m.default)); });
    fetch('/geo/ethiopia-border.geojson').then((r) => (r.ok ? r.json() : null)).then((f) => { if (!cancelled && f?.geometry) setEthiopia(f); }).catch(() => {});
    return () => { cancelled = true; };
  }, [t.k, detailed]);

  const countries = t.k >= 3 && detailed ? detailed : COUNTRIES_110;

  // Country shapes don't change while zooming, so build them once per data set.
  const countryPaths = useMemo(() => countries.map((c) => {
    const id = String(c.id);
    const visited = visitedCountryIds.has(id);
    return (
      <path key={`${id}-${c.properties.name}`} d={path(c) ?? undefined} className={`xm-country${visited ? ' visited' : ''}`}
        vectorEffect="non-scaling-stroke" onMouseEnter={() => setHover(c.properties.name)} onMouseLeave={() => setHover(null)}
        onClick={() => zoomToFeature(c)}>
        <title>{c.properties.name}{visited ? ' · visited' : ''}</title>
      </path>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [countries, visitedCountryIds]);

  const sorted = useMemo(() => [...COUNTRIES_110].sort((a, b) => a.properties.name.localeCompare(b.properties.name)), []);
  const matches = query.trim()
    ? sorted.filter((c) => c.properties.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  function apply(transform: ZoomTransform, ms = 750) {
    if (!svgRef.current || !zoomRef.current) return;
    const sel = select(svgRef.current);
    if (ms) sel.transition().duration(ms).call(zoomRef.current.transform, transform);
    else sel.call(zoomRef.current.transform, transform);
  }

  function fitBox([[x0, y0], [x1, y1]]: [[number, number], [number, number]], ms = 750, maxK = 40) {
    const dx = Math.max(x1 - x0, 1);
    const dy = Math.max(y1 - y0, 1);
    const k = Math.max(1, Math.min(maxK, 0.85 / Math.max(dx / W, dy / H)));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    apply(zoomIdentity.translate(W / 2 - k * cx, H / 2 - k * cy).scale(k), ms);
  }

  function fitLngLat(points: [number, number][], ms = 750) {
    const xy = points.map((p) => projection(p)).filter((p): p is [number, number] => !!p);
    if (!xy.length) return;
    const xs = xy.map((p) => p[0]);
    const ys = xy.map((p) => p[1]);
    const pad = 12;
    fitBox([[Math.min(...xs) - pad, Math.min(...ys) - pad], [Math.max(...xs) + pad, Math.max(...ys) + pad]], ms, 30);
  }

  function zoomToFeature(f: CountryFeature) {
    fitBox(path.bounds(f) as [[number, number], [number, number]]);
    setQuery('');
  }

  function zoomBy(factor: number) {
    if (!svgRef.current || !zoomRef.current) return;
    select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, factor);
  }

  const pinR = Math.min(9, 4 + Math.log2(t.k));
  const showLabels = t.k >= 4;

  return (
    <div className="xm">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="xm-svg" role="img"
        aria-label={`World map, zoom ×${t.k.toFixed(1)}. ${places.length} places with memories.`}>
        <rect width={W} height={H} fill="#DCEBEF" />
        <g transform={t.toString()}>
          <path d={path({ type: 'Sphere' }) ?? undefined} fill="#E4F0F3" stroke="#C3D7DD" vectorEffect="non-scaling-stroke" />
          {countryPaths}
          {ethiopia && t.k >= 3 ? <path d={path(ethiopia) ?? undefined} fill="none" stroke="#0B3D23" strokeWidth={1.6} vectorEffect="non-scaling-stroke" pointerEvents="none" /> : null}
        </g>
        {places.map((p) => {
          const xy = projection([p.lng, p.lat]);
          if (!xy) return null;
          const x = t.applyX(xy[0]);
          const y = t.applyY(xy[1]);
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return null;
          const active = selected?.key === p.key;
          return (
            <g key={p.key} transform={`translate(${x},${y})`} className="xm-pin" onClick={(e) => { e.stopPropagation(); setSelected(p); }}
              role="button" tabIndex={0} aria-label={`${p.name}: ${p.memories.length} memories`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p); } }}>
              <circle r={pinR + 6} fill="transparent" />
              <circle r={active ? pinR + 2 : pinR} fill={active ? '#FCDD09' : '#DA121A'} stroke={active ? '#0B3D23' : '#fff'} strokeWidth={2} />
              {p.memories.length > 1 ? <text y={3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill={active ? '#0B3D23' : '#fff'}>{p.memories.length}</text> : null}
              {showLabels ? (
                <text x={pinR + 5} y={4} fontSize={12} fontWeight={600} fill="#1D1A14" stroke="#F8F5EC" strokeWidth={3} paintOrder="stroke">{p.name}</text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="xm-tools">
        <div className="xm-search">
          <Icon name="search" size={16} />
          <label className="sr-only" htmlFor="xm-q">Go to a country</label>
          <input id="xm-q" placeholder="Go to a country…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          {matches.length ? (
            <ul className="xm-results" role="listbox">
              {matches.map((c) => (
                <li key={String(c.id) + c.properties.name}>
                  <button type="button" onClick={() => zoomToFeature(c)}>
                    {c.properties.name}{visitedCountryIds.has(String(c.id)) ? <span className="tag green" style={{ marginLeft: 6 }}>visited</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="xm-chips" role="group" aria-label="Quick views">
          {SHORTCUTS.map((s) => (
            <button key={s.label} type="button" onClick={() => {
              const a = projection(s.bounds[0])!; const b = projection(s.bounds[1])!;
              fitBox([[Math.min(a[0], b[0]), Math.min(a[1], b[1])], [Math.max(a[0], b[0]), Math.max(a[1], b[1])]]);
            }}>{s.label} <span className="am">{s.am}</span></button>
          ))}
          {places.length ? <button type="button" className="mine" onClick={() => fitLngLat(places.map((p) => [p.lng, p.lat]))}><Icon name="pin" size={14} />My places</button> : null}
        </div>
      </div>

      <div className="xm-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(2)}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(0.5)}>−</button>
      </div>

      <div className="xm-status">
        <span>{hover ?? 'Drag to move · scroll or +/− to zoom · tap a pin'}</span>
        <span>×{t.k < 10 ? t.k.toFixed(1) : Math.round(t.k)} · Natural Earth</span>
      </div>

      {selected ? <PlaceCard place={selected} onClose={() => setSelected(null)} onZoom={() => fitLngLat([[selected.lng, selected.lat]])} /> : null}
    </div>
  );
}

function PlaceCard({ place, onClose, onZoom }: { place: Place; onClose: () => void; onZoom: () => void }) {
  const sorted = [...place.memories].sort((a, b) => a.happenedAt.localeCompare(b.happenedAt));
  const photos = sorted.flatMap((m) => m.media.filter((x) => x.kind === 'PHOTO'));
  const videos = sorted.reduce((n, m) => n + m.media.filter((x) => x.kind === 'VIDEO').length, 0);
  const region = regionName(place.regionCode);
  const first = new Date(sorted[0].happenedAt);
  const last = new Date(sorted[sorted.length - 1].happenedAt);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <aside className="xm-card" aria-label={`${place.name} details`}>
      <div className="tibeb thin" />
      <div className="xm-card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div className="stack" style={{ gap: 2 }}>
            <strong style={{ fontFamily: 'var(--font-head)', fontSize: 20 }}>{place.name}</strong>
            <span className="muted small">{region ? <>{region.en} · <span className="am">{region.am}</span> · </> : null}{place.lat.toFixed(3)}, {place.lng.toFixed(3)}</span>
          </div>
          <button type="button" className="icon-btn" style={{ width: 36, height: 36, flex: 'none' }} aria-label="Close" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        {photos.length ? (
          <div className="xm-photos">
            {photos.slice(0, 4).map((p, i) => (
              <span key={p.id} style={{ backgroundImage: `url("${p.url}")` }}>{i === 3 && photos.length > 4 ? `+${photos.length - 4}` : null}</span>
            ))}
          </div>
        ) : null}
        <dl className="xm-facts">
          <div><dt>Memories</dt><dd>{place.memories.length}</dd></div>
          <div><dt>Photos</dt><dd>{photos.length}</dd></div>
          <div><dt>Videos</dt><dd>{videos}</dd></div>
        </dl>
        <div className="small" style={{ lineHeight: 1.6 }}>
          <div><span className="muted">First visit: </span>{fmt(first)} · <span className="am">{formatEthiopianAm(first)}</span></div>
          {sorted.length > 1 ? <div><span className="muted">Last visit: </span>{fmt(last)} · <span className="am">{formatEthiopianAm(last)}</span></div> : null}
        </div>
        <ul className="xm-list">
          {sorted.map((m) => (
            <li key={m.id}>
              <Link to={`/memories?id=${m.id}`}>{m.title}</Link>
              <span className="muted small">{fmt(new Date(m.happenedAt))}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn" style={{ minHeight: 40 }} onClick={onZoom}><Icon name="search" size={16} />Zoom in here</button>
      </div>
    </aside>
  );
}
