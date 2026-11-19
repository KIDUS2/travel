import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import type { ConnectionStatus, Platform, YouTubeStats } from '../api/types';
import { BarChart, Kpi, RankedBars, SERIES, SplitBar, fmt } from '../components/charts';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../lib/useAsync';

const PLATFORM: Record<Platform, { name: string; short: string; bg: string; fg: string }> = {
  youtube: { name: 'YouTube', short: 'YT', bg: '#DA121A', fg: '#fff' },
  instagram: { name: 'Instagram', short: 'IG', bg: '#DCE4F7', fg: '#1E3A8A' },
  tiktok: { name: 'TikTok', short: 'TT', bg: '#1D1A14', fg: '#fff' },
};

// Place performance needs videos linked to memories (next step); shown as an example until then.
const SAMPLE_PLACES = [
  { place: 'Danakil Depression', am: 'ዳናኪል', views: 90000 },
  { place: 'Lalibela', am: 'ላሊበላ', views: 137000 },
  { place: 'Simien Mountains', am: 'ስሜን', views: 27000 },
  { place: 'Addis Ababa food tour', am: 'አዲስ አበባ', views: 17000 },
];

export function Creator() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const connQ = useAsync(() => api.listConnections(), []);
  const [setupFor, setSetupFor] = useState<ConnectionStatus | null>(null);
  const [busy, setBusy] = useState<Platform | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connections = connQ.data ?? [];
  const yt = connections.find((c) => c.platform === 'youtube');
  const statsQ = useAsync(() => (yt?.connected ? api.youtubeStats() : Promise.resolve(null)), [yt?.connected]);

  const justConnected = params.get('connected') as Platform | null;
  const returnedError = params.get('error');

  useEffect(() => {
    if (justConnected || returnedError) void connQ.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected, returnedError]);

  async function connect(c: ConnectionStatus) {
    if (!c.available) { setSetupFor(c); return; }
    setBusy(c.platform);
    setError(null);
    try {
      const { authorizeUrl } = await api.startConnection(c.platform);
      if (authorizeUrl.startsWith('/')) navigate(authorizeUrl); else window.location.assign(authorizeUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the connection');
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(c: ConnectionStatus) {
    if (!window.confirm(`Disconnect ${PLATFORM[c.platform].name}? Teguwaz will stop reading its stats and forget the access.`)) return;
    await api.disconnect(c.platform);
    void connQ.reload();
  }

  const stats = statsQ.data;

  return (
    <>
      <PageHeader title="Creator studio" am="የይዘት ስቱዲዮ" subtitle="Your platforms in one place, connected to the places you filmed." />

      {justConnected ? (
        <div className="banner info" role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span><strong>{PLATFORM[justConnected]?.name ?? justConnected} connected.</strong> Your stats are loading below.</span>
          <button type="button" className="btn" style={{ minHeight: 32, padding: '0 10px', fontSize: 13 }} onClick={() => setParams({}, { replace: true })}>Dismiss</button>
        </div>
      ) : null}
      {returnedError ? <div className="banner error" role="alert">{returnedError}</div> : null}
      {error ? <div className="banner error" role="alert">{error}</div> : null}

      <section aria-label="Connected accounts" className="grid-3">
        {(connections.length ? connections : (['youtube', 'instagram', 'tiktok'] as Platform[]).map((p) => ({ platform: p, available: false, connected: false, accountName: null, connectedAt: null, lastSyncedAt: null, setup: '' }))).map((c) => (
          <div key={c.platform} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BrandMark platform={c.platform} />
              <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <strong>{PLATFORM[c.platform].name}</strong>
                <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.connected ? (c.accountName ?? 'Connected') : c.available ? 'Ready to connect' : c.platform === 'youtube' ? 'Needs server setup' : 'Coming next'}
                </span>
              </div>
              {c.connected ? <span className="tag green" style={{ fontWeight: 600 }}>● Connected</span> : null}
            </div>
            {c.connected ? (
              <div className="pills" style={{ alignItems: 'center' }}>
                <span className="muted small" style={{ flex: 1 }}>Synced {c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'not yet'}</span>
                {c.platform === 'youtube' ? <button type="button" className="btn" style={{ minHeight: 40 }} onClick={() => void statsQ.reload()}>Refresh</button> : null}
                <button type="button" className="btn" style={{ minHeight: 40, color: '#8a0c12' }} onClick={() => disconnect(c)}>Disconnect</button>
              </div>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => connect(c)} disabled={busy === c.platform}>
                <Icon name="plus" size={16} stroke={2.6} />{busy === c.platform ? 'Opening…' : `Connect ${PLATFORM[c.platform].name}`}
              </button>
            )}
          </div>
        ))}
      </section>

      {stats ? <YouTubeDashboard stats={stats} /> : yt?.connected && statsQ.loading ? (
        <div className="card card-pad muted">Loading your YouTube stats…</div>
      ) : yt?.connected && statsQ.error ? (
        <div className="banner error">Could not load YouTube stats: {statsQ.error}</div>
      ) : (
        <SampleDashboard onConnect={() => yt && connect(yt)} />
      )}

      {setupFor ? <SetupDialog c={setupFor} onClose={() => setSetupFor(null)} /> : null}
    </>
  );
}

