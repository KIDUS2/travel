import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/api';
import { ApiError } from '../api/client';
import type { Me } from '../api/types';
import { TeguwazLogo } from '../components/TeguwazLogo';
import { useAuth } from './AuthProvider';

interface MeState {
  me: Me | null;
  isAdmin: boolean;
  setMe: (me: Me) => void;
  reload: () => Promise<void>;
}

const MeContext = createContext<MeState>({ me: null, isAdmin: false, setMe: () => {}, reload: async () => {} });

/** Loads the signed-in user's Teguwaz profile (name, language, role). Suspended accounts see a notice. */
export function MeProvider({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [suspended, setSuspended] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setMe(await api.me());
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setSuspended(e.message);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  if (suspended) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--green-900)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 440, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TeguwazLogo light={false} />
          <h1 className="section-title" style={{ fontSize: 22 }}>Account suspended</h1>
          <p className="muted" style={{ margin: 0 }}>{suspended}</p>
          <button type="button" className="btn" onClick={logout}>Sign out</button>
        </div>
      </div>
    );
  }

  return <MeContext.Provider value={{ me, isAdmin: me?.role === 'ADMIN', setMe, reload }}>{children}</MeContext.Provider>;
}

export function useMe() {
  return useContext(MeContext);
}
