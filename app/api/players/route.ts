import { prisma } from '@/lib/prisma'; import { z } from 'zod'; import { audit } from '@/lib/audit';
const schema=z.object({name:z.string().min(2),slackUserId:z.string().optional()});
export async function GET(){return Response.json(await prisma.player.findMany());}
export async function POST(req:Request){try{const body=schema.parse(await req.json());const player=await prisma.player.create({data:body});await audit('PLAYER_CREATED',`${player.name} lades till.`,'web');return Response.json(player);}catch(e:any){return Response.json({error:e.message},{status:400});}}
