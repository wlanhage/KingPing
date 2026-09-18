/**
 * Rikets lösen: ett delat lösenord som krävs för att ändra riket (registrera rundor, lägga till
 * spelare, sätta AFK). Att titta kräver inget. Webbläsaren får en kaka med en HMAC av lösenordet,
 * så byts lösenordet loggas alla ut. Maskinklienter som MCP-servern skickar lösenordet i en header.
 */

export const COOKIE_NAME = 'realm-key';
export const HEADER_NAME = 'x-realm-key';

export function realmKey(): string | null {
  const key = process.env.REALM_KEY?.trim();
  return key ? key : null;
}

export async function realmToken(key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode('rundpingisriket'));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Jämför på samma tid oavsett var strängarna skiljer sig, så att svarstiden inte avslöjar lösenordet. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Får besökaren ändra riket? Utan REALM_KEY är svaret ja lokalt men nej i produktion:
 * ett bortglömt lösenord i Vercel ska stänga skrivningarna, inte lämna dem öppna.
 */
export async function canWrite(cookie?: string | null, header?: string | null): Promise<boolean> {
  const key = realmKey();
  if (!key) return process.env.NODE_ENV !== 'production';
  if (header && (safeEqual(header, key) || safeEqual(utf8FromHeader(header), key))) return true;
  return !!cookie && safeEqual(cookie, await realmToken(key));
}

// Node läser headerns byte som latin1. Klienter som curl skickar lösenordet som UTF-8,
// så utan omkodningen släpps ett lösenord med å, ä eller ö aldrig in via headern.
const utf8FromHeader = (header: string) => Buffer.from(header, 'latin1').toString('utf8');

/** Bara interna sökvägar får användas som mål efter upplåsningen, inte //annan.sajt. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}
