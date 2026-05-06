import { StatCard } from './StatCard';
export function StatsGrid({ stats }: { stats: { label: string; value: string | number; sublabel?: string }[] }) {
  return <div className='grid md:grid-cols-3 gap-3'>{stats.map((s) => <StatCard key={s.label} {...s} />)}</div>;
}
