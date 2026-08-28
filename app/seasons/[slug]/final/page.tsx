import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildFinaleSummary } from '@/lib/domain/finale';
import { getSeasonBySlug } from '@/lib/domain/season';
import { SeasonFinale } from '@/components/finale/SeasonFinale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const season = await getSeasonBySlug((await params).slug);
  // absolute: hoppar över layoutens '%s · appnamn'-mall, annars stammar titeln när
  // säsongen råkar heta samma som riket.
  return { title: { absolute: season ? `Krönikan · ${season.name}` : 'Krönikan' } };
}

export default async function FinalePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const season = await getSeasonBySlug(slug);
  if (!season) notFound();

  // ?preview=1 låter oss rendera finalen för en pågående säsong under utveckling
  // (fönstret klipps då vid "nu"). Utan flaggan är pågående säsonger låsta.
  if (!season.endedAt && sp.preview !== '1') {
    return (
      <main className='page-stack'>
        <section className='card finale-ongoing'>
          <h1 className='title-xl'>Säsongen pågår ännu</h1>
          <p className='subtitle'>Krönikan för {season.name} skrivs medan ni spelar. Den slås upp när säsongen avslutas.</p>
          <p><Link className='btn' href='/'>Tillbaka till tronsalen</Link></p>
        </section>
      </main>
    );
  }

  const summary = await buildFinaleSummary(season);
  return <SeasonFinale summary={summary} cinema={sp.cinema === '1'} />;
}
