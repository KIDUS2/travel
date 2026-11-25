import { useMemo } from 'react';
import { api } from '../api/api';
import { pinsFromMemories } from '../components/EthiopiaMap';
import { Icon } from '../components/Icon';
import { ExploreMap } from '../components/ExploreMap';
import { PageHeader } from '../components/PageHeader';
import { computeCoverage } from '../lib/coverage';
import { countryAt } from '../lib/places';
import { ETHIOPIA_REGIONS } from '../lib/regions';
import { useAsync } from '../lib/useAsync';
import { FlagProgress } from './Home';

/** Rough geographic placement of regions on a 4-column tile grid; null = empty cell. */
const TILE_LAYOUT: (string | null)[] = [
  null, 'ET-TI', 'ET-AF', null,
  'ET-BE', 'ET-AM', 'ET-DD', 'ET-HA',
  'ET-GA', 'ET-AA', 'ET-OR', 'ET-SO',
  'ET-SW', 'ET-CE', 'ET-SI', null,
  null, 'ET-SE', null, null,
];

// Bucket list is stored per traveler in a later feature; these two are the design's examples.
const BUCKET = new Set(['ET-HA', 'ET-SI']);

/** ISO alpha-2 → numeric id used by Natural Earth / world-atlas. Extend as countries are added. */
const COUNTRY_NUMERIC: Record<string, string> = { ET: '231', KE: '404', DJ: '262', SO: '706', SD: '729', SS: '728', ER: '232' };

