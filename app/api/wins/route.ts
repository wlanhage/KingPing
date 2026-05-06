import { z } from 'zod'; import { recordWin } from '@/lib/domain/riket';
const schema=z.object({winnerId:z.string().min(1),note:z.string().optional()});
export async function POST(req:Request){try{const body=schema.parse(await req.json()); const result=await recordWin(body.winnerId,body.note); return Response.json(result);}catch(e:any){return Response.json({error:e.message},{status:400});}}
