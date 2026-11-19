import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { getKeycloak, initKeycloak } from './keycloak';

interface AuthState {
  ready: boolean;
  name: string;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ ready: false, name: '', logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ready: config.demoMode, name: 'Meron T.', logout: () => {} });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.demoMode) return;
    const kc = getKeycloak();
    initKeycloak()
      .then(() => {
        const parsed = kc.tokenParsed as { name?: string; preferred_username?: string } | undefined;
        setState({
          ready: true,
          name: parsed?.name || parsed?.preferred_username || 'Traveler',
          logout: () => kc.logout({ redirectUri: window.location.origin }),
        });
      })
      .catch((e: unknown) => {
        console.error('Keycloak init failed', e);
        const detail = e instanceof Error ? e.message : (e as { error?: string } | undefined)?.error;
        setError(`Could not sign you in${detail ? ` (${detail})` : ''}. Check that Keycloak is running at ${config.keycloak.url} with the "${config.keycloak.realm}" realm.`);
      });
  }, []);

  if (error) {
    return <div className="main"><div className="banner error">{error}</div></div>;
  }
  if (!state.ready) {
    return <div className="main"><p className="muted">Signing you in…</p></div>;
  }
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
