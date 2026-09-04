/** Sajtens absoluta bas-URL. Vercel sätter produktionsdomänen i env; lokalt är det dev-servern. */
export function siteUrl(): string {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3030';
}
