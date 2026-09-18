import Link from 'next/link';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { canWrite, COOKIE_NAME } from '@/lib/security/realm';

/** Visar det som ändrar riket för den som har låst upp, annars en länk till upplåsningen. */
export async function UnlockGate({ next, label, children }: { next: string; label: string; children: ReactNode }) {
  if (await canWrite((await cookies()).get(COOKIE_NAME)?.value)) return children;
  return <Link href={`/unlock?next=${encodeURIComponent(next)}`} className='btn-ghost'>🔒 {label}</Link>;
}