export function Coverage() {
  const { data, error } = useAsync(() => api.listMemories({ size: 100 }), []);
  const memories = data?.items ?? [];
  const cov = computeCoverage(memories);
  const top = [...cov.placesByRegion].sort((a, b) => b[1] - a[1])[0]?.[0];

  const visitedCountryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of memories) {
      // A photo's GPS names the country anywhere in the world; the region code is the fallback.
      if (m.latitude != null && m.longitude != null) {
        const c = countryAt(m.latitude, m.longitude);
        if (c) { ids.add(c.id); continue; }
      }
      const alpha2 = m.regionCode?.slice(0, 2).toUpperCase();
      if (alpha2 && COUNTRY_NUMERIC[alpha2]) ids.add(COUNTRY_NUMERIC[alpha2]);
    }
    return ids;
  }, [memories]);

  const pins = useMemo(() => pinsFromMemories(memories).map((p) => ({ lat: p.lat, lng: p.lng, label: p.label })), [memories]);

  return (
    <>
      <PageHeader title="Coverage map" am="የጉዞ ካርታ" subtitle="Explore anywhere in the world. Tap a pin to see the memories from that place." />

      {error ? <div className="banner error">{error}</div> : null}

      <section aria-labelledby="mapcard" className="card card-lg" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="tibeb" />
        <div className="stack" style={{ padding: 20, gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <h2 id="mapcard" className="section-title">My world <span className="am">· የእኔ ዓለም</span></h2>
            <span className="muted small">{visitedCountryIds.size} countr{visitedCountryIds.size === 1 ? 'y' : 'ies'} · {pins.length} places · {memories.length} memories</span>
          </div>
          {data ? <ExploreMap memories={memories} visitedCountryIds={visitedCountryIds} /> : <div className="xm" style={{ height: 420 }} />}
        </div>
      </section>

      <div className="row">
        <section aria-labelledby="maph" className="card card-lg col-main" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="stack" style={{ padding: 24, gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <h2 id="maph" className="section-title">Regions of Ethiopia <span className="am">· ክልሎች</span></h2>
              <div className="pills muted small" style={{ gap: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ borderRadius: 4, width: 14, height: 14, background: 'var(--flag-green)' }} />Visited</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ borderRadius: 4, width: 14, height: 14, background: 'var(--flag-yellow)' }} />Bucket list</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ borderRadius: 4, width: 14, height: 14, background: 'var(--sand)', border: '1px solid var(--line-2)' }} />Not yet</span>
              </div>
            </div>
            <div className="tiles" role="list" aria-label="Regions">
              {TILE_LAYOUT.map((code, i) => {
                if (!code) return <div key={i} className="spacer" aria-hidden="true" />;
                const r = ETHIOPIA_REGIONS.find((x) => x.code === code)!;
                const places = cov.placesByRegion.get(code) ?? 0;
                const visited = cov.visited.has(code);
                const cls = visited ? (code === top ? 'tile top' : 'tile visited') : BUCKET.has(code) ? 'tile bucket' : 'tile';
                return (
                  <div key={code} className={cls} role="listitem">
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="name">{r.en}</span>
                      <span className="sub am">{r.am}</span>
                    </span>
                    <span className="sub">{visited ? `${places} place${places === 1 ? '' : 's'}${code === top ? ' · most visited' : ''}` : BUCKET.has(code) ? 'Bucket list' : '0 places'}</span>
                  </div>
                );
              })}
            </div>
            <p className="muted small" style={{ margin: 0 }}>Regions color in from the region you set on each memory. Tile layout is schematic.</p>
          </div>
        </section>

        <aside className="col-side stack" style={{ gap: 16 }}>
          <section className="dark-panel" aria-labelledby="prog">
            <div className="stack" style={{ padding: 24, gap: 14 }}>
              <h2 id="prog" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--on-dark-muted)' }}>Ethiopia progress · <span className="am">እድገት</span></h2>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="big-number" style={{ fontSize: 58, color: 'var(--flag-yellow)' }}>{cov.percent}%</span>
                <span style={{ color: 'var(--on-dark)' }}>{cov.regionCount} / 14 regions</span>
              </div>
              <FlagProgress percent={cov.percent} />
              <div className="grid-3" style={{ gap: 10, fontSize: 13, color: 'var(--on-dark-muted)' }}>
                <div className="stack" style={{ gap: 2 }}><span className="big-number" style={{ fontSize: 22, color: '#fff' }}>{cov.placeCount}</span>places</div>
                <div className="stack" style={{ gap: 2 }}><span className="big-number" style={{ fontSize: 22, color: '#fff' }}>{data?.total ?? 0}</span>memories</div>
                <div className="stack" style={{ gap: 2 }}><span className="big-number" style={{ fontSize: 22, color: '#fff' }}>{14 - cov.regionCount}</span>to go</div>
              </div>
            </div>
            <div className="tibeb" />
          </section>

          <section className="card card-lg card-pad stack" aria-labelledby="badges" style={{ gap: 14 }}>
            <h2 id="badges" className="section-title" style={{ fontSize: 18 }}>Badges <span className="am">· ሽልማቶች</span></h2>
            <Badge earned={cov.visited.has('ET-AM') && cov.visited.has('ET-TI')} icon="home" title="Northern Historic Route" note="Visit Amhara and Tigray" />
            <Badge earned={cov.visited.has('ET-AF')} icon="mountain" title="Lowest point: Danakil" note="Visit Afar" ring="var(--flag-red)" />
            <Badge earned={cov.visited.has('ET-HA') && cov.visited.has('ET-AM')} icon="lock" title="Walled & royal cities" note="Visit Harar and Gondar" />
          </section>

          <section className="yellow-panel card-pad stack">
            <h2 className="section-title" style={{ fontSize: 18 }}>Your travel report</h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>Regions, places and top memories on one page, by Ethiopian or Gregorian year.</p>
            <button type="button" className="btn" style={{ alignSelf: 'flex-start', background: 'var(--green-900)', color: '#fff', borderColor: 'var(--green-900)' }} disabled>
              Generate report · coming soon
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}

function Badge({ earned, icon, title, note, ring = 'var(--flag-green)' }: { earned: boolean; icon: string; title: string; note: string; ring?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none',
        background: earned ? 'var(--flag-yellow)' : 'var(--sand)', border: earned ? `3px solid ${ring}` : '2px dashed #A89C80',
        color: earned ? 'var(--green-900)' : 'var(--muted)',
      }}>
        <Icon name={earned ? icon : 'lock'} size={22} />
      </span>
      <div className="stack" style={{ gap: 0 }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        <span className="muted small">{earned ? 'Earned' : note}</span>
      </div>
    </div>
  );
}
