import { afterEach, describe, expect, it, vi } from 'vitest';
import { isConfigured } from '../lib/telemetry';

afterEach(() => vi.unstubAllEnvs());

const freshTelemetry = async () => {
  vi.resetModules();
  return import('../lib/telemetry');
};

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

  it('utan miljövariabler finns ingen nyckel i koden att skicka, båda mottagarna står av', async () => {
    vi.stubEnv('HONEYCOMB_KEY', '');
    vi.stubEnv('BETTERSTACK_URL', '');
    vi.stubEnv('BETTERSTACK_TOKEN', '');
    const t = await freshTelemetry();
    expect(t.isConfigured(t.HONEYCOMB_URL, t.HONEYCOMB_KEY)).toBe(false);
    expect(t.isConfigured(t.BETTERSTACK_URL, t.BETTERSTACK_TOKEN)).toBe(false);
  });

  it('nycklarna och Better Stack-adressen läses från miljön', async () => {
    vi.stubEnv('HONEYCOMB_KEY', 'hcaik_ur_miljon');
    vi.stubEnv('BETTERSTACK_URL', 'https://s1.betterstackdata.com/v1/traces');
    vi.stubEnv('BETTERSTACK_TOKEN', 'token_ur_miljon');
    const t = await freshTelemetry();
    expect(t.HONEYCOMB_KEY).toBe('hcaik_ur_miljon');
    expect(t.isConfigured(t.BETTERSTACK_URL, t.BETTERSTACK_TOKEN)).toBe(true);
  });
});
