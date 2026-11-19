import { geoEqualEarth, geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPoint } from 'geojson';
import { useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world110 from 'world-atlas/countries-110m.json';
import { regionName } from '../lib/regions';

/**
 * Coverage map on real geography (Natural Earth via world-atlas).
 * - "world": standard Equal Earth world map, visited countries filled.
 * - "africa": the same map framed on Africa.
 * - "ethiopia": Ethiopia alone (detailed border). If an ADM1 boundary file is
 *   present at /geo/ethiopia-adm1.geojson, its regions are drawn and colored.
 */

export type MapScope = 'world' | 'africa' | 'ethiopia';

export interface CoveragePin {
  lat: number;
  lng: number;
  label?: string;
}

type CountryProps = { name: string };
type CountryFeature = Feature<Geometry, CountryProps>;

const WIDTH = 960;
const HEIGHT = 520;
const ETHIOPIA_ID = '231';
const AFRICA_FRAME: MultiPoint = { type: 'MultiPoint', coordinates: [[-18, -35], [52, 37.5]] };

function countriesFrom(topo: unknown): CountryFeature[] {
  const t = topo as Topology<{ countries: GeometryCollection<CountryProps> }>;
  return (feature(t, t.objects.countries) as FeatureCollection<Geometry, CountryProps>).features;
}

const WORLD_COUNTRIES = countriesFrom(world110);

type RegionFeature = Feature<Geometry, Record<string, unknown>>;

/** ISO 3166-2 code of an ADM1 feature, whichever field the source uses. */
function regionCodeOf(f: RegionFeature): string | undefined {
  const p = f.properties ?? {};
  const v = p.shapeISO ?? p.iso_3166_2 ?? p.ISO_3166_2 ?? p.iso ?? p.code;
  return typeof v === 'string' ? v.toUpperCase() : undefined;
}

export function WorldCoverageMap({ scope, visitedCountryIds, visitedRegionCodes, pins, caption = true }: {
  scope: MapScope;
  visitedCountryIds: Set<string>;
  visitedRegionCodes: Set<string>;
  pins: CoveragePin[];
  caption?: boolean;
}) {
  const [ethiopiaDetailed, setEthiopiaDetailed] = useState<CountryFeature | null>(null);
  const [regions, setRegions] = useState<RegionFeature[] | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // Load the detailed (50m) border and optional region file only when Ethiopia is shown.
  useEffect(() => {
    if (scope !== 'ethiopia' || ethiopiaDetailed) return;
    let cancelled = false;
    fetch('/geo/ethiopia-border.geojson')
      .then((r) => (r.ok ? r.json() : null))
      .then((et: CountryFeature | null) => {
        if (!cancelled && et?.geometry) setEthiopiaDetailed(et);
      })
      .catch(() => { /* fall back to the world map's outline */ });
    fetch('/geo/ethiopia-adm1.geojson')
      .then((r) => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
      .then((fc: FeatureCollection<Geometry, Record<string, unknown>> | null) => {
        if (!cancelled && fc?.features?.length) setRegions(fc.features);
      })
      .catch(() => { /* no region file: show the national border only */ });
    return () => { cancelled = true; };
  }, [scope, ethiopiaDetailed]);

  const ethiopia = ethiopiaDetailed ?? WORLD_COUNTRIES.find((c) => String(c.id) === ETHIOPIA_ID)!;

  const projection: GeoProjection = useMemo(() => {
    if (scope === 'ethiopia') {
      return geoMercator().fitExtent([[40, 30], [WIDTH - 40, HEIGHT - 30]], ethiopia);
    }
    const p = geoEqualEarth();
    if (scope === 'africa') return p.fitExtent([[20, 20], [WIDTH - 20, HEIGHT - 20]], AFRICA_FRAME);
    return p.fitExtent([[10, 10], [WIDTH - 10, HEIGHT - 10]], { type: 'Sphere' });
  }, [scope, ethiopia]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const sphere = path({ type: 'Sphere' }) ?? undefined;

  const countryFill = (c: CountryFeature) => {
    const id = String(c.id);
    if (visitedCountryIds.has(id)) return id === ETHIOPIA_ID ? '#078930' : '#06742A';
    return '#E9E3D3';
  };

  const visitedCount = scope === 'ethiopia'
    ? `${visitedRegionCodes.size} of 14 regions visited`
    : `${visitedCountryIds.size} of ${WORLD_COUNTRIES.length} countries visited`;

  return (
    <figure style={{ margin: 0, position: 'relative' }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img"
        aria-label={`${scope === 'ethiopia' ? 'Map of Ethiopia' : scope === 'africa' ? 'Map of Africa' : 'World map'}: ${visitedCount}, ${pins.length} places pinned`}
        style={{ display: 'block', background: scope === 'ethiopia' ? '#FBF9F3' : '#EAF2F4', borderRadius: 14 }}>
        {scope !== 'ethiopia' && sphere ? <path d={sphere} fill="#EAF2F4" stroke="#C9D9DE" strokeWidth={1} /> : null}

        {scope !== 'ethiopia'
          ? WORLD_COUNTRIES.map((c) => (
            <path key={String(c.id) + c.properties.name} d={path(c) ?? undefined} fill={countryFill(c)}
              stroke="#FFFFFF" strokeWidth={0.6}
              onMouseEnter={() => setHover(c.properties.name)} onMouseLeave={() => setHover(null)}>
              <title>{c.properties.name}{visitedCountryIds.has(String(c.id)) ? ' · visited' : ''}</title>
            </path>
          ))
          : null}

        {scope === 'ethiopia' ? (
          <>
            <path d={path(ethiopia) ?? undefined} fill={regions ? '#F0ECE0' : '#E2F2E6'} stroke="#06742A" strokeWidth={2} strokeLinejoin="round" />
            {regions?.map((r, i) => {
              const code = regionCodeOf(r);
              const visited = code ? visitedRegionCodes.has(code) : false;
              const name = regionName(code)?.en ?? String(r.properties?.shapeName ?? r.properties?.name ?? code ?? 'Region');
              return (
                <path key={code ?? i} d={path(r) ?? undefined} fill={visited ? '#078930' : '#F0ECE0'} stroke="#FFFFFF" strokeWidth={1.2}
                  onMouseEnter={() => setHover(name)} onMouseLeave={() => setHover(null)}>
                  <title>{name}{visited ? ' · visited' : ''}</title>
                </path>
              );
            })}
            {regions ? <path d={path(ethiopia) ?? undefined} fill="none" stroke="#0B3D23" strokeWidth={2} /> : null}
          </>
        ) : null}

        {pins.map((p, i) => {
          const xy = projection([p.lng, p.lat]);
          if (!xy) return null;
          const big = scope === 'ethiopia';
          return (
            <g key={i} transform={`translate(${xy[0]},${xy[1]})`}>
              <circle r={big ? 7 : 3.5} fill="#DA121A" stroke="#FFFFFF" strokeWidth={big ? 2 : 1} />
              {big && p.label ? (
                <text x={11} y={4} fontFamily="Inter, sans-serif" fontSize={14} fontWeight={600} fill="#1D1A14"
                  stroke="#FBF9F3" strokeWidth={3} paintOrder="stroke">{p.label}</text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {caption ? <figcaption style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8 }} className="muted small">
        <span>{hover ? <strong style={{ color: 'var(--ink)' }}>{hover}</strong> : visitedCount}</span>
        <span>
          {scope === 'ethiopia' && !regions ? 'Region borders appear when an ADM1 boundary file is added · ' : ''}
          Map data: Natural Earth
        </span>
      </figcaption> : null}
    </figure>
  );
}
