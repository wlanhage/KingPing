import { describe, expect, it } from 'vitest';
import { isConfigured } from '../lib/telemetry';

describe('telemetrins mottagare', () => {
  it('en ifylld nyckel och adress räknas som konfigurerad', () => {
    expect(isConfigured('https://api.honeycomb.io/v1/traces', 'hcaik_0123456789')).toBe(true);
  });

  it('kvarglömd platshållare stoppar export — annars 401-brus mot fel adress', () => {
    expect(isConfigured('https://api.honeycomb.io/v1/traces', 'PASTE_HONEYCOMB_INGEST_KEY')).toBe(false);
  });

  it('platshållare i adressen räcker för att stoppa, även med riktig nyckel', () => {
    expect(isConfigured('https://PASTE_SOURCE_ID.betterstackdata.com/v1/traces', 'riktig_token')).toBe(false);
  });
});
