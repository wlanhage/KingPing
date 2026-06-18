import Link from 'next/link';
import { Cinzel, Cinzel_Decorative, EB_Garamond } from 'next/font/google';
import './globals.css';

const display = Cinzel({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-display' });
const titleFont = Cinzel_Decorative({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-title' });
const body = EB_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

const nav = [
  ['Tronsalen', '/'],
  ['Rikets främsta', '/leaderboard'],
  ['Krönikan', '/history'],
  ['Riddare', '/players'],
  ['Rådet', '/settings'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='sv' className={`${display.variable} ${titleFont.variable} ${body.variable}`}>
      <body>
        <div className='app-shell'>
          <header className='realm-banner'>
            <Link href='/' className='realm-crest'>
              <span className='realm-crest-mark' aria-hidden>⚜</span>
              <span className='realm-crest-name'>Rundpingisriket</span>
            </Link>
            <nav className='top-nav'>
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className='nav-pill'>
                  {label}
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
