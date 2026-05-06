export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return <div className='rounded-2xl bg-zinc-900 shadow p-4'><p className='text-zinc-400 text-sm'>{label}</p><p className='text-2xl font-semibold'>{value}</p>{sublabel && <p className='text-xs text-zinc-500 mt-1'>{sublabel}</p>}</div>;
}
