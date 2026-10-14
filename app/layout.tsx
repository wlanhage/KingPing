import type { Metadata } from 'next';
import Link from 'next/link';
import { Cinzel, Cinzel_Decorative, EB_Garamond } from 'next/font/google';
import { RealmLogo } from '@/components/RealmLogo';
import { FakeAd } from '@/components/FakeAd';
import { TopNav } from '@/components/TopNav';
import { KonamiBalls } from '@/components/KonamiBalls';
import { Starfield } from '@/components/Starfield';
import { StarfieldShips } from '@/components/StarfieldShips';
import { getActiveTheme } from '@/lib/theme/server';
import { themeCssVars, type PageKey } from '@/lib/theme';
import { siteUrl } from '@/lib/site-url';
import { prisma } from '@/lib/prisma';
import { resolveSeason, winOccurredAtFilter } from '@/lib/domain/season';

const TYRANNY_STREAK = 5;
import './globals.css';
import './cursor.css';

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-display' });
const titleFont = Cinzel_Decorative({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-title' });
const body = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export async function generateMetadata(): Promise<Metadata> {
  const { theme } = await getActiveTheme();
  return {
    // Behövs för att delningsbilder ska få absoluta URL:er. Vercel sätter produktionsdomänen i env.
    metadataBase: new URL(siteUrl()),
    title: { default: theme.appName, template: `%s · ${theme.appName}` },
    description: theme.tagline,
    applicationName: theme.appName,
    icons: { icon: `/icons/${theme.key}.svg` },
  };
}

const navPrimary: [PageKey, string][] = [
  ['home', '/'],
  ['leaderboard', '/leaderboard'],
  ['history', '/history'],
];
const navMore: [PageKey, string][] = [
  ['players', '/players'],
  ['badges', '/badges'],
  ['archive', '/seasons'],
  ['alltime', '/alltime'],
  ['settings', '/settings'],
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getActiveTheme();
  // Sitter en tyrann på tronen (fem raka eller fler) får galaxen röd ljussabel som muspekare.
  const season = await resolveSeason();
  const latest = await prisma.winEvent.findFirst({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: { occurredAt: 'desc' }, select: { streakCount: true } });
  const sith = (latest?.streakCount ?? 0) >= TYRANNY_STREAK;

  return (
    <html
      lang='sv'
      className={`${display.variable} ${titleFont.variable} ${body.variable}`}
      data-theme={theme.key}
      data-sith={sith ? '1' : undefined}
      style={themeCssVars(theme.colors) as React.CSSProperties}
    >
      <body>
        {theme.backdrop === 'starfield' && <Starfield />}
        {theme.backdrop === 'starfield' && <StarfieldShips />}
        <div className='app-shell'>
          <header className='realm-banner'>
            <Link href='/' className='realm-crest'>
              <span className='realm-crest-mark' aria-hidden><RealmLogo themeKey={theme.key} /></span>
              <span className='realm-crest-name'>{theme.appName}</span>
            </Link>
            <TopNav
              links={[...navPrimary.slice(0, 2).map(([key, href]) => ({ href, label: theme.nav[key] })), { href: '/duell', label: '1 mot 1' }, ...navPrimary.slice(2).map(([key, href]) => ({ href, label: theme.nav[key] }))]}
              groups={[
                { label: 'Mer', links: navMore.map(([key, href]) => ({ href, label: theme.nav[key] })) },
                { label: 'Lab', links: [{ href: '/elo', label: 'Elo Lab' }, { href: '/lab', label: 'Season Lab' }, { href: '/lab/experimental', label: 'Experimental Lab' }] },
              ]}
            />
          </header>
          {children}
        </div>
        <FakeAd />
        <KonamiBalls />
      </body>
    </html>
  );
}
