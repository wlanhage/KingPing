import { formatDate } from '@/lib/format';
export function PlayerTimeline({ items }: { items: any[] }) {
  return <div className='rounded-2xl bg-zinc-900 p-6 shadow'><h2 className='text-xl font-semibold mb-4'>Kungakrönika</h2><div className='space-y-3'>{items.length?items.map(i=><div key={i.id} className='border-l-2 border-zinc-700 pl-3'><p className='text-xs text-zinc-500'>{formatDate(i.date)} · {i.eventType}</p><p>{i.announcementText}</p></div>):<p className='text-zinc-400'>Ingen historik ännu.</p>}</div></div>;
}