function YouTubeDashboard({ stats }: { stats: YouTubeStats }) {
  const days = stats.days.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    value: d.views,
    detail: new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
  }));
  const best = [...stats.days].sort((a, b) => b.views - a.views)[0];
  return (
    <>
      <section className="kpi-strip" aria-label={`${stats.channelTitle} totals`}>
        <Kpi label="Subscribers" value={fmt(stats.subscribers)} note={stats.subscribersGained ? `+${fmt(stats.subscribersGained)} in ${stats.periodDays} days` : undefined} tone="up" />
        <Kpi label={`Views, last ${stats.periodDays} days`} value={fmt(stats.periodViews)} note={`${fmt(stats.totalViews)} all time`} />
        <Kpi label="Engagement rate" value={`${stats.engagementRate}%`} note="likes + comments + shares ÷ views" />
        <Kpi label="Videos" value={fmt(stats.videoCount)} note={stats.channelTitle} />
      </section>
      {stats.note ? <div className="banner info">{stats.note}</div> : null}
      <div className="dash-grid">
        <section className="card card-pad span-8" aria-labelledby="yt-views">
          <h2 id="yt-views" className="panel-title">Daily views <span className="muted small" style={{ fontFamily: 'var(--font)', fontWeight: 400 }}>{best ? `Best day: ${new Date(best.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${fmt(best.views)}` : ''}</span></h2>
          {days.length ? <BarChart data={days} title="YouTube daily views" height={220} /> : <p className="muted">No daily data yet.</p>}
        </section>
        <section className="card card-pad span-4" aria-labelledby="yt-eng">
          <h2 id="yt-eng" className="panel-title">How people engaged</h2>
          <SplitBar label="Engagement" parts={[
            { label: 'Likes', value: stats.periodLikes, color: SERIES[0] },
            { label: 'Comments', value: stats.periodComments, color: SERIES[1] },
            { label: 'Shares', value: stats.periodShares, color: SERIES[2] },
          ]} />
          <p className="muted small" style={{ margin: '16px 0 0' }}>Last {stats.periodDays} days, from YouTube Analytics.</p>
        </section>
        <section className="card card-pad span-12" aria-labelledby="yt-places">
          <h2 id="yt-places" className="panel-title">Views by place <span className="sample-ribbon">Example · link videos to memories to see yours</span></h2>
          <RankedBars items={SAMPLE_PLACES.map((p) => ({ key: p.place, label: <>{p.place} <span className="am muted small">{p.am}</span></>, value: p.views }))} />
        </section>
      </div>
    </>
  );
}

function SampleDashboard({ onConnect }: { onConnect: () => void }) {
  const sample = Array.from({ length: 14 }, (_, i) => ({ label: `${i + 1}`, value: 800 + Math.round(500 * Math.sin(i / 2) ** 2) + (i > 9 ? 900 : 0), detail: `Day ${i + 1}` }));
  return (
    <section className="card card-lg" style={{ overflow: 'hidden', padding: 0 }} aria-labelledby="sample">
      <div className="tibeb" />
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <h2 id="sample" className="section-title">What you'll see <span className="am">· ምሳሌ</span></h2>
          <span className="sample-ribbon">Sample data</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>Connect YouTube to see your real subscribers, daily views, engagement, and which places your audience loves most.</p>
        <div className="dash-grid">
          <div className="span-8"><BarChart data={sample} title="Sample daily views" height={180} /></div>
          <div className="span-4 stack" style={{ gap: 14 }}>
            <SplitBar label="Sample engagement" parts={[{ label: 'Likes', value: 620, color: SERIES[0] }, { label: 'Comments', value: 110, color: SERIES[1] }, { label: 'Shares', value: 85, color: SERIES[2] }]} />
            <button type="button" className="btn btn-primary" onClick={onConnect}>Connect YouTube</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Uses the official logo if one is placed in /public/brands, otherwise a neutral badge. */
function BrandMark({ platform }: { platform: Platform }) {
  const [failed, setFailed] = useState(false);
  const p = PLATFORM[platform];
  if (!failed) {
    return <img src={`/brands/${platform}.svg`} alt="" width={46} height={46} style={{ flex: 'none', objectFit: 'contain' }} onError={() => setFailed(true)} />;
  }
  return <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 12, background: p.bg, color: p.fg, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none' }}>{p.short}</span>;
}

function SetupDialog({ c, onClose }: { c: ConnectionStatus; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const name = PLATFORM[c.platform].name;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <div className="tibeb" />
        <div className="stack" style={{ padding: 24, gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark platform={c.platform} />
            <h2 id="setup-title" className="section-title" style={{ fontSize: 22 }}>Connect {name}</h2>
          </div>
          {c.platform === 'youtube' ? (
            <>
              <p style={{ margin: 0, lineHeight: 1.6 }}>The button works once this Teguwaz server has a Google OAuth app. One-time setup by the server owner:</p>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                <li>In Google Cloud Console, create a project and enable <strong>YouTube Data API v3</strong> and <strong>YouTube Analytics API</strong>.</li>
                <li>Set up the OAuth consent screen, then create an <strong>OAuth client ID</strong> of type <em>Web application</em>.</li>
                <li>Add the redirect URI <code>http://localhost:8080/api/connections/youtube/callback</code> (or your server's address).</li>
                <li>On the backend set <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code> and <code>TOKEN_ENCRYPTION_KEY</code> (<code>openssl rand -base64 32</code>), then restart.</li>
              </ol>
              <p className="muted small" style={{ margin: 0 }}>Teguwaz asks only for read-only access to channel statistics and analytics. Tokens are stored encrypted.</p>
            </>
          ) : (
            <p style={{ margin: 0, lineHeight: 1.6 }}>{c.setup}</p>
          )}
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
