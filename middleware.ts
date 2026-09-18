import { NextResponse, type NextRequest } from 'next/server';
import { canWrite, COOKIE_NAME, HEADER_NAME } from '@/lib/security/realm';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Alla skrivande API-anrop kräver rikets lösen, även endpoints som läggs till senare. Läsningar är öppna.
 * Upplåsningen måste gå att nå utan lösen. Slack skickar ingen kaka: en Slack-route som ska skriva
 * måste verifiera Slacks signatur själv.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = READ_METHODS.has(req.method) || pathname === '/api/unlock' || pathname.startsWith('/api/slack/');
  if (open || (await canWrite(req.cookies.get(COOKIE_NAME)?.value, req.headers.get(HEADER_NAME)))) return NextResponse.next();
  return NextResponse.json({ error: 'Riket är låst. Lås upp på /unlock, eller skicka lösenordet i x-realm-key.' }, { status: 401 });
}

// Node, inte edge: i edge körs även instrumentation.ts, vars pg-instrumentering kraschar där och fäller alla API-anrop.
export const config = { runtime: 'nodejs', matcher: '/api/:path*' };
