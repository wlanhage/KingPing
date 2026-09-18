/**
 * Vart spåren skickas. Två mottagare: Honeycomb för att gräva i enskilda
 * requests, Better Stack för att larma och korrelera mot loggarna.
 *
 * Nycklarna läses från miljön, som alla andra hemligheter. Saknas de står
 * platshållarna kvar och mottagaren hoppas över.
 */

// Honeycomb: ingest-nyckel från Environment settings.
export const HONEYCOMB_URL = 'https://api.honeycomb.io/v1/traces';
export const HONEYCOMB_KEY = process.env.HONEYCOMB_KEY || 'PASTE_HONEYCOMB_INGEST_KEY';

// Better Stack: source token + den per-source-host som visas under
// "Connect OpenTelemetry" för telemetrikällan.
export const BETTERSTACK_URL = process.env.BETTERSTACK_URL || 'https://PASTE_SOURCE_ID.betterstackdata.com/v1/traces';
export const BETTERSTACK_TOKEN = process.env.BETTERSTACK_TOKEN || 'PASTE_BETTERSTACK_SOURCE_TOKEN';

/**
 * En mottagare som fortfarande har platshållare kvar hoppas över, annars
 * skulle varje batch i dev bli ett 401-brus mot en adress som inte finns.
 */
export function isConfigured(...values: string[]): boolean {
  return values.every((value) => !value.includes('PASTE_'));
}
