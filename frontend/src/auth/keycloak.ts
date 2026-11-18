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
