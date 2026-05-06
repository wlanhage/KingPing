import Link from 'next/link';
const nav=[['Dashboard','/'],['Leaderboard','/leaderboard'],['History','/history'],['Players','/players']];
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='sv'><body className='bg-zinc-950 text-zinc-100 p-8'><nav className='mb-8 flex gap-4 text-sm text-zinc-300'>{nav.map(([l,h])=><Link key={h} href={h} className='hover:text-white'>{l}</Link>)}</nav>{children}</body></html>}
