import { getActiveTheme } from '@/lib/theme/server';
import { prisma } from '@/lib/prisma';
import { formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const { theme } = await getActiveTheme();
  const vars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_CHANNEL_ID'];
  const log = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.settings.title}</h1>
        <p className='subtitle'>{theme.pages.settings.subtitle}</p>
      </section>
      <section className='grid cols-3'>
        {vars.map((v) => (
          <div key={v} className='card'>
            <p className='muted' style={{ marginTop: 0 }}>{v}</p>
            <div className='kpi-value'>{process.env[v] ? 'Configured' : 'Missing'}</div>
          </div>
        ))}
      </section>
      <section>
        <h2>Loggbok</h2>
        {/* Riket har ingen inloggning: loggen visar varifrån något gjordes, inte av vem. */}
        <p className='subtitle'>De senaste ändringarna i riket — kröningar, nya spelare och säsongsbyten. <code>web</code> betyder webbgränssnittet, <code>cli:namn</code> ett script i terminalen.</p>
      </section>
      <section className='card'>
        {log.length === 0 && <p className='muted' style={{ margin: 0 }}>Inget loggat ännu.</p>}
        {log.map((row) => (
          <div key={row.id} className='timeline-item'>
            <div className='muted'>{formatDateTime(row.createdAt)} · {row.actor}</div>
            <div>{row.summary}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
