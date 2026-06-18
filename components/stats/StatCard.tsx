export function StatCard({ label, value, sublabel, icon }: { label: string; value: string | number; sublabel?: string; icon?: string }) {
  return (
    <article className='royal-stat-card'>
      <div className='royal-stat-icon' aria-hidden>{icon ?? '✦'}</div>
      <p className='royal-stat-label'>{label}</p>
      <p className='royal-stat-value'>{value}</p>
      {sublabel && <p className='royal-stat-sublabel'>{sublabel}</p>}
    </article>
  );
}
