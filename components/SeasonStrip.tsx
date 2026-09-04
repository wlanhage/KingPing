import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getActiveSeason, winOccurredAtFilter } from '@/lib/domain/season';
import { getTheme } from '@/lib/theme';
import { RealmLogo } from '@/components/RealmLogo';

const DAY_MS = 86_400_000;

/** Tunn remsa högst upp i tronsalen: vilken säsong som pågår, hur länge, och hur många vinster. */
export async function SeasonStrip() {
  const season = await getActiveSeason();
  if (!season) return null;
  const theme = getTheme(season.theme);
  const wins = await prisma.winEvent.count({ where: { occurredAt: winOccurredAtFilter(season) } });
  const day = Math.max(1, Math.floor((Date.now() - season.startedAt.getTime()) / DAY_MS) + 1);

  return (
    <Link href='/seasons' className='season-strip'>
      <span className='season-strip-mark' aria-hidden><RealmLogo size={18} themeKey={theme.key} /></span>
      <strong>{season.name}</strong>
      <span className='season-strip-sep' aria-hidden>·</span>
      <span>Dag {day}</span>
      <span className='season-strip-sep' aria-hidden>·</span>
      <span>{wins} {wins === 1 ? 'vinst' : 'vinster'}</span>
      <span className='season-strip-cta'>{theme.nav.archive} →</span>
    </Link>
  );
}
