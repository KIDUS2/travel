import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useMe } from '../auth/MeProvider';
import { config } from '../config';
import { useBi, useLang } from '../lib/i18n';
import { ConnectionBanner } from '../offline/OfflineUi';
import { startOutbox, useOutbox } from '../offline/outbox';
import { Icon } from './Icon';
import { TeguwazLogo } from './TeguwazLogo';

const NAV = [
  { to: '/', icon: 'home', en: 'Home', am: 'መነሻ' },
  { to: '/dashboard', icon: 'chart', en: 'Dashboard', am: 'ዳሽቦርድ' },
  { to: '/memories', icon: 'photo', en: 'Memories', am: 'ትዝታዎች' },
  { to: '/books', icon: 'book', en: 'Books', am: 'መጽሐፍት' },
  { to: '/coverage', icon: 'map', en: 'Coverage map', am: 'የጉዞ ካርታ' },
  { to: '/creator', icon: 'eye', en: 'Creator studio', am: 'የይዘት ስቱዲዮ' },
  { to: '/alerts', icon: 'bell', en: 'Policy alerts', am: 'ማሳሰቢያዎች', badge: 2 },
];

export function Layout() {
  const { name: authName, logout: signOut, offline } = useAuth();
  const outbox = useOutbox();
  useEffect(() => { startOutbox(); }, []);
  const logout = () => {
    const n = outbox.items.length;
    if (n && !window.confirm(`${n} memor${n === 1 ? 'y has' : 'ies have'} not uploaded yet. Signing out removes ${n === 1 ? 'it' : 'them'} from this phone. Sign out anyway?`)) return;
    signOut();
  };
  const { me, isAdmin } = useMe();
  const name = me?.displayName || authName;
  const nav = isAdmin ? [...NAV, { to: '/admin/users', icon: 'users', en: 'Users', am: 'ተጠቃሚዎች' }] : NAV;
  const { lang, setLang } = useLang();
  const bi = useBi();

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="flagline" />
        <div className="sidebar-inner">
          <NavLink to="/" className="brand" aria-label="Teguwaz home">
            <TeguwazLogo size={44} />
          </NavLink>
          <div className="tibeb" style={{ margin: '0 8px 18px', borderRadius: 3 }} />
          {nav.map((item) => {
            const label = bi(item.en, item.am);
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Icon name={item.icon} />
                <span className="nav-label">
                  <span className={`primary${label.primaryIsAm ? ' am' : ''}`}>{label.primary}</span>
                  <span className={`secondary${label.primaryIsAm ? '' : ' am'}`}>{label.secondary}</span>
                </span>
                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
              </NavLink>
            );
          })}
          <div className="sidebar-foot">
            <div className="lang-toggle" role="group" aria-label="Language">
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button type="button" className="am" aria-pressed={lang === 'am'} onClick={() => setLang('am')}>አማርኛ</button>
            </div>
            <div className="user-chip">
              <NavLink to="/account" className="avatar" aria-label="My account" style={{ textDecoration: 'none' }}>{name.charAt(0).toUpperCase()}</NavLink>
              <span style={{ display: 'flex', flexDirection: 'column', fontSize: 14, minWidth: 0, flex: 1 }}>
                <NavLink to="/account" style={{ color: '#fff', fontWeight: 600, textDecoration: 'none' }}>{name}</NavLink>
                {offline ? (
                  <span style={{ color: 'var(--on-dark-faint)', fontSize: 13 }}>Offline</span>
                ) : config.demoMode ? (
                  <span style={{ color: 'var(--on-dark-faint)', fontSize: 13 }}>Demo mode</span>
                ) : (
                  <button type="button" onClick={logout}
                    style={{ background: 'none', border: 0, padding: 0, color: 'var(--on-dark-faint)', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>
                    Sign out
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>
      </nav>
      <main className="main">
        <ConnectionBanner />
        <Outlet />
      </main>
    </div>
  );
}
