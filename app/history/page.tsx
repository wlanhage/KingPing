import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/format';
import { listSeasons, resolveSeason, seasonNumber, toRoman } from '@/lib/domain/season';
import { getTheme } from '@/lib/theme';
import { CrawlChronicle } from '@/components/history/CrawlChronicle';
import { RoundHistory } from '@/components/history/RoundHistory';
import { HISTORY_PAGE_SIZE, historyFilters, historyHref, historyWhere } from '@/lib/domain/history';

export const dynamic = 'force-dynamic';

export default async function History({ searchParams }: { searchParams: Promise<{ season?: string; q?: string; player?: string; page?: string; view?: string }> }) {
  const input = await searchParams;
  const season = await resolveSeason(input.season);
  const theme = getTheme(season.theme);
  const label = season.id === 'implicit' ? season.name : `${theme.seasonWord} ${toRoman(seasonNumber(await listSeasons(), season))} · ${season.name}`;
  const players = await prisma.player.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const filters = historyFilters(input, players);
  const where = historyWhere(season, filters, players);
  const total = await prisma.winEvent.count({ where });
  filters.page = Math.min(filters.page, Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)));
  const events = await prisma.winEvent.findMany({
    where, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    skip: (filters.page - 1) * HISTORY_PAGE_SIZE, take: HISTORY_PAGE_SIZE,
    select: { id: true, occurredAt: true, winnerId: true, standings: true, note: true, announcementText: true, finalWinnerPoints: true, finalRunnerUpPoints: true },
  });
  const names = new Map(players.map((p) => [p.id, p.name]));
  const linkState = { ...filters, season: input.season };
  if (theme.historyStyle === 'crawl' && input.view === 'crawl') return <>
    <Link className='history-readable-link' href={historyHref(linkState)}>← Till resultatlistan</Link>
    <CrawlChronicle eyebrow={label} title={theme.pages.history.title} subtitle={theme.pages.history.subtitle} items={events.map((e) => ({ id: e.id, date: formatDate(e.occurredAt), winner: names.get(e.winnerId) ?? 'Okänd spelare', text: e.announcementText, replayHref: e.standings.length >= 2 ? `/rundor/${e.id}` : undefined }))} />
  </>;
  return <main className='page-stack'>
    <header className='history-header'><p className='performance-eyebrow'>{label}</p><h1 className='title-xl'>{theme.pages.history.title}</h1><p className='subtitle'>Varje runda. Varje rival. Hitta ögonblicket du vill återse.</p>
      {theme.historyStyle === 'crawl' && <Link className='history-cinema-link' href={historyHref({ ...linkState, view: 'crawl' })}>Se som galaktisk krönika ↗</Link>}
    </header>
    {season.endedAt && <p className='season-banner'>Visar <strong>{season.name}</strong> · {formatDate(season.startedAt)} — {formatDate(season.endedAt)}<Link href='/history'>Till pågående säsong →</Link></p>}
    <RoundHistory players={players} events={events.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() }))} filters={filters} seasonSlug={input.season} total={total} pageSize={HISTORY_PAGE_SIZE} />
  </main>;
}
