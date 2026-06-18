import { StatCard } from './StatCard';

const icons = ['👑', '🏓', '🪑', '🔥', '🏆', '📅', '⚔️', '⏳', '🕰️', '🎯'];

export function StatsGrid({ stats }: { stats: { label: string; value: string | number; sublabel?: string }[] }) {
  return (
    <section className='royal-stats-panel'>
      <h2>Statistik</h2>
      <div className='royal-stats-grid'>
        {stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i % icons.length]} />)}
      </div>
    </section>
  );
}
