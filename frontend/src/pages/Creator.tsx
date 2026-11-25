import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { ApiError } from '../api/client';
import type { Channel, Platform, PlatformInfo, PublicStats, SocialStats, YouTubeStats } from '../api/types';
import { config } from '../config';
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
  // Channels with stats: YouTube, TikTok and Instagram.
  const statsChannels = channels.filter((c) => c.statsSupported);
  const activeStatsId = statsFor && statsChannels.some((c) => c.id === statsFor) ? statsFor : statsChannels[0]?.id ?? null;
  const active = statsChannels.find((c) => c.id === activeStatsId) ?? null;
  const isYouTube = active?.platform === 'youtube';
  const ytInfo = platforms.find((p) => p.id === 'youtube');
  const publicReady = !!ytInfo?.publicStatsAvailable;
  const publicQ = useAsync(() => (active && isYouTube && publicReady ? api.channelPublicStats(active.id) : Promise.resolve(null)), [active?.id, active?.url, publicReady]);
  const statsQ = useAsync(() => (active?.connected && isYouTube ? api.channelStats(active.id) : Promise.resolve(null)), [active?.id, active?.connected]);
  const socialQ = useAsync(() => (active?.connected && !isYouTube ? api.channelSocialStats(active.id) : Promise.resolve(null)), [active?.id, active?.connected]);

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
                {c.connected ? <span className="tag green" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>● Analytics on</span> : null}
              </div>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="channel-link"><Icon name="link" size={14} />{c.url.replace(/^https:\/\//, '')}</a>
              <div className="channel-actions">
                {c.statsSupported ? (
                  <>
                    <button type="button" className={`btn${activeStatsId === c.id ? ' btn-primary' : ''}`} onClick={() => { setStatsFor(c.id); document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' }); }}>View stats</button>
                    {c.connected ? (
                      <button type="button" className="btn" onClick={() => disconnectStats(c)} title="Stop reading private analytics">{c.platform === 'youtube' ? 'Stop analytics' : 'Disconnect'}</button>
                    ) : (
                      <button type="button" className="btn" onClick={() => connect(c)} disabled={busy === c.id} title="Sign in as the channel owner for daily views and engagement">
                        {busy === c.id ? 'Opening…' : c.platform === 'youtube' ? 'Connect analytics' : 'Connect stats'}
                      </button>
                    )}
                  </>
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

      {active ? (
        <section aria-labelledby="stats" id="stats" className="stack" style={{ gap: 14, scrollMarginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h2 className="section-title" id="stats-title">Channel stats <span className="am">· ስታቲስቲክስ</span></h2>
            {statsChannels.length > 1 ? (
              <label className="field" style={{ flexDirection: 'row', alignItems: 'center', fontWeight: 400 }}>
                <span className="muted">Channel</span>
                <select className="select" style={{ width: 'auto' }} value={active.id} onChange={(e) => setStatsFor(e.target.value)}>
                  {statsChannels.map((c) => <option key={c.id} value={c.id}>{c.name} · {platforms.find((p) => p.id === c.platform)?.name ?? c.platform}</option>)}
                </select>
              </label>
            ) : null}
          </div>

          {config.demoMode ? (
            <div className="demo-warning" role="note">
              <strong>Demo mode: these are sample numbers, not your channel.</strong>
              <span>To see real numbers for {active.name}, run the backend with {isYouTube ? <><code>YOUTUBE_API_KEY</code> set</> : <>the {active.platform === 'tiktok' ? 'TikTok' : 'Instagram'} app keys set</>} and start the app with <code>VITE_DEMO_MODE=false</code>.</span>
            </div>
          ) : null}

          {isYouTube ? (
            <>
          {publicReady ? (
            publicQ.data ? <PublicStatsPanel stats={publicQ.data} url={active.url} demo={config.demoMode} onRefresh={() => void publicQ.reload()} />
              : publicQ.error ? <div className="banner error">{publicQ.error}</div>
                : <div className="card card-pad muted">Reading {active.name} from YouTube…</div>
          ) : (
            <div className="card card-pad stack" style={{ gap: 10 }}>
              <strong>See real numbers for {active.name}</strong>
              <span className="muted">Add a free YouTube Data API key to the backend and Teguwaz reads this channel's public subscribers, views and latest videos straight from its link, with no sign-in needed.</span>
              <ol className="small" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                <li>In Google Cloud Console, enable <strong>YouTube Data API v3</strong>.</li>
                <li>Create an <strong>API key</strong> (Credentials → Create credentials → API key) and restrict it to that API.</li>
                <li>Set <code>YOUTUBE_API_KEY</code> on the backend and restart.</li>
              </ol>
            </div>
          )}

          {active.connected ? (
            statsQ.data ? <YouTubeDashboard stats={statsQ.data} demo={config.demoMode} onRefresh={() => void statsQ.reload()} />
              : statsQ.error ? <div className="banner error">Could not load analytics: {statsQ.error}</div>
                : <div className="card card-pad muted">Loading analytics…</div>
          ) : (
            <div className="card card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <div className="stack" style={{ gap: 4, flex: '1 1 320px' }}>
                <strong>Daily views and engagement</strong>
                <span className="muted small">Private analytics need the channel owner to sign in with Google once. Each channel connects separately.</span>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => connect(active)} disabled={busy === active.id}>Connect analytics</button>
            </div>
          )}
            </>
          ) : active.connected ? (
            socialQ.data ? <SocialStatsPanel stats={socialQ.data} demo={config.demoMode} onRefresh={() => void socialQ.reload()} />
              : socialQ.error ? <div className="banner error">{socialQ.error}</div>
                : <div className="card card-pad muted">Reading {active.name}…</div>
          ) : (
            <div className="card card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
              <BrandMark platform={active.platform} size={48} />
              <div className="stack" style={{ gap: 4, flex: '1 1 320px' }}>
                <strong>Followers, likes and your latest {active.platform === 'tiktok' ? 'videos' : 'posts'}</strong>
                <span className="muted small">
                  {active.platform === 'tiktok'
                    ? 'Sign in to TikTok once to let Teguwaz read your profile counts and recent videos. Read-only.'
                    : 'Sign in to Instagram once to let Teguwaz read your profile counts and recent posts. Needs a Business or Creator account (free to switch in the Instagram app). Read-only.'}
                </span>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => connect(active)} disabled={busy === active.id}>
                Connect {active.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
              </button>
            </div>
          )}
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

function YouTubeDashboard({ stats, onRefresh, demo }: { stats: YouTubeStats; onRefresh: () => void; demo: boolean }) {
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
          <h2 id="yt-views" className="panel-title">Daily views {demo ? <span className="sample-ribbon" style={{ marginLeft: 0 }}>Sample</span> : null}
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
      </div>
    </>
  );
}

function PublicStatsPanel({ stats, url, demo, onRefresh }: { stats: PublicStats; url: string; demo: boolean; onRefresh: () => void }) {
  const videos = stats.latestVideos;
  const avg = videos.length ? Math.round(videos.reduce((n, v) => n + v.views, 0) / videos.length) : 0;
  const top = [...videos].sort((a, b) => b.views - a.views)[0];
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
  return (
    <>
      <section className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }} aria-label="Channel">
        {stats.thumbnailUrl ? <img src={stats.thumbnailUrl} alt="" width={56} height={56} style={{ borderRadius: '50%', flex: 'none' }} referrerPolicy="no-referrer" />
          : <BrandMark platform="youtube" size={56} />}
        <div className="stack" style={{ gap: 2, flex: '1 1 240px' }}>
          <strong style={{ fontSize: 18 }}>{stats.title} {demo ? <span className="sample-ribbon">Sample</span> : <span className="tag green">Live from YouTube</span>}</strong>
          <span className="muted small">{stats.handle ?? ''}{stats.createdAt ? ` · on YouTube since ${date(stats.createdAt)}` : ''} · updated {new Date(stats.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <a className="btn" href={url} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16} />Open on YouTube</a>
        <button type="button" className="btn" onClick={onRefresh}>Refresh</button>
      </section>
      <section className="kpi-strip" aria-label="Public totals">
        <Kpi label="Subscribers" value={stats.subscribersHidden ? 'Hidden' : fmt(stats.subscribers)} note={stats.subscribersHidden ? 'The channel hides this count' : undefined} />
        <Kpi label="Total views" value={fmt(stats.totalViews)} />
        <Kpi label="Videos" value={fmt(stats.videoCount)} />
        <Kpi label={`Average views, last ${videos.length} videos`} value={fmt(avg)} note={top ? `Top: ${fmt(top.views)}` : undefined} />
      </section>
      {videos.length ? (
        <div className="dash-grid">
          <section className="card card-pad span-5" aria-labelledby="lv-rank">
            <h2 id="lv-rank" className="panel-title">Latest videos by views</h2>
            <RankedBars items={videos.map((v) => ({ key: v.id, label: v.title, value: v.views }))} />
          </section>
          <section className="card card-pad span-7" aria-labelledby="lv-table">
            <h2 id="lv-table" className="panel-title">Latest uploads <span className="am">· የቅርብ ቪዲዮዎች</span></h2>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 520 }}>
                <thead><tr><th>Video</th><th>Published</th><th style={{ textAlign: 'right' }}>Views</th><th style={{ textAlign: 'right' }}>Likes</th><th style={{ textAlign: 'right' }}>Comments</th></tr></thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id}>
                      <td>
                        {demo ? v.title : <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer">{v.title}</a>}
                      </td>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>{date(v.publishedAt)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(v.views)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(v.likes)}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(v.comments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : <div className="card card-pad muted">This channel has no public videos yet.</div>}
    </>
  );
}

function SocialStatsPanel({ stats, demo, onRefresh }: { stats: SocialStats; demo: boolean; onRefresh: () => void }) {
  const tt = stats.platform === 'tiktok';
  const posts = stats.recentPosts;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
  const metric = tt ? 'views' : 'likes';
  return (
    <>
      <section className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }} aria-label="Account">
        {stats.avatarUrl ? <img src={stats.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: '50%', flex: 'none' }} referrerPolicy="no-referrer" />
          : <BrandMark platform={stats.platform} size={56} />}
        <div className="stack" style={{ gap: 2, flex: '1 1 240px' }}>
          <strong style={{ fontSize: 18 }}>{stats.accountName ?? stats.handle} {demo ? <span className="sample-ribbon">Sample</span> : <span className="tag green">Live from {tt ? 'TikTok' : 'Instagram'}</span>}</strong>
          <span className="muted small">{stats.handle ?? ''} · updated {new Date(stats.fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {stats.profileUrl ? <a className="btn" href={stats.profileUrl} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16} />Open on {tt ? 'TikTok' : 'Instagram'}</a> : null}
        <button type="button" className="btn" onClick={onRefresh}>Refresh</button>
      </section>
      <section className="kpi-strip" aria-label="Totals">
        <Kpi label="Followers" value={stats.followers == null ? '—' : fmt(stats.followers)} />
        {tt ? <Kpi label="Total likes" value={stats.totalLikes == null ? '—' : fmt(stats.totalLikes)} /> : <Kpi label="Following" value={stats.following == null ? '—' : fmt(stats.following)} />}
        <Kpi label={tt ? 'Videos' : 'Posts'} value={stats.posts == null ? '—' : fmt(stats.posts)} />
        <Kpi label={`Engagement, last ${stats.recentCount}`} value={stats.engagementRate == null ? '—' : `${stats.engagementRate}%`}
          note={stats.note ?? (tt ? 'Likes, comments and shares per view' : undefined)} />
      </section>
      {posts.length ? (
        <div className="dash-grid">
          <section className="card card-pad span-5" aria-labelledby="sp-rank">
            <h2 id="sp-rank" className="panel-title">Recent {tt ? 'videos' : 'posts'} by {metric}</h2>
            <RankedBars items={posts.map((p) => ({ key: p.id, label: p.title, value: (tt ? p.views : p.likes) ?? 0 }))} />
          </section>
          <section className="card card-pad span-7" aria-labelledby="sp-table">
            <h2 id="sp-table" className="panel-title">Recent {tt ? 'videos' : 'posts'}</h2>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 520 }}>
                <thead><tr><th>{tt ? 'Video' : 'Post'}</th><th>Posted</th>{tt ? <th style={{ textAlign: 'right' }}>Views</th> : null}<th style={{ textAlign: 'right' }}>Likes</th><th style={{ textAlign: 'right' }}>Comments</th>{tt ? <th style={{ textAlign: 'right' }}>Shares</th> : null}</tr></thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.url && !demo ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a> : p.title}</td>
                      <td className="small" style={{ whiteSpace: 'nowrap' }}>{date(p.publishedAt)}</td>
                      {tt ? <td style={{ textAlign: 'right' }}>{p.views == null ? '—' : fmt(p.views)}</td> : null}
                      <td style={{ textAlign: 'right' }}>{p.likes == null ? '—' : fmt(p.likes)}</td>
                      <td style={{ textAlign: 'right' }}>{p.comments == null ? '—' : fmt(p.comments)}</td>
                      {tt ? <td style={{ textAlign: 'right' }}>{p.shares == null ? '—' : fmt(p.shares)}</td> : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : <div className="card card-pad muted">No recent {tt ? 'videos' : 'posts'} to show yet.</div>}
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
        <p className="muted" style={{ margin: 0 }}>Add a YouTube channel to see its real subscribers, views and latest videos here.</p>
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
          ) : info.id === 'tiktok' ? (
            <>
              <p style={{ margin: 0, lineHeight: 1.6 }}>Connecting works once this Teguwaz server has a TikTok app. One-time setup by the server owner:</p>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                <li>At <strong>developers.tiktok.com</strong>, create an app and add <strong>Login Kit</strong> and the <strong>Display API</strong>.</li>
                <li>Request the scopes <code>user.info.basic</code>, <code>user.info.profile</code>, <code>user.info.stats</code> and <code>video.list</code>.</li>
                <li>Add the redirect URI <code>http://localhost:8080/api/channels/oauth/tiktok/callback</code> (or your server's address).</li>
                <li>Set <code>TIKTOK_CLIENT_KEY</code>, <code>TIKTOK_CLIENT_SECRET</code> and <code>TOKEN_ENCRYPTION_KEY</code>, then restart.</li>
              </ol>
              <p className="muted small" style={{ margin: 0 }}>Until TikTok reviews and approves the app, only accounts you add as test users (sandbox) can connect.</p>
            </>
          ) : info.id === 'instagram' ? (
            <>
              <p style={{ margin: 0, lineHeight: 1.6 }}>Connecting works once this Teguwaz server has a Meta app. One-time setup by the server owner:</p>
              <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                <li>At <strong>developers.facebook.com</strong>, create an app and add the <strong>Instagram</strong> product, using <em>API setup with Instagram login</em>.</li>
                <li>Ask for <code>instagram_business_basic</code> and <code>instagram_business_manage_insights</code>.</li>
                <li>Add the redirect URI <code>http://localhost:8080/api/channels/oauth/instagram/callback</code> (or your server's address).</li>
                <li>Set <code>INSTAGRAM_APP_ID</code>, <code>INSTAGRAM_APP_SECRET</code> and <code>TOKEN_ENCRYPTION_KEY</code>, then restart.</li>
              </ol>
              <p className="muted small" style={{ margin: 0 }}>Works with Instagram Business and Creator accounts. Your own account works right away as an app tester; other people need Meta's app review.</p>
            </>
          ) : <p style={{ margin: 0, lineHeight: 1.6 }}>{info.setup}</p>}
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
