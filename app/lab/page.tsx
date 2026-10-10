import type { Metadata } from 'next';
import { SeasonLab } from '@/components/lab/SeasonLab';
import { loadLabData } from '@/lib/lab/server';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Season Lab', description: 'Säsongsprognoser, föreslagna placeringar och tidsordnad modellutvärdering mot verkliga utfall.' };

export default async function LabPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const [{ season: slug }, data] = await Promise.all([searchParams, loadLabData()]);
  const selected = data.seasons.find((s) => s.slug === slug) ?? [...data.seasons].reverse().find((s) => s.end === null) ?? data.seasons.at(-1)!;
  return <SeasonLab data={data} initialSeason={selected.id} now={Date.now()} />;
}
