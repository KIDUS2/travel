import { useEffect, useState, type FormEvent } from 'react';
import { InstallAppCard, UploadSettingsCard } from '../offline/OfflineUi';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { useMe } from '../auth/MeProvider';
import { config } from '../config';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { formatEthiopianAm } from '../lib/ethiopianDate';
import { useLang } from '../lib/i18n';

/** The signed-in user's own account: name, language, role; password and security live in Keycloak. */
export function Account() {
  const { me, setMe, isAdmin } = useMe();
  const { logout } = useAuth();
  const { setLang } = useLang();
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) { setDisplayName(me.displayName ?? ''); setLanguage(me.preferredLanguage); }
  }, [me]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      const updated = await api.updateMe({ displayName: displayName.trim(), preferredLanguage: language });
      setMe(updated);
      setLang(language);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const accountUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/account`;

  return (
    <>
      <PageHeader title="My account" am="የእኔ መለያ" subtitle="Your name, language and sign-in." />
      <div className="row">
        <section className="card card-lg col-main" style={{ overflow: 'hidden', padding: 0 }} aria-labelledby="profile">
          <div className="tibeb" />
          <form className="stack" style={{ padding: 24, gap: 16, maxWidth: 560 }} onSubmit={save}>
            <h2 id="profile" className="section-title">Profile <span className="am">· መገለጫ</span></h2>
            {saved ? <div className="banner info" role="status">Saved.</div> : null}
            {error ? <div className="banner error">{error}</div> : null}
            <label className="field">Display name
              <input className="input" required maxLength={120} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <span className="muted small" style={{ fontWeight: 400 }}>Shown on your books' covers and to family you share with.</span>
            </label>
            <label className="field">Email
              <input className="input" value={me?.email ?? ''} disabled />
              <span className="muted small" style={{ fontWeight: 400 }}>Your email comes from your sign-in account.</span>
            </label>
            <div className="field">Language
              <div className="pills" role="radiogroup" aria-label="Language">
                <button type="button" role="radio" className="pill" aria-checked={language === 'en'} onClick={() => setLanguage('en')}>English</button>
                <button type="button" role="radio" className="pill am" aria-checked={language === 'am'} onClick={() => setLanguage('am')}>አማርኛ</button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy || !me}>{busy ? 'Saving…' : 'Save changes'}</button>
          </form>
        </section>

        <aside className="col-side stack" style={{ gap: 16 }}>
          <section className="card card-pad stack" aria-labelledby="acct">
            <h2 id="acct" className="section-title" style={{ fontSize: 18 }}>Account</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{(me?.displayName ?? '?').charAt(0).toUpperCase()}</span>
              <div className="stack" style={{ gap: 2 }}>
                <strong>{me?.displayName ?? '…'}</strong>
                <span className="small">
                  <span className={`tag${isAdmin ? ' solid-yellow' : ''}`}>{isAdmin ? 'Admin' : 'Traveler'}</span>{' '}
                  <span className="tag green">{me?.status === 'SUSPENDED' ? 'Suspended' : 'Active'}</span>
                </span>
              </div>
            </div>
            {me ? <span className="muted small">Member since {new Date(me.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · <span className="am">{formatEthiopianAm(new Date(me.createdAt))}</span></span> : null}
            {isAdmin ? <Link to="/admin/users" className="btn"><Icon name="users" size={18} />Manage users</Link> : null}
          </section>

          <UploadSettingsCard />
          <InstallAppCard />

          <section className="card card-pad stack" aria-labelledby="sec">
            <h2 id="sec" className="section-title" style={{ fontSize: 18 }}>Sign-in &amp; security</h2>
            <p className="muted small" style={{ margin: 0 }}>Password, two-step verification and active sessions are managed by your sign-in account.</p>
            {config.demoMode ? <span className="muted small">Not available in demo mode.</span> : (
              <>
                <a className="btn" href={accountUrl} target="_blank" rel="noopener noreferrer"><Icon name="lock" size={18} />Password &amp; security</a>
                <button type="button" className="btn" onClick={logout}>Sign out</button>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
