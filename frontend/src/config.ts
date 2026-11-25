const env = import.meta.env;

export const config = {
  demoMode: env.VITE_DEMO_MODE !== 'false',
  /** Show "Continue with Google" (needs the Google identity provider configured in Keycloak). */
  googleSignIn: env.VITE_GOOGLE_SIGNIN === 'true',
  /** Shown on the privacy policy and terms for data requests. */
  contactEmail: (env.VITE_CONTACT_EMAIL as string | undefined) ?? '',
  /** Who runs this Teguwaz server, for the legal pages. */
  operatorName: (env.VITE_OPERATOR_NAME as string | undefined) ?? 'the Teguwaz team',
  apiBase: (env.VITE_API_BASE as string | undefined) ?? '',
  keycloak: {
    url: (env.VITE_KEYCLOAK_URL as string | undefined) ?? 'http://localhost:8180',
    realm: (env.VITE_KEYCLOAK_REALM as string | undefined) ?? 'teguwaz',
    clientId: (env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? 'teguwaz-web',
  },
};
