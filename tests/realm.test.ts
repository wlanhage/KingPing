import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { middleware } from '../middleware';
import { canWrite, realmToken, safeNextPath } from '../lib/security/realm';

afterEach(() => vi.unstubAllEnvs());

const call = (method: string, path: string, headers: Record<string, string> = {}) => middleware(new NextRequest(`http://riket.test${path}`, { method, headers }));
const passedThrough = (res: Response) => res.headers.get('x-middleware-next') === '1';

describe('rikets lösen', () => {
  it('rätt kaka eller rätt header får skriva, inget annat', async () => {
    vi.stubEnv('REALM_KEY', 'hemligt');
    const token = await realmToken('hemligt');
    expect(await canWrite(token, null)).toBe(true);
    expect(await canWrite(null, 'hemligt')).toBe(true);
    expect(await canWrite('hemligt', null)).toBe(false);
    expect(await canWrite(null, token)).toBe(false);
    expect(await canWrite(null, null)).toBe(false);
  });

  it('lösenord med å, ä och ö fungerar i headern, oavsett om klienten skickar UTF-8 eller latin1', async () => {
    vi.stubEnv('REALM_KEY', 'kungsgården');
    expect(await canWrite(null, Buffer.from('kungsgården', 'utf8').toString('latin1'))).toBe(true);
    expect(await canWrite(null, 'kungsgården')).toBe(true);
  });

  it('ett bytt lösenord gör gamla kakor ogiltiga', async () => {
    vi.stubEnv('REALM_KEY', 'nytt');
    expect(await canWrite(await realmToken('gammalt'), null)).toBe(false);
  });

  it('utan REALM_KEY är skrivningar öppna lokalt men stängda i produktion', async () => {
    vi.stubEnv('REALM_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(await canWrite(null, null)).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(await canWrite(null, null)).toBe(false);
  });

  it('bara interna mål efter upplåsningen', () => {
    expect(safeNextPath('/players/abc')).toBe('/players/abc');
    expect(safeNextPath('//ond.sajt')).toBe('/');
    expect(safeNextPath('https://ond.sajt')).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
  });
});

describe('middleware', () => {
  it('de skrivande API-anropen stoppas utan lösen, läsningar går igenom', async () => {
    vi.stubEnv('REALM_KEY', 'hemligt');
    for (const [method, path] of [['POST', '/api/wins'], ['POST', '/api/players'], ['PATCH', '/api/players/p1']]) {
      expect((await call(method, path)).status, `${method} ${path}`).toBe(401);
    }
    expect(passedThrough(await call('GET', '/api/leaderboard'))).toBe(true);
  });

  it('med rätt header eller kaka går skrivningen igenom', async () => {
    vi.stubEnv('REALM_KEY', 'hemligt');
    expect(passedThrough(await call('POST', '/api/wins', { 'x-realm-key': 'hemligt' }))).toBe(true);
    expect(passedThrough(await call('POST', '/api/wins', { cookie: `realm-key=${await realmToken('hemligt')}` }))).toBe(true);
  });

  it('upplåsningen och Slack går att nå utan lösen', async () => {
    vi.stubEnv('REALM_KEY', 'hemligt');
    expect(passedThrough(await call('POST', '/api/unlock'))).toBe(true);
    expect(passedThrough(await call('POST', '/api/slack/commands'))).toBe(true);
  });
});
