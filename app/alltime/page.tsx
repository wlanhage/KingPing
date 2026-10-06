import Link from 'next/link';
import { getAllTime } from '@/lib/domain/alltime';
import { getActiveTheme } from '@/lib/theme/server';
import { formatDate, formatDuration } from '@/lib/format';
import { ChartTips } from '@/components/alltime/ChartTips';
import { ThroneLanes } from '@/components/alltime/ThroneLanes';
import { RaceChart } from '@/components/alltime/RaceChart';
import { SeasonGrid } from '@/components/alltime/SeasonGrid';
import { FeudGrid, hottestFeud } from '@/components/alltime/FeudGrid';
import { PulseCalendar, PulseClock } from '@/components/alltime/Pulse';
import { RecordBook } from '@/components/alltime/RecordBook';
import { seriesColor } from '@/components/alltime/palette';
import { SortableTable, type SortColumn } from '@/components/leaderboard/SortableTable';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { theme } = await getActiveTheme();
  return { title: theme.pages.alltime.title };
}

const hallColumns: SortColumn[] = [
  { key: 'name', label: 'Spelare' },
  { key: 'throneMs', label: 'Trontid', desc: true },
  { key: 'wins', label: 'Vinster', desc: true },
  { key: 'takeovers', label: 'Kronor snodda', desc: true },
  { key: 'reigns', label: 'Regeringar', desc: true },
  { key: 'longestReignMs', label: 'Längsta regering', desc: true },
  { key: 'longestStreak', label: 'Längsta svit', desc: true },
  { key: 'seasonsWon', label: 'Säsongssegrar', desc: true },
  { key: 'firstWinAt', label: 'Första vinst' },
];

/**
 * Genom tiderna: hela historien, alla säsonger, på en sida. Varje sektion svarar på en fråga —
 * vem satt när, vem leder, vilka rekord, vem ägde vilken säsong, vem jagar vem, när spelas det.
 */
