import { getActiveTheme } from '@/lib/theme/server';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const { theme } = await getActiveTheme();
  const vars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_CHANNEL_ID'];
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
    </main>
  );
}
