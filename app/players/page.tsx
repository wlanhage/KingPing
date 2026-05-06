import Link from 'next/link';
import { prisma } from '@/lib/prisma';
export default async function Players(){ const p=await prisma.player.findMany(); return <main className='space-y-4'><h1 className='text-3xl font-bold'>Spelare</h1>{p.map(x=><Link className='block rounded-xl bg-zinc-900 p-4 hover:bg-zinc-800' key={x.id} href={`/players/${x.id}`}>{x.name}</Link>)}</main>}
