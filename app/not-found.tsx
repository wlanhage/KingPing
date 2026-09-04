import Link from 'next/link';
import { getActiveTheme } from '@/lib/theme/server';

export default async function NotFound() {
  const { theme } = await getActiveTheme();
  return (
    <main className='not-found'>
      <p className='dash-eyebrow'>404</p>
      <h1 className='title-xl'>{theme.notFound.title}</h1>
      <p className='subtitle'>{theme.notFound.subtitle}</p>
      <Link href='/' className='crown-btn'>{theme.notFound.back}</Link>
    </main>
  );
}
