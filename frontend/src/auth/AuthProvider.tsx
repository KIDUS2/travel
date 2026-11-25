import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { config } from '../config';
import { Welcome } from '../pages/Welcome';
import { getKeycloak, initKeycloak } from './keycloak';

interface AuthState {
  ready: boolean;
  name: string;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({ ready: false, name: '', logout: () => {} });

/** Paths anyone can open without signing in (welcome, privacy policy, terms, shared-trip invites). */
export const PUBLIC_PATHS = ['/welcome', '/privacy', '/terms'];

export function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export function AuthProvider({ children, publicContent }: { children: ReactNode; publicContent?: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ready: config.demoMode, name: 'Meron T.', logout: () => {} });
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.demoMode) return;
    const kc = getKeycloak();
    initKeycloak()
      .then((authenticated) => {
        if (!authenticated) {
          setSignedOut(true);
          return;
        }
        const parsed = kc.tokenParsed as { name?: string; preferred_username?: string; email?: string } | undefined;
        setState({
          ready: true,
          name: parsed?.name || parsed?.preferred_username || parsed?.email || 'Traveler',
          logout: () => kc.logout({ redirectUri: `${window.location.origin}/welcome` }),
        });
      })
      .catch((e: unknown) => {
        console.error('Keycloak init failed', e);
        const detail = e instanceof Error ? e.message : (e as { error?: string } | undefined)?.error;
        setError(`Could not sign you in${detail ? ` (${detail})` : ''}. Check that Keycloak is running at ${config.keycloak.url} with the "${config.keycloak.realm}" realm.`);
      });
  }, []);

  // Public pages render for everyone, signed in or not.
  if (publicContent && isPublicPath(window.location.pathname) && !(window.location.pathname === '/welcome' && state.ready && !config.demoMode)) {
    return <AuthContext.Provider value={state}>{publicContent}</AuthContext.Provider>;
  }
  if (error) {
    return <div className="main"><div className="banner error">{error}</div></div>;
  }
  if (signedOut) {
    return <Welcome />;
  }
  if (!state.ready) {
    return <div className="main"><p className="muted">Opening Teguwaz…</p></div>;
  }
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
