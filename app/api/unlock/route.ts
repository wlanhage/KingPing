import { NextResponse } from 'next/server';
import { COOKIE_NAME, realmKey, realmToken, safeEqual, safeNextPath } from '@/lib/security/realm';

const ONE_YEAR_S = 60 * 60 * 24 * 365;

/** Upplåsningsformuläret postar hit. Rätt lösen ger kakan och skickar tillbaka, fel lösen bromsas. */
export async function POST(req: Request) {
  const form = await req.formData();
  const key = realmKey();
  const next = safeNextPath(String(form.get('next') ?? ''));
  const unlockPage = new URL('/unlock', req.url);
  unlockPage.searchParams.set('next', next);
  if (!key) return NextResponse.redirect(unlockPage, 303);

  if (!safeEqual(String(form.get('key') ?? '').trim(), key)) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    unlockPage.searchParams.set('fel', '1');
    return NextResponse.redirect(unlockPage, 303);
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  // SameSite=Lax: en annan sajt kan inte få med kakan i ett skrivande anrop.
  res.cookies.set(COOKIE_NAME, await realmToken(key), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: ONE_YEAR_S });
  return res;
}
