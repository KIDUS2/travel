import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../auth/AuthProvider';
import { Icon } from '../components/Icon';
import { computeCoverage } from '../lib/coverage';
import { formatEthiopianAm, formatEthiopianShortAm } from '../lib/ethiopianDate';
import { regionName } from '../lib/regions';
import { useAsync } from '../lib/useAsync';
import { PRIVACY_LABEL } from './memories/privacy';

export function Home() {
  const { name } = useAuth();
  const { data, error } = useAsync(() => Promise.all([api.listMemories({ size: 100 }), api.listTrips()]), []);
  const memories = data?.[0].items ?? [];
  const trips = data?.[1] ?? [];
  const coverage = computeCoverage(memories);
  const recent = memories.slice(0, 3);
  const today = new Date();
  const firstName = name.split(' ')[0];

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Search</span>
          <input type="search" placeholder="Search memories, places… / ፈልግ" />
        </label>
        <Link to="/alerts" className="icon-btn" aria-label="Notifications">
          <Icon name="bell" />
          <span className="dot" style={{ position: 'absolute', top: 9, right: 10, background: 'var(--flag-red)', border: '2px solid #fff', width: 9, height: 9 }} />
        </Link>
      </div>

      {error ? <div className="banner error">{error}</div> : null}

      <section className="dark-panel" aria-labelledby="hello" style={{ display: 'flex', flexWrap: 'wrap' }}>
        <div style={{ flex: '999 1 420px', padding: '30px 34px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="small" style={{ color: 'var(--on-dark-muted)' }}>
            <span className="am">{formatEthiopianAm(today)}</span> · {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <h1 id="hello" className="am-serif" style={{ margin: 0, fontSize: 42, lineHeight: 1.2 }}>ሰላም፣ {firstName}</h1>
          <p style={{ margin: 0, fontSize: 17, color: 'var(--on-dark)', lineHeight: 1.5 }}>
            Selam, {firstName}. You've explored <strong style={{ color: 'var(--flag-yellow)' }}>{coverage.regionCount} of 14</strong> regions of Ethiopia. Where will your next story begin?
          </p>
          <div className="pills" style={{ marginTop: 6 }}>
            <Link to="/memories?new=1" className="btn btn-yellow"><Icon name="plus" size={18} stroke={2.6} />New memory</Link>
            <Link to="/coverage" className="btn btn-ghost-dark">Open my map</Link>
            <Link to="/dashboard" className="btn btn-ghost-dark">My dashboard</Link>
          </div>
        </div>
        <div style={{ flex: '1 1 260px', padding: '30px 34px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, background: 'var(--green-850)' }}>
          <span style={{ fontSize: 14, color: 'var(--on-dark-muted)' }}>Ethiopia covered</span>
          <span className="big-number" style={{ fontSize: 58, color: 'var(--flag-yellow)' }}>{coverage.percent}%</span>
          <FlagProgress percent={coverage.percent} />
          <span style={{ fontSize: 14, color: 'var(--on-dark)' }}>{coverage.regionCount} of 14 regions · {coverage.placeCount} places</span>
        </div>
        <div className="tibeb" style={{ flex: '1 1 100%' }} />
      </section>

      <section aria-label="Summary" className="grid-3">
        <StatCard icon="photo" tone="green" label="Memories saved" value={String(memories.length)}
          note={`${count(memories, 'PRIVATE')} private · ${count(memories, 'FAMILY')} family · ${count(memories, 'PUBLIC')} public`} />
        <StatCard icon="route" tone="yellow" label="Trips" value={String(trips.length)} note="Grouped by journey" />
        <StatCard icon="eye" tone="red" label="Views, all platforms" value="—" note="Connect accounts in Creator studio" />
      </section>

      <section aria-labelledby="recent" className="stack" style={{ gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 id="recent" className="section-title">Recent memories <span className="am">· የቅርብ ትዝታዎች</span></h2>
          <Link to="/memories" style={{ fontWeight: 600, textDecoration: 'none' }}>See all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card empty">No memories yet. <Link to="/memories?new=1">Save your first one</Link>.</div>
        ) : (
          <div className="grid-3">
            {recent.map((m) => {
              const photo = m.media.find((x) => x.kind === 'PHOTO');
              const region = regionName(m.regionCode);
              return (
                <Link key={m.id} to={`/memories?id=${m.id}`} className="card memory-card">
                  <div className="memory-photo" style={photo ? { backgroundImage: `url(${photo.url})` } : undefined}>
                    <span className="photo-chip">{m.media.length ? `${m.media.length} files` : 'No photos yet'}</span>
                  </div>
                  <div className="tibeb thin" />
                  <div className="memory-body">
                    <h3>{m.title}</h3>
                    <span className="muted" style={{ fontSize: 14 }}>
                      {m.placeName ?? 'Unknown place'}{region ? `, ${region.en}` : ''} · <span className="am">{formatEthiopianShortAm(new Date(m.happenedAt))}</span>
                    </span>
                    <div className="pills" style={{ gap: 6, marginTop: 6 }}><span className="tag">{PRIVACY_LABEL[m.privacy].en}</span></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid-3">
        <section className="yellow-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tibeb" style={{ height: 8 }} />
          <div className="stack card-pad" style={{ flex: 1 }}>
            <span className="eyebrow" style={{ color: '#6b4e0a' }}>On this day · <span className="am" style={{ textTransform: 'none', letterSpacing: 0 }}>በዚህ ቀን</span></span>
            <h2 className="section-title">Relive a past journey</h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>Each day Teguwaz shows a memory from the same date in an earlier year.</p>
            <Link to="/memories" style={{ marginTop: 'auto', fontWeight: 700, color: '#6b4e0a' }}>Open memories</Link>
          </div>
        </section>
        <section className="card card-pad stack">
          <h2 className="section-title">Make it a book</h2>
          <p className="muted" style={{ margin: 0 }}>Print a trip as a photo book with a map of where you went.</p>
          <Link to="/books" style={{ marginTop: 'auto', fontWeight: 600 }}>Open Book studio</Link>
        </section>
        <section className="card card-pad stack">
          <h2 className="section-title">2 policy updates</h2>
          <div style={{ display: 'flex', gap: 10 }}><span className="dot" style={{ background: 'var(--flag-red)', marginTop: 6 }} />YouTube monetization update affects your channel</div>
          <div style={{ display: 'flex', gap: 10 }}><span className="dot" style={{ background: '#E5C400', marginTop: 6 }} />TikTok music licensing for travel clips</div>
          <Link to="/alerts" style={{ marginTop: 'auto', fontWeight: 600 }}>Review alerts</Link>
        </section>
      </div>
    </>
  );
}

function count(ms: { privacy: string }[], p: string) {
  return ms.filter((m) => m.privacy === p).length;
}

export function FlagProgress({ percent, light = false }: { percent: number; light?: boolean }) {
  const third = Math.min(Math.max(percent, 0), 100) / 3;
  return (
    <div className={`flag-progress${light ? ' light' : ''}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${third}%` }} /><span style={{ width: `${third}%` }} /><span style={{ width: `${third}%` }} />
    </div>
  );
}

const TONES = {
  green: { background: 'var(--green-50)', color: 'var(--green-600)' },
  yellow: { background: 'var(--yellow-50)', color: '#7A5B00' },
  red: { background: 'var(--red-50)', color: '#A50E15' },
};

function StatCard({ icon, tone, label, value, note }: { icon: string; tone: keyof typeof TONES; label: string; value: string; note: string }) {
  return (
    <div className="card card-pad stat">
      <span className="stat-icon" style={TONES[tone]}><Icon name={icon} size={22} /></span>
      <div className="stack" style={{ gap: 2 }}>
        <span className="muted" style={{ fontSize: 14 }}>{label}</span>
        <span className="stat-value">{value}</span>
        <span className="muted small">{note}</span>
      </div>
    </div>
  );
}
