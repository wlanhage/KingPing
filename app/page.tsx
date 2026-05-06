import { getCurrentKing } from '@/lib/domain/riket';
import { RecordWinForm } from '@/components/RecordWinForm';
export default async function Page(){ const king=await getCurrentKing(); return <main className='space-y-6'><h1 className='text-4xl font-bold'>👑 Rundpingisriket</h1><div className='rounded-2xl shadow p-6 bg-zinc-900'>Nuvarande kung: <b>{king?.player.name ?? 'Ingen ännu'}</b></div><RecordWinForm/></main>}
