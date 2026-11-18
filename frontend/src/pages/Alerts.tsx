import { useState } from 'react';
import { PageHeader, SampleNote } from '../components/PageHeader';

type Level = 'high' | 'medium' | 'info' | 'status';

// Sample alerts until the policy-monitoring feature is built.
const ALERTS: { id: number; level: Level; affects: boolean; when: string; title: string; platform: string }[] = [
  { id: 1, level: 'high', affects: true, when: '2 days ago', title: 'YouTube: monetization requirement update', platform: 'YouTube · Monetization' },
  { id: 2, level: 'medium', affects: true, when: '5 days ago', title: 'TikTok: music licensing for commercial clips', platform: 'TikTok · Music' },
  { id: 3, level: 'info', affects: false, when: '1 week ago', title: 'Instagram: Reels length limit changed', platform: 'Instagram · Reels' },
  { id: 4, level: 'status', affects: false, when: '2 weeks ago', title: 'TikTok stats may be delayed after an API update', platform: 'Teguwaz · Connection' },
];

const LEVEL_TAG: Record<Level, { label: string; className: string }> = {
  high: { label: 'High', className: 'tag red' },
  medium: { label: 'Medium', className: 'tag solid-yellow' },
  info: { label: 'Info', className: 'tag green' },
  status: { label: 'App status', className: 'tag' },
};

export function Alerts() {
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [selectedId, setSelectedId] = useState(1);
  const list = filter === 'mine' ? ALERTS.filter((a) => a.affects) : ALERTS;
  const selected = ALERTS.find((a) => a.id === selectedId) ?? ALERTS[0];

  return (
    <>
      <PageHeader title="Policy alerts" am="የፖሊሲ ማሳሰቢያዎች" subtitle="Rule changes on your platforms, summarized, with what to do."
        actions={
          <>
            <button type="button" className="pill dark" aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>Affects me ({ALERTS.filter((a) => a.affects).length})</button>
            <button type="button" className="pill dark" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All updates ({ALERTS.length})</button>
          </>
        } />

      <div className="row">
        <section aria-label="Alert list" className="col-side stack" style={{ gap: 10 }}>
          {list.map((a) => (
            <button key={a.id} type="button" onClick={() => setSelectedId(a.id)} aria-current={a.id === selected.id}
              className="card" style={{
                padding: a.id === selected.id ? 15 : 16, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
                border: a.id === selected.id ? `2px solid ${a.level === 'high' ? 'var(--flag-red)' : 'var(--green-600)'}` : undefined,
              }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={LEVEL_TAG[a.level].className}>{LEVEL_TAG[a.level].label}{a.affects ? ' · affects you' : ''}</span>
                <span className="muted small">{a.when}</span>
              </span>
              <strong>{a.title}</strong>
            </button>
          ))}
        </section>

        <article aria-labelledby="atitle" className="card card-lg col-main" style={{ overflow: 'hidden', padding: 0 }}>
          <div className="tibeb" />
          <div className="stack" style={{ padding: 28, gap: 20 }}>
            <div className="stack" style={{ gap: 8 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={LEVEL_TAG[selected.level].className}>{LEVEL_TAG[selected.level].label}</span>
                <span className="muted small">{selected.platform}</span>
              </span>
              <h2 id="atitle" className="section-title" style={{ fontSize: 26 }}>{selected.title}</h2>
            </div>
            <section className="stack" style={{ background: 'var(--bg)', borderRadius: 14, padding: 18, gap: 10 }}>
              <h3 className="eyebrow" style={{ margin: 0 }}>Summary in 3 points · <span className="am" style={{ textTransform: 'none', letterSpacing: 0 }}>ማጠቃለያ</span></h3>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>[What changed, in plain words]</li>
                <li>[Who it applies to]</li>
                <li>[When it takes effect]</li>
              </ul>
              <button type="button" className="btn am" style={{ alignSelf: 'flex-start', minHeight: 40, fontWeight: 500, fontSize: 14 }}>በአማርኛ አንብብ · Read in Amharic</button>
            </section>
            <section className="stack" style={{ gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Why this affects you</h3>
              <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--ink-2)' }}>Teguwaz matches each change against your connected accounts and the videos linked to your memories.</p>
            </section>
            <section className="stack" style={{ gap: 4 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>What to do</h3>
              <label className="check" style={{ padding: 0 }}><input type="checkbox" />[Suggested step 1]</label>
              <label className="check" style={{ padding: 0 }}><input type="checkbox" />[Suggested step 2]</label>
              <label className="check" style={{ padding: 0 }}><input type="checkbox" />Review affected videos</label>
            </section>
            <div className="pills" style={{ borderTop: '1px solid var(--line)', paddingTop: 18, alignItems: 'center' }}>
              <button type="button" className="btn btn-primary">Mark as resolved</button>
              <button type="button" className="btn">Remind me in 3 days</button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>AI summary. Always check the official policy before acting.</p>
          </div>
        </article>
      </div>
      <SampleNote>Sample alerts. Real alerts come from monitoring each platform's policy pages, in a later feature.</SampleNote>
    </>
  );
}
