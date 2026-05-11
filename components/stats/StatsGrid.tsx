import { StatCard } from './StatCard';

const icons = ['👑', '🏓', '🪑', '🔥', '🏆', '📅', '⚔️', '⏳', '🕰️', '🎯'];

export function StatsGrid({ stats }: { stats: { label: string; value: string | number; sublabel?: string }[] }) {
  return (
    <section className='rounded-2xl border border-yellow-500/20 bg-slate-950/80 shadow-2xl p-5 md:p-6'>
      <h2 className='text-xl md:text-2xl font-semibold text-amber-200 mb-4'>Statistik</h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-3'>
        {stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i % icons.length]} />)}
      </div>
    </section>
  );
}
