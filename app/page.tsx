import { getKingdomStats } from '@/lib/domain/riket';
import { RecordWinForm } from '@/components/RecordWinForm';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
export default async function Page(){ const kingdom=await getKingdomStats(); const king=kingdom.currentKing; return <main className='space-y-6'><h1 className='text-4xl font-bold'>👑 Rundpingisriket</h1><div className='rounded-2xl shadow p-6 bg-zinc-900'><div>Nuvarande kung: <b>{king?.name ?? 'Ingen ännu'}</b></div><div className='mt-3'><BadgeGrid badges={king?.badges ?? []} limit={4} /></div></div><RecordWinForm/></main>}
