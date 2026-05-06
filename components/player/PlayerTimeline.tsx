import { formatDate } from '@/lib/format';
export function PlayerTimeline({ items }: { items: any[] }) {
  return <div className='card'><h2 style={{ marginTop: 0 }}>Kungakrönika</h2><div>{items.length ? items.map(i => <div key={i.id} className='timeline-item'><p className='muted'>{formatDate(i.date)} · {i.eventType}</p><p>{i.announcementText}</p></div>) : <p className='muted'>Ingen historik ännu.</p>}</div></div>;
}
