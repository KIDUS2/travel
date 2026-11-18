const env = import.meta.env;

export const config = {
  demoMode: env.VITE_DEMO_MODE !== 'false',
  apiBase: (env.VITE_API_BASE as string | undefined) ?? '',
  keycloak: {
    url: (env.VITE_KEYCLOAK_URL as string | undefined) ?? 'http://localhost:8180',
    realm: (env.VITE_KEYCLOAK_REALM as string | undefined) ?? 'teguwaz',
    clientId: (env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? 'teguwaz-web',
  },
};
