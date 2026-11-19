import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { ApiError } from '../api/client';
import type { Channel, Platform, PlatformInfo, YouTubeStats } from '../api/types';
import { BarChart, Kpi, RankedBars, SERIES, SplitBar, fmt } from '../components/charts';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { useAsync } from '../lib/useAsync';

/** Neutral badges used until the official logo files are added to /public/brands. */
const BADGE: Record<Platform, { short: string; bg: string; fg: string }> = {
  youtube: { short: 'YT', bg: '#DA121A', fg: '#fff' },
  tiktok: { short: 'TT', bg: '#1D1A14', fg: '#fff' },
  instagram: { short: 'IG', bg: '#DCE4F7', fg: '#1E3A8A' },
  facebook: { short: 'FB', bg: '#E1E9F8', fg: '#1E3A8A' },
  x: { short: 'X', bg: '#1D1A14', fg: '#fff' },
  telegram: { short: 'TG', bg: '#DDEFF8', fg: '#0B5E87' },
  website: { short: '', bg: '#E2F2E6', fg: '#06742A' },
  other: { short: '', bg: '#F0ECE0', fg: '#5E5648' },
};

const PLACEHOLDER: Record<Platform, string> = {
  youtube: 'https://www.youtube.com/@yourchannel',
  tiktok: 'https://www.tiktok.com/@yourname',
  instagram: 'https://www.instagram.com/yourname',
  facebook: 'https://www.facebook.com/yourpage',
  x: 'https://x.com/yourname',
  telegram: 'https://t.me/yourchannel',
  website: 'https://yourblog.com',
  other: 'https://…',
};

const SAMPLE_PLACES = [
  { place: 'Lalibela', am: 'ላሊበላ', views: 137000 },
  { place: 'Danakil Depression', am: 'ዳናኪል', views: 90000 },
  { place: 'Simien Mountains', am: 'ስሜን', views: 27000 },
  { place: 'Addis Ababa food tour', am: 'አዲስ አበባ', views: 17000 },
];

