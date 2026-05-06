import { prisma } from '@/lib/prisma'; export async function GET(){return Response.json(await prisma.winEvent.findMany({take:100,orderBy:{occurredAt:'desc'}}));}
