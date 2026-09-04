import type { Metadata } from 'next';
import Link from 'next/link';
import { Cinzel, Cinzel_Decorative, EB_Garamond } from 'next/font/google';
import { RealmLogo } from '@/components/RealmLogo';
import { getActiveTheme } from '@/lib/theme/server';
import { themeCssVars, type PageKey } from '@/lib/theme';
import './globals.css';
import './cursor.css';

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-display' });
const titleFont = Cinzel_Decorative({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-title' });
const body = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export async function generateMetadata(): Promise<Metadata> {
  const { theme } = await getActiveTheme();
  return {
    title: { default: theme.appName, template: `%s · ${theme.appName}` },
    description: theme.tagline,
    applicationName: theme.appName,
    icons: { icon: `/icons/${theme.key}.svg` },
  };
}

const navOrder: [PageKey, string][] = [
  ['home', '/'],
  ['leaderboard', '/leaderboard'],
  ['history', '/history'],
  ['players', '/players'],
  ['badges', '/badges'],
  ['archive', '/seasons'],
  ['settings', '/settings'],
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getActiveTheme();

  return (
    <html
      lang='sv'
      className={`${display.variable} ${titleFont.variable} ${body.variable}`}
      data-theme={theme.key}
      style={themeCssVars(theme.colors) as React.CSSProperties}
    >
      <body>
        <div className='app-shell'>
          <header className='realm-banner'>
            <Link href='/' className='realm-crest'>
              <span className='realm-crest-mark' aria-hidden><RealmLogo themeKey={theme.key} /></span>
              <span className='realm-crest-name'>{theme.appName}</span>
            </Link>
            <nav className='top-nav'>
              {navOrder.map(([key, href]) => (
                <Link key={href} href={href} className='nav-pill'>
                  {theme.nav[key]}
                </Link>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
