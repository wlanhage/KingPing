export default function Settings() {
  const vars = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_CHANNEL_ID'];
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Settings</h1>
        <p className='subtitle'>Miljöstatus för integrationer.</p>
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
