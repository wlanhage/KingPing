import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSignedSlackForm, verifySlackSignature } from '../lib/security/slack-signature';
import { POST as commands } from '../app/api/slack/commands/route';
import { POST as interactivity } from '../app/api/slack/interactivity/route';

afterEach(() => vi.unstubAllEnvs());

const secret = 's3cret';
const sign = (body: string, ts: string, key = secret) => `v0=${createHmac('sha256', key).update(`v0:${ts}:${body}`).digest('hex')}`;
const now = () => String(Math.floor(Date.now() / 1000));
const slackRequest = (path: string, body: string, headers: Record<string, string>) => new Request(`http://riket.test${path}`, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers } });

describe('Slack-signaturen', () => {
  const body = 'text=king&user_id=U1', ts = '1700000000';
  it('äkta anrop går igenom', () => expect(verifySlackSignature({ signingSecret: secret, timestamp: ts, signature: sign(body, ts), rawBody: body, nowS: 1700000010 })).toBe(true));
  it('ändrad kropp, fel hemlighet, gammal tidsstämpel eller inga headers avvisas', () => {
    expect(verifySlackSignature({ signingSecret: secret, timestamp: ts, signature: sign(body, ts), rawBody: 'text=leaderboard', nowS: 1700000010 })).toBe(false);
    expect(verifySlackSignature({ signingSecret: 'annan', timestamp: ts, signature: sign(body, ts), rawBody: body, nowS: 1700000010 })).toBe(false);
    expect(verifySlackSignature({ signingSecret: secret, timestamp: ts, signature: sign(body, ts), rawBody: body, nowS: 1700000000 + 3600 })).toBe(false);
    expect(verifySlackSignature({ signingSecret: secret, timestamp: null, signature: null, rawBody: body })).toBe(false);
  });
  it('utan SLACK_SIGNING_SECRET släpps inget igenom, inte ens ett korrekt signerat anrop', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', '');
    const t = now();
    expect(await readSignedSlackForm(slackRequest('/api/slack/commands', body, { 'x-slack-request-timestamp': t, 'x-slack-signature': sign(body, t) }))).toBeNull();
  });
});

describe('Slack-routerna', () => {
  it('ett osignerat anrop som låtsas vara Slack får 401 i båda routerna', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', secret);
    expect((await commands(slackRequest('/api/slack/commands', 'text=king', {}))).status).toBe(401);
    expect((await interactivity(slackRequest('/api/slack/interactivity', 'payload=%7B%7D', {}))).status).toBe(401);
  });
  it('ett signerat anrop från Slack besvaras som förut', async () => {
    vi.stubEnv('SLACK_SIGNING_SECRET', secret);
    const t = now(), body = 'text=hjalp';
    const res = await commands(slackRequest('/api/slack/commands', body, { 'x-slack-request-timestamp': t, 'x-slack-signature': sign(body, t) }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('/pingis king');
  });
});
