export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return <div className='card'><p className='muted'>{label}</p><p className='kpi-value'>{value}</p>{sublabel && <p className='muted' style={{ marginTop: '.25rem' }}>{sublabel}</p>}</div>;
}
