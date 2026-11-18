import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { getKeycloak } from './keycloak';

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
    kc.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false })
      .then(() => {
        const parsed = kc.tokenParsed as { name?: string; preferred_username?: string } | undefined;
        setState({
          ready: true,
          name: parsed?.name || parsed?.preferred_username || 'Traveler',
          logout: () => kc.logout({ redirectUri: window.location.origin }),
        });
      })
      .catch(() => setError('Could not reach the sign-in server. Check that Keycloak is running.'));
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
