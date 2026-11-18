import { PageHeader, SampleNote } from '../components/PageHeader';
import { Icon } from '../components/Icon';

// Sample data until the Creator feature connects YouTube, TikTok and Instagram.
const PLATFORMS = [
  { name: 'TikTok', views: '124K views · 8.1% engagement', width: 100, color: 'var(--ink)' },
  { name: 'YouTube', views: '58K views · 4.2% engagement', width: 47, color: 'var(--flag-red)' },
  { name: 'Instagram', views: 'Not connected', width: 0, color: 'transparent' },
];

const PLACES = [
  { place: 'Danakil Depression', am: 'ዳናኪል', posts: 5, yt: '22K', tt: '68K', earn: '$140', best: 'TikTok' },
  { place: 'Lalibela', am: 'ላሊበላ', posts: 4, yt: '41K', tt: '96K', earn: '$118', best: 'TikTok' },
  { place: 'Simien Mountains', am: 'ስሜን', posts: 3, yt: '18K', tt: '9K', earn: '$54', best: 'YouTube' },
  { place: 'Addis Ababa food tour', am: 'አዲስ አበባ', posts: 2, yt: '6K', tt: '11K', earn: '$0', best: 'TikTok' },
];

export function Creator() {
  return (
    <>
      <PageHeader title="Creator studio" am="የይዘት ስቱዲዮ" subtitle="All your platforms in one place, connected to the places you filmed."
        actions={
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', fontWeight: 400 }}>
            <span className="muted">Period</span>
            <select className="select" style={{ width: 'auto' }}><option>Last 30 days</option><option>Last 90 days</option><option>This year (2019 E.C.)</option></select>
          </label>
        } />

      <section aria-label="Connected accounts" className="grid-3">
        <Account short="YT" name="YouTube" handle="Connect your channel" bg="var(--flag-red)" />
        <Account short="TT" name="TikTok" handle="Connect your account" bg="var(--ink)" />
        <Account short="IG" name="Instagram" handle="Needs a Creator or Business account" bg="#DCE4F7" fg="#1E3A8A" />
      </section>

      <section aria-label="Totals" className="dark-panel">
        <div className="grid-4" style={{ gap: 0 }}>
          {[
            ['Total views', '182,400', '+18% vs last period'],
            ['Engagement rate', '6.8%', 'interactions ÷ views'],
            ['New followers', '2,315', '+9%'],
            ['Earnings', '$412', '≈ ETB at today\'s rate'],
          ].map(([label, value, note], i) => (
            <div key={label} className="stack" style={{ padding: '22px 24px', gap: 6, borderRight: i < 3 ? '1px solid var(--green-700)' : undefined, background: i === 3 ? 'var(--green-850)' : undefined }}>
              <span style={{ fontSize: 14, color: 'var(--on-dark-muted)' }}>{label}</span>
              <span className="big-number" style={{ fontSize: 32, color: i === 3 ? 'var(--flag-yellow)' : '#fff' }}>{value}</span>
              <span className="small" style={{ color: i % 2 === 0 && i !== 3 ? 'var(--flag-yellow)' : 'var(--on-dark-muted)', fontWeight: 600 }}>{note}</span>
            </div>
          ))}
        </div>
        <div className="tibeb" />
      </section>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <section className="card card-lg col-side stack" style={{ padding: 24, gap: 18 }} aria-labelledby="cmp">
          <h2 id="cmp" className="section-title">Which platform works best?</h2>
          {PLATFORMS.map((p) => (
            <div key={p.name} className="stack" style={{ gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><strong>{p.name}</strong><span className={p.width ? '' : 'muted'}>{p.views}</span></div>
              <div className="bar"><span style={{ width: `${p.width}%`, background: p.color }} /></div>
            </div>
          ))}
          <div className="yellow-panel" style={{ padding: '14px 16px', display: 'flex', gap: 10, lineHeight: 1.5 }}>
            <Icon name="bulb" />
            <span><strong>Insight:</strong> TikTok brings 2× the views, but YouTube earns most of your revenue. Post short clips on TikTok and link to the full YouTube vlog.</span>
          </div>
        </section>
        <section className="card card-lg col-side stack" style={{ padding: 24, gap: 14 }} aria-labelledby="earn">
          <h2 id="earn" className="section-title">Earnings by source</h2>
          {[['YouTube ads', '$262', 'var(--flag-red)'], ['TikTok rewards', '$50', 'var(--ink)'], ['Sponsorship (manual)', '$100', '#E5C400']].map(([l, v, c]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--sand)', paddingBottom: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="dot" style={{ background: c }} />{l}</span><strong>{v}</strong>
            </div>
          ))}
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }}>+ Add manual income</button>
        </section>
      </div>

      <section className="card card-lg stack" style={{ padding: 24, gap: 14 }} aria-labelledby="places">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h2 id="places" className="section-title">Top places by performance</h2>
          <span className="tag green" style={{ fontWeight: 600 }}>Only on Teguwaz</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Place</th><th>Posts</th><th>YouTube</th><th>TikTok</th><th>Earnings</th><th>Best on</th></tr></thead>
            <tbody>
              {PLACES.map((p) => (
                <tr key={p.place}>
                  <td><strong>{p.place}</strong> <span className="am muted small">{p.am}</span></td>
                  <td>{p.posts}</td><td>{p.yt}</td><td>{p.tt}</td><td>{p.earn}</td>
                  <td><span className="tag" style={{ background: p.best === 'YouTube' ? 'var(--flag-red)' : 'var(--ink)', color: '#fff' }}>{p.best}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <SampleNote />
    </>
  );
}

function Account({ short, name, handle, bg, fg = '#fff' }: { short: string; name: string; handle: string; bg: string; fg?: string }) {
  return (
    <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, background: bg, color: fg, fontWeight: 700, display: 'grid', placeItems: 'center', flex: 'none' }}>{short}</span>
      <div className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}><strong>{name}</strong><span className="muted small">{handle}</span></div>
      <button type="button" className="btn btn-primary" style={{ minHeight: 44, padding: '0 14px', fontSize: 14 }} disabled title="Coming in the Creator feature">Connect</button>
    </div>
  );
}
