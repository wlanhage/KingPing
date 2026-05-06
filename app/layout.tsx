import Link from 'next/link';
import './globals.css';

const nav = [
  ['Dashboard', '/'],
  ['Leaderboard', '/leaderboard'],
  ['History', '/history'],
  ['Players', '/players'],
  ['Settings', '/settings'],
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='sv'>
      <body>
        <div className='app-shell'>
          <nav className='top-nav'>
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className='nav-pill'>
                {label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
