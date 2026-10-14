import { createHmac, timingSafeEqual } from 'node:crypto';

/** Slack signerar varje anrop; äldre tidsstämplar än så här avvisas så ett avlyssnat anrop inte kan spelas upp igen. */
export const SLACK_REPLAY_WINDOW_S = 60 * 5;

export function verifySlackSignature(args: { signingSecret: string; timestamp: string | null; signature: string | null; rawBody: string; nowS?: number }): boolean {
  const { signingSecret, timestamp, signature, rawBody, nowS = Date.now() / 1000 } = args;
  if (!timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowS - ts) > SLACK_REPLAY_WINDOW_S) return false;
  const expected = Buffer.from(`v0=${createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex')}`);
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Läser och verifierar ett formulär från Slack. Utan SLACK_SIGNING_SECRET släpps inget igenom:
 * hellre ett tyst slash-kommando än en endpoint vem som helst kan anropa.
 */
export async function readSignedSlackForm(req: Request): Promise<URLSearchParams | null> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return null;
  const rawBody = await req.text();
  const ok = verifySlackSignature({ signingSecret, timestamp: req.headers.get('x-slack-request-timestamp'), signature: req.headers.get('x-slack-signature'), rawBody });
  return ok ? new URLSearchParams(rawBody) : null;
}
