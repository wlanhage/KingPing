import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canWrite, COOKIE_NAME, realmKey, safeNextPath } from '@/lib/security/realm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lås upp' };

/** Hit kommer den som vill ändra riket utan kaka. Formuläret postar till /api/unlock. */
export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string; fel?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await canWrite((await cookies()).get(COOKIE_NAME)?.value)) redirect(next);

  return (
    <main className='page-stack'>
      <section className='card unlock-card'>
        <h1 className='title-xl'>Lås upp</h1>
        {realmKey() ? (
          <>
            <p className='subtitle'>Alla kan titta, men lösenordet krävs för att registrera rundor, lägga till spelare och sätta AFK. Fråga någon som redan spelar.</p>
            <form method='post' action='/api/unlock' className='crown-form'>
              <input type='hidden' name='next' value={next} />
              <label className='crown-field'>
                <span className='crown-label'>Lösenord</span>
                <input className='crown-input' type='password' name='key' autoComplete='current-password' autoFocus required />
              </label>
              {sp.fel && <p className='crown-error'>Fel lösenord. Försök igen.</p>}
              <button className='crown-btn'>Lås upp</button>
            </form>
          </>
        ) : (
          <p className='crown-error'>REALM_KEY är inte satt på servern, så ingen kan låsa upp. Sätt den i miljövariablerna och deploya om.</p>
        )}
      </section>
    </main>
  );
}
