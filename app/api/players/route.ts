import { prisma } from '@/lib/prisma'; import { z } from 'zod';
const schema=z.object({name:z.string().min(2),slackUserId:z.string().optional()});
export async function GET(){return Response.json(await prisma.player.findMany());}
export async function POST(req:Request){try{const body=schema.parse(await req.json());return Response.json(await prisma.player.create({data:body}));}catch(e:any){return Response.json({error:e.message},{status:400});}}
