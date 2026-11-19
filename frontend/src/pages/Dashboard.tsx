import { Link } from 'react-router-dom';
import { api } from '../api/api';
import type { Memory } from '../api/types';
import { BarChart, Kpi, RankedBars, SERIES, SplitBar } from '../components/charts';
import { PageHeader } from '../components/PageHeader';
import { computeCoverage } from '../lib/coverage';
import { ETHIOPIAN_MONTHS_AM, formatEthiopianAm, toEthiopian } from '../lib/ethiopianDate';
import { ETHIOPIA_REGIONS } from '../lib/regions';
import { useAsync } from '../lib/useAsync';
import { PRIVACY_LABEL } from './memories/privacy';
import { FlagProgress } from './Home';

/** Everything about the traveler's journeys, computed from their own memories, trips and books. */
export function Dashboard() {
  const q = useAsync(() => Promise.all([api.listMemories({ size: 100 }), api.listTrips(), api.listBooks()]), []);
  const memories = q.data?.[0].items ?? [];
  const trips = q.data?.[1] ?? [];
  const books = q.data?.[2] ?? [];

  const cov = computeCoverage(memories);
  const media = memories.flatMap((m) => m.media);
  const photos = media.filter((x) => x.kind === 'PHOTO').length;
  const videos = media.filter((x) => x.kind === 'VIDEO').length;
  const voice = media.filter((x) => x.kind === 'AUDIO').length;
  const travelDays = new Set(memories.map((m) => new Date(m.happenedAt).toDateString())).size;
  const countries = new Set(memories.map((m) => m.regionCode?.slice(0, 2)).filter(Boolean)).size;

  const months = lastTwelveMonths(memories);
  const busiest = [...months].sort((a, b) => b.value - a.value)[0];

  const byRegion = ETHIOPIA_REGIONS
    .map((r) => ({ key: r.code, label: <>{r.en} <span className="am muted small">{r.am}</span></>, value: memories.filter((m) => m.regionCode === r.code).length }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const placeCounts = new Map<string, number>();
  for (const m of memories) if (m.placeName) placeCounts.set(m.placeName, (placeCounts.get(m.placeName) ?? 0) + 1);
  const topPlaces = [...placeCounts].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ key: k, label: k, value: v }));

  const privacy = (['PRIVATE', 'FAMILY', 'PUBLIC'] as const).map((p, i) => ({
    label: PRIVACY_LABEL[p].en, value: memories.filter((m) => m.privacy === p).length, color: SERIES[i],
  }));

  return (
    <>
      <PageHeader title="Travel dashboard" am="የጉዞ ዳሽቦርድ" subtitle="Your journeys in numbers, from your own memories, trips and books." />
      {q.error ? <div className="banner error">{q.error}</div> : null}

      <section className="kpi-strip" aria-label="Totals">
        <Kpi label="Memories" value={String(memories.length)} note={`${travelDays} travel days`} />
        <Kpi label="Places" value={String(cov.placeCount)} note={`${countries || 0} countr${countries === 1 ? 'y' : 'ies'}`} />
        <Kpi label="Ethiopia covered" value={`${cov.percent}%`} note={`${cov.regionCount} of 14 regions`} tone="up" />
        <Kpi label="Photos & videos" value={String(photos + videos)} note={`${voice} voice notes`} />
        <Kpi label="Trips" value={String(trips.length)} note={`${books.length} book${books.length === 1 ? '' : 's'}`} />
      </section>

      <div className="dash-grid">
        <section className="card card-pad span-8" aria-labelledby="d-months">
          <h2 id="d-months" className="panel-title">
            Memories by month <span className="am">· በወር</span>
            <span className="muted small" style={{ fontFamily: 'var(--font)', fontWeight: 400 }}>{busiest?.value ? `Busiest: ${busiest.detail}` : ''}</span>
          </h2>
          <BarChart data={months} title="Memories by month, last 12 months" height={220} />
        </section>

        <section className="card card-pad span-4" aria-labelledby="d-cov" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 id="d-cov" className="panel-title">Ethiopia progress <span className="am">· እድገት</span></h2>
          <span className="big-number" style={{ fontSize: 52, color: 'var(--green-600)' }}>{cov.percent}%</span>
          <FlagProgress percent={cov.percent} light />
          <span className="muted small">{cov.regionCount} of 14 regions · {14 - cov.regionCount} to go</span>
          <div className="pills" style={{ gap: 6 }}>
            {ETHIOPIA_REGIONS.map((r) => (
              <span key={r.code} className={`tag${cov.visited.has(r.code) ? ' green' : ''}`} title={r.en}>{cov.visited.has(r.code) ? '✓ ' : ''}{r.en}</span>
            ))}
          </div>
          <Link to="/coverage" style={{ fontWeight: 600, marginTop: 'auto' }}>Open the map</Link>
        </section>

        <section className="card card-pad span-6" aria-labelledby="d-regions">
          <h2 id="d-regions" className="panel-title">Memories by region <span className="am">· በክልል</span></h2>
          <RankedBars items={byRegion} empty="Set a region on your memories to see this." />
        </section>

        <section className="card card-pad span-6" aria-labelledby="d-places">
          <h2 id="d-places" className="panel-title">Most visited places <span className="am">· ተደጋጋሚ ቦታዎች</span></h2>
          <RankedBars items={topPlaces} color={SERIES[1]} empty="Add a place name to your memories to see this." />
        </section>

        <section className="card card-pad span-6" aria-labelledby="d-media">
          <h2 id="d-media" className="panel-title">What you captured</h2>
          <SplitBar label="Media" parts={[
            { label: 'Photos', value: photos, color: SERIES[0] },
            { label: 'Videos', value: videos, color: SERIES[1] },
            { label: 'Voice notes', value: voice, color: SERIES[2] },
          ]} />
        </section>

        <section className="card card-pad span-6" aria-labelledby="d-privacy">
          <h2 id="d-privacy" className="panel-title">Who can see your memories</h2>
          <SplitBar label="Privacy" parts={privacy} />
        </section>

        <section className="card card-pad span-12" aria-labelledby="d-trips">
          <h2 id="d-trips" className="panel-title">Trips <span className="am">· ጉዞዎች</span></h2>
          {trips.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr><th>Trip</th><th>When</th><th style={{ textAlign: 'right' }}>Days</th><th style={{ textAlign: 'right' }}>Memories</th><th style={{ textAlign: 'right' }}>Places</th><th style={{ textAlign: 'right' }}>Photos</th><th /></tr>
                </thead>
                <tbody>
                  {trips.map((t) => {
                    const ms = memories.filter((m) => m.tripId === t.id);
                    const days = t.startDate && t.endDate ? Math.round((Date.parse(t.endDate) - Date.parse(t.startDate)) / 86400000) + 1 : null;
                    return (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td>
                          {t.startDate ? new Date(t.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {t.startDate ? <div className="am muted small">{formatEthiopianAm(new Date(t.startDate))}</div> : null}
                        </td>
                        <td style={{ textAlign: 'right' }}>{days ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>{ms.length}</td>
                        <td style={{ textAlign: 'right' }}>{new Set(ms.map((m) => m.placeName).filter(Boolean)).size}</td>
                        <td style={{ textAlign: 'right' }}>{ms.reduce((n, m) => n + m.media.filter((x) => x.kind === 'PHOTO').length, 0)}</td>
                        <td style={{ textAlign: 'right' }}><Link to={`/memories`}>Open</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ margin: 0 }}>No trips yet. <Link to="/memories">Create one</Link>.</p>}
        </section>

        <section className="card card-pad span-12" aria-labelledby="d-books">
          <h2 id="d-books" className="panel-title">Books <span className="am">· መጽሐፍት</span></h2>
          {books.length ? (
            <RankedBars color={SERIES[2]} items={books.map((b) => ({ key: b.id, label: b.title, value: Math.max(0, b.pageCount - 1) }))} />
          ) : <p className="muted" style={{ margin: 0 }}>No books yet. <Link to="/books">Make your first book</Link>.</p>}
          {books.length ? <p className="muted small" style={{ margin: '10px 0 0' }}>Pages per book</p> : null}
        </section>
      </div>
    </>
  );
}

/** Counts per month for the last 12 months, labelled with the Ethiopian month too. */
function lastTwelveMonths(memories: Memory[]) {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 15);
    const value = memories.filter((m) => {
      const x = new Date(m.happenedAt);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
    }).length;
    const e = toEthiopian(d);
    return {
      label: d.toLocaleDateString('en-GB', { month: 'short' }),
      value,
      detail: `${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · ${ETHIOPIAN_MONTHS_AM[e.month - 1]} ${e.year}`,
    };
  });
}
