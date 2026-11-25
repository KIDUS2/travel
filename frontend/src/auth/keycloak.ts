import Keycloak from 'keycloak-js';
import { config } from '../config';

let instance: Keycloak | null = null;

export function getKeycloak(): Keycloak {
  if (!instance) {
    instance = new Keycloak({
      url: config.keycloak.url,
      realm: config.keycloak.realm,
      clientId: config.keycloak.clientId,
    });
  }
  return instance;
}

let initPromise: Promise<boolean> | null = null;

/**
 * Starts Keycloak once and checks for an existing session without forcing a login,
 * so visitors see the welcome page first. React StrictMode runs effects twice in development,
 * and keycloak-js refuses a second init(), so every caller shares one promise.
 */
export function initKeycloak(): Promise<boolean> {
  if (!initPromise) {
    initPromise = getKeycloak().init({ onLoad: 'check-sso', pkceMethod: 'S256', checkLoginIframe: false });
  }
  return initPromise;
}

/** Returns a fresh access token, refreshing it if it expires within 30 s. */
export async function getAccessToken(): Promise<string | null> {
  if (config.demoMode) return null;
  const kc = getKeycloak();
  if (!kc.authenticated) return null;
  try {
    await kc.updateToken(30);
  } catch {
    await kc.login();
    return null;
  }
  return kc.token ?? null;
}

export const signIn = {
  google: () => getKeycloak().login({ idpHint: 'google' }),
  email: () => getKeycloak().login(),
  register: () => getKeycloak().register(),
};
