/**
 * Vart spåren skickas. Två mottagare: Honeycomb för att gräva i enskilda
 * requests, Better Stack för att larma och korrelera mot loggarna.
 *
 * Nycklarna ligger incheckade med flit (Axels beslut). OBS: repot är publikt,
 * så båda är att betrakta som röjda — de ska roteras i Honeycomb respektive
 * Better Stack. Vid rotation: flytta hellre hit-värdena till process.env än att
 * checka in nya, annars är vi tillbaka på samma ruta.
 */

// Honeycomb: ingest-nyckel från Environment settings.
export const HONEYCOMB_URL = 'https://api.honeycomb.io/v1/traces';
export const HONEYCOMB_KEY = 'hcaik_01m2a9wd56d2h7srwnvsd7s07fn4gww74zxmdkwcjb1rprs9w5a23bj9tz';

// Better Stack: source token + den per-source-host som visas under
// "Connect OpenTelemetry" för telemetrikällan.
export const BETTERSTACK_URL = 'https://s2754741.us-west-2a.betterstackdata.com/v1/traces';
export const BETTERSTACK_TOKEN = 'ju9MwWfFL2iur4BYurgovptx';

/**
 * En mottagare som fortfarande har platshållare kvar hoppas över, annars
 * skulle varje batch i dev bli ett 401-brus mot en adress som inte finns.
 */
export function isConfigured(...values: string[]): boolean {
  return values.every((value) => !value.includes('PASTE_'));
}