export default async function AllTimePage() {
  const { theme } = await getActiveTheme();
  const data = await getAllTime();
  const { totals, roster } = data;
  const page = theme.pages.alltime;

  if (!totals.crownings) {
    return (
      <main className='page-stack'>
        <section>
          <h1 className='title-xl'>{page.title}</h1>
          <p className='subtitle'>{page.subtitle}</p>
        </section>
        <section className='card'><p className='muted' style={{ margin: 0 }}>Historien är oskriven. Den börjar med den första kröningen.</p></section>
      </main>
    );
  }

  const leader = roster[0];
  const feud = hottestFeud(data);
  const name = Object.fromEntries(roster.map((p) => [p.id, p.name]));
  const seasonMarks = data.seasonGrid.length > 1 ? data.seasonGrid.slice(1).map((s) => ({ at: s.start, label: s.label })) : [];
  const kpis = [
    { label: 'Dagar av historia', value: totals.days },
    { label: 'Kronbyten', value: totals.takeovers },
    { label: 'Har burit kronan', value: `${totals.monarchs} av ${totals.players}` },
    { label: 'Säsonger', value: data.seasonGrid.length },
    { label: 'Rundor med repris', value: totals.rounds },
  ];

  return (
    <ChartTips>
      <main className='page-stack alltime'>
        <section className='alltime-hero'>
          <p className='alltime-eyebrow'>Sedan {formatDate(new Date(data.from))}</p>
          <h1 className='title-xl'>{page.title}</h1>
          <p className='subtitle'>{page.subtitle}</p>
          <div className='alltime-headline'>
            <p className='vz-hero'>{totals.crownings.toLocaleString('sv-SE')}<span>kröningar</span></p>
            <p className='alltime-lede'>
              På {totals.days} dagar har kronan bytt huvud {totals.takeovers} gånger. <strong>{leader.name}</strong> har suttit längst på tronen — <span className='vz-nowrap'>{formatDuration(leader.throneMs)}</span> sammanlagt
              {feud && <>, och ingen fejd är hetare än den mellan <strong>{name[feud.a]}</strong> och <strong>{name[feud.b]}</strong></>}.
            </p>
          </div>
          <dl className='vz-kpis'>
            {kpis.map((k) => (
              <div key={k.label} className='vz-kpi'>
                <dt>{k.label}</dt>
                <dd>{k.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Tronbandet</h2>
            <p>Varje streck är en regering. Ju längre streck, desto längre satt kronan kvar.</p>
          </header>
          <ThroneLanes data={data} />
        </section>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Kapplöpningen</h2>
            <p>Hur ledningen växt fram, dag för dag. Peka i diagrammet för att se ställningen en viss dag.</p>
          </header>
          <RaceChart
            ticks={data.race.ticks}
            series={data.race.series.map((s) => { const p = roster.find((r) => r.id === s.playerId)!; return { ...s, name: p.name, slot: p.slot }; })}
            seasons={seasonMarks}
          />
        </section>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Rekordboken</h2>
            <p>Bragderna som ännu ingen slagit.</p>
          </header>
          <RecordBook data={data} />
        </section>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Säsongerna</h2>
            <p>Andel av varje säsongs trontid. ♛ markerar säsongens mästare.</p>
          </header>
          <SeasonGrid data={data} />
        </section>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Fejderna</h2>
            <p>
              Vem som tog kronan från vem.
              {feud && <> Hetast: <strong>{name[feud.a]}</strong> mot <strong>{name[feud.b]}</strong>, {feud.ab + feud.ba} kronbyten ({feud.ab}–{feud.ba}).</>}
            </p>
          </header>
          <FeudGrid data={data} />
        </section>

        <div className='alltime-pair'>
          <section className='vz-panel'>
            <header className='vz-panel-head'>
              <h2>Rikets puls</h2>
              <p>Kröningar per dag, genom hela historien.</p>
            </header>
            <PulseCalendar data={data} />
          </section>
          <section className='vz-panel'>
            <header className='vz-panel-head'>
              <h2>När avgörs det?</h2>
              <p>Kröningar per veckodag och timme.</p>
            </header>
            <PulseClock data={data} />
          </section>
        </div>

        <section className='vz-panel'>
          <header className='vz-panel-head'>
            <h2>Alla genom tiderna</h2>
            <p>Hela tabellen, alla säsonger sammanslagna. Klicka på en rubrik för att sortera.</p>
          </header>
          <div className='table-wrap'>
            <SortableTable
              columns={hallColumns}
              rows={roster.map((p) => ({
                id: p.id,
                values: { name: p.name, throneMs: p.throneMs, wins: p.wins, takeovers: p.takeovers, reigns: p.reigns, longestReignMs: p.longestReignMs, longestStreak: p.longestStreak, seasonsWon: p.seasonsWon, firstWinAt: p.firstWinAt?.getTime() ?? null },
                tr: (
                  <tr>
                    <td><i className='vz-dot' style={{ background: seriesColor(p.slot) }} /><Link href={`/players/${p.id}`} className='lb-name'>{p.name}</Link>{!p.isActive && <span className='muted'> · AFK</span>}</td>
                    <td className='vz-num'>{formatDuration(p.throneMs)}</td>
                    <td className='vz-num'>{p.wins}</td>
                    <td className='vz-num'>{p.takeovers}</td>
                    <td className='vz-num'>{p.reigns}</td>
                    <td className='vz-num'>{formatDuration(p.longestReignMs)}</td>
                    <td className='vz-num'>{p.longestStreak}</td>
                    <td className='vz-num'>{p.seasonsWon ? `♛ ${p.seasonsWon}` : '—'}</td>
                    <td>{formatDate(p.firstWinAt)}</td>
                  </tr>
                ),
              }))}
            />
          </div>
        </section>
      </main>
    </ChartTips>
  );
}
