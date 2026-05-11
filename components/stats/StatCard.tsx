export function StatCard({ label, value, sublabel, icon }: { label: string; value: string | number; sublabel?: string; icon?: string }) {
  return (
    <article className='rounded-2xl border border-yellow-500/20 bg-slate-900/80 p-4 shadow-lg'>
      <div className='text-2xl mb-2' aria-hidden>{icon ?? '✦'}</div>
      <p className='text-xs uppercase tracking-wide text-slate-300'>{label}</p>
      <p className='mt-2 text-2xl font-semibold text-slate-100 break-words'>{value}</p>
      {sublabel && <p className='mt-1 text-sm text-amber-300'>{sublabel}</p>}
    </article>
  );
}