export function Creator() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const platformsQ = useAsync(() => api.platforms(), []);
  const channelsQ = useAsync(() => api.listChannels(), []);
  const [editing, setEditing] = useState<Channel | 'new' | null>(null);
  const [setupFor, setSetupFor] = useState<PlatformInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsFor, setStatsFor] = useState<string | null>(null);

  const platforms = platformsQ.data ?? [];
  const channels = channelsQ.data ?? [];
  const connected = channels.filter((c) => c.connected);
  const activeStatsId = statsFor && connected.some((c) => c.id === statsFor) ? statsFor : connected[0]?.id ?? null;
  const statsQ = useAsync(() => (activeStatsId ? api.channelStats(activeStatsId) : Promise.resolve(null)), [activeStatsId]);

  const justConnected = params.get('connected');
  const returnedError = params.get('error');
  useEffect(() => {
    if (justConnected) { void channelsQ.reload(); setStatsFor(justConnected); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected]);

  const byPlatform = platforms.map((p) => ({ p, list: channels.filter((c) => c.platform === p.id) })).filter((g) => g.list.length);

  async function connect(c: Channel) {
    const info = platforms.find((p) => p.id === c.platform);
    if (!c.statsAvailable) { if (info) setSetupFor(info); return; }
    setBusy(c.id);
    setError(null);
    try {
      const { authorizeUrl } = await api.connectChannel(c.id);
      if (authorizeUrl.startsWith('/')) navigate(authorizeUrl); else window.location.assign(authorizeUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the connection');
    } finally {
      setBusy(null);
    }
  }

  async function disconnectStats(c: Channel) {
    if (!window.confirm(`Stop reading stats for "${c.name}"? The channel stays in your list.`)) return;
    await api.disconnectChannel(c.id);
    void channelsQ.reload();
  }

  async function remove(c: Channel) {
    if (!window.confirm(`Remove "${c.name}" from Teguwaz?`)) return;
    await api.deleteChannel(c.id);
    void channelsQ.reload();
  }

  return (
    <>
      <PageHeader title="Creator studio" am="የይዘት ስቱዲዮ" subtitle="Add every channel you publish on: as many as you have, on any platform."
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} stroke={2.6} />Add channel</button>} />

      {justConnected ? (
        <div className="banner info" role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <span><strong>Channel connected.</strong> Its stats are below.</span>
          <button type="button" className="btn" style={{ minHeight: 32, padding: '0 10px', fontSize: 13 }} onClick={() => setParams({}, { replace: true })}>Dismiss</button>
        </div>
      ) : null}
      {returnedError ? <div className="banner error" role="alert">{returnedError}</div> : null}
      {error ? <div className="banner error" role="alert">{error}</div> : null}

      <section aria-labelledby="mych" className="stack" style={{ gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h2 id="mych" className="section-title">My channels <span className="am">· የእኔ ቻናሎች</span></h2>
          {channels.length ? <span className="muted small">{channels.length} channel{channels.length === 1 ? '' : 's'} on {byPlatform.length} platform{byPlatform.length === 1 ? '' : 's'}</span> : null}
        </div>

        {!channelsQ.loading && !channels.length ? (
          <div className="card" style={{ padding: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['youtube', 'tiktok', 'instagram', 'telegram'] as Platform[]).map((p) => <BrandMark key={p} platform={p} size={44} />)}
            </div>
            <div className="stack" style={{ flex: '1 1 300px', gap: 6 }}>
              <strong style={{ fontSize: 17 }}>Add your first channel</strong>
              <span className="muted">YouTube, TikTok, Instagram, Facebook, X, Telegram, your blog, or anything else. Give it a name and a link; add as many as you like.</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}><Icon name="plus" size={18} stroke={2.6} />Add channel</button>
          </div>
        ) : null}

        <div className="channel-grid">
          {channels.map((c) => (
            <article key={c.id} className="card channel-card" aria-label={c.name}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <BrandMark platform={c.platform} />
                <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</strong>
                  <span className="muted small">{platforms.find((p) => p.id === c.platform)?.name ?? c.platform}</span>
                </div>
                {c.connected ? <span className="tag green" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>● Stats on</span> : null}
              </div>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="channel-link"><Icon name="link" size={14} />{c.url.replace(/^https:\/\//, '')}</a>
              <div className="channel-actions">
                {c.statsSupported ? (
                  c.connected ? (
                    <>
                      <button type="button" className="btn" onClick={() => setStatsFor(c.id)} aria-pressed={activeStatsId === c.id}>View stats</button>
                      <button type="button" className="btn" onClick={() => disconnectStats(c)}>Stop stats</button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-primary" onClick={() => connect(c)} disabled={busy === c.id}>
                      {busy === c.id ? 'Opening…' : 'Connect stats'}
                    </button>
                  )
                ) : <span className="muted small" style={{ flex: 1 }}>Saved as a link</span>}
                <button type="button" className="icon-btn" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => setEditing(c)}><Icon name="edit" size={17} /></button>
                <button type="button" className="icon-btn" aria-label={`Remove ${c.name}`} title="Remove" onClick={() => remove(c)}><Icon name="trash" size={17} /></button>
              </div>
            </article>
          ))}
          {channels.length ? (
            <button type="button" className="channel-add" onClick={() => setEditing('new')}><Icon name="plus" size={24} />Add another channel</button>
          ) : null}
        </div>
      </section>

      {connected.length ? (
        <section aria-labelledby="stats" className="stack" style={{ gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 id="stats" className="section-title">Channel stats <span className="am">· ስታቲስቲክስ</span></h2>
            {connected.length > 1 ? (
              <label className="field" style={{ flexDirection: 'row', alignItems: 'center', fontWeight: 400 }}>
                <span className="muted">Channel</span>
                <select className="select" style={{ width: 'auto' }} value={activeStatsId ?? ''} onChange={(e) => setStatsFor(e.target.value)}>
                  {connected.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          {statsQ.data ? <YouTubeDashboard stats={statsQ.data} onRefresh={() => void statsQ.reload()} />
            : statsQ.error ? <div className="banner error">Could not load stats: {statsQ.error}</div>
              : <div className="card card-pad muted">Loading stats…</div>}
        </section>
      ) : channels.length ? (
        <SampleDashboard />
      ) : null}

      {editing ? (
        <ChannelForm platforms={platforms} existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void channelsQ.reload(); }} />
      ) : null}
      {setupFor ? <SetupDialog info={setupFor} onClose={() => setSetupFor(null)} /> : null}
    </>
  );
}

function ChannelForm({ platforms, existing, onClose, onSaved }: {
  platforms: PlatformInfo[]; existing: Channel | null; onClose: () => void; onSaved: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>(existing?.platform ?? 'youtube');
  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const info = platforms.find((p) => p.id === platform);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const input = { platform, name: name.trim(), url: url.trim() };
      if (existing) await api.updateChannel(existing.id, input); else await api.createChannel(input);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) { setError(err.message); setFields(err.fields); } else setError('Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cf-title">
        <div className="tibeb" />
        <form className="stack" style={{ padding: 24, gap: 16 }} onSubmit={submit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="cf-title" className="section-title" style={{ fontSize: 22 }}>{existing ? 'Edit channel' : 'Add a channel'} <span className="am">· {existing ? 'ቻናል አስተካክል' : 'ቻናል ጨምር'}</span></h2>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
          </div>
          {error ? <div className="banner error">{error}</div> : null}

          <div className="field">Platform
            <div className="platform-pick" role="radiogroup" aria-label="Platform">
              {platforms.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={platform === p.id} className="platform-option"
                  onClick={() => setPlatform(p.id)} disabled={!!existing?.connected && existing.platform !== p.id}>
                  <BrandMark platform={p.id} size={30} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="field">Channel name
            <input className="input" required maxLength={160} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meron Travels" aria-invalid={!!fields.name} autoFocus />
          </label>
          <label className="field">Link
            <input className="input" required maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder={PLACEHOLDER[platform]} inputMode="url" aria-invalid={!!fields.url} />
            <span className="muted small" style={{ fontWeight: 400 }}>Paste the address of your channel or page.</span>
          </label>

          {info ? (
            <div className="banner info" style={{ fontSize: 13 }}>
              {info.statsSupported
                ? (info.statsAvailable ? 'After saving, use "Connect stats" to see subscribers, views and engagement.' : 'Stats can be connected once YouTube is set up on the server. The channel is saved now either way.')
                : info.setup}
            </div>
          ) : null}

          <div className="pills" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Add channel'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function YouTubeDashboard({ stats, onRefresh }: { stats: YouTubeStats; onRefresh: () => void }) {
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
          <h2 id="yt-views" className="panel-title">Daily views
            <span className="muted small" style={{ fontFamily: 'var(--font)', fontWeight: 400 }}>
              {best ? `Best day: ${new Date(best.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${fmt(best.views)}` : ''}
              {' '}<button type="button" className="btn" style={{ minHeight: 30, padding: '0 10px', fontSize: 12, marginLeft: 8 }} onClick={onRefresh}>Refresh</button>
            </span>
          </h2>
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

function SampleDashboard() {
  const sample = Array.from({ length: 14 }, (_, i) => ({ label: `${i + 1}`, value: 800 + Math.round(500 * Math.sin(i / 2) ** 2) + (i > 9 ? 900 : 0), detail: `Day ${i + 1}` }));
  return (
    <section className="card card-lg" style={{ overflow: 'hidden', padding: 0 }} aria-labelledby="sample">
      <div className="tibeb" />
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <h2 id="sample" className="section-title">Stats you can unlock <span className="am">· ምሳሌ</span></h2>
          <span className="sample-ribbon">Sample data</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>Use "Connect stats" on a YouTube channel to see its real subscribers, daily views and engagement here.</p>
        <div className="dash-grid">
          <div className="span-8"><BarChart data={sample} title="Sample daily views" height={180} /></div>
          <div className="span-4"><SplitBar label="Sample engagement" parts={[{ label: 'Likes', value: 620, color: SERIES[0] }, { label: 'Comments', value: 110, color: SERIES[1] }, { label: 'Shares', value: 85, color: SERIES[2] }]} /></div>
        </div>
      </div>
    </section>
  );
}

/** The official logo when its file is in /public/brands, otherwise a neutral badge. */
export function BrandMark({ platform, size = 46 }: { platform: Platform; size?: number }) {
  const [failed, setFailed] = useState(false);
  const b = BADGE[platform];
  if (!failed && platform !== 'website' && platform !== 'other') {
    return <img src={`/brands/${platform}.svg`} alt="" width={size} height={size} style={{ flex: 'none', objectFit: 'contain' }} onError={() => setFailed(true)} />;
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size * 0.26, background: b.bg, color: b.fg, fontWeight: 700, fontSize: size * 0.34, display: 'grid', placeItems: 'center', flex: 'none' }}>
      {b.short || <Icon name={platform === 'website' ? 'link' : 'plus'} size={size * 0.45} />}
    </span>
  );
}

function SetupDialog({ info, onClose }: { info: PlatformInfo; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
        <div className="tibeb" />
        <div className="stack" style={{ padding: 24, gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark platform={info.id} />
            <h2 id="setup-title" className="section-title" style={{ fontSize: 22 }}>{info.name} stats</h2>
          </div>
          {info.id === 'youtube' ? (
            <>
              <p style={{ margin: 0, lineHeight: 1.6 }}>Connecting works once this Teguwaz server has a Google OAuth app. One-time setup by the server owner:</p>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                <li>In Google Cloud Console, enable <strong>YouTube Data API v3</strong> and <strong>YouTube Analytics API</strong>.</li>
                <li>Set up the OAuth consent screen, then create an <strong>OAuth client ID</strong> of type <em>Web application</em>.</li>
                <li>Add the redirect URI <code>http://localhost:8080/api/channels/oauth/youtube/callback</code> (or your server's address).</li>
                <li>Set <code>YOUTUBE_CLIENT_ID</code>, <code>YOUTUBE_CLIENT_SECRET</code> and <code>TOKEN_ENCRYPTION_KEY</code> (<code>openssl rand -base64 32</code>), then restart.</li>
              </ol>
              <p className="muted small" style={{ margin: 0 }}>Teguwaz asks only for read-only access. Each channel connects separately, so you can connect several.</p>
            </>
          ) : <p style={{ margin: 0, lineHeight: 1.6 }}>{info.setup}</p>}
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
