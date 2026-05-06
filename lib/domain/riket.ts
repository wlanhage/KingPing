import { EventType, NationState } from '@prisma/client';
import { differenceInDays, isFriday } from 'date-fns';
import { prisma } from '../prisma';
import { fridayIntros, nationIntros, streakTemplates } from '../copy/templates';

const nowMs = () => new Date().getTime();
const durationMs = (start: Date, end?: Date | null) => (end ?? new Date()).getTime() - start.getTime();

export async function getCurrentKing() { return prisma.reign.findFirst({ where:{ endedAt:null }, include:{ player:true }, orderBy:{ startedAt:'desc' } }); }
export function determineEventType(ctx:{isSameKing:boolean; streakCount:number; previousStreakCount?:number|null;}):EventType {
 if (ctx.isSameKing) return ctx.streakCount===2?EventType.SAME_KING_STREAK_2:ctx.streakCount===3?EventType.SAME_KING_STREAK_3:ctx.streakCount===4?EventType.SAME_KING_STREAK_4:EventType.SAME_KING_STREAK_5_PLUS;
 const p=ctx.previousStreakCount??0; if(p>=5)return EventType.STREAK_BREAK_LEGENDARY; if(p===4)return EventType.STREAK_BREAK_MAJOR; if(p===3)return EventType.STREAK_BREAK_MEDIUM; if(p===2)return EventType.STREAK_BREAK_SMALL; return EventType.NEW_KING;
}
export function determineNationState(ctx:{recentWinnerIds:string[]; currentStreak:number; brokeBigStreak:boolean;}):NationState { if(ctx.currentStreak>=5)return NationState.TYRANNY; if(ctx.currentStreak>=3)return NationState.DYNASTY; if(ctx.brokeBigStreak)return NationState.REVOLUTION; const u=new Set(ctx.recentWinnerIds).size; if(u>=5)return NationState.INSTABILITY; if(u>=3)return NationState.TENSION; return NationState.STABLE_ERA; }
export function generateAnnouncement(ctx:any){ const templ=(streakTemplates as any)[ctx.eventType]?.[0] ?? `👑 @{winner} har krönts.`; let text=templ.replaceAll('@{winner}',ctx.winnerName).replaceAll('@{previousKing}',ctx.previousKingName??'Ingen').replaceAll('{previousStreakCount}',String(ctx.previousStreakCount??0)); if(Math.random()>0.4) text=`${nationIntros[ctx.nationState as keyof typeof nationIntros][0]}\n${text}`; if(ctx.isFridayFinal) text=`${fridayIntros[0]}\n${text}`; return { text, layout:'royal', persona:'ROYAL_DECREE' }; }
export async function calculateStreak(winnerId:string){ const events=await prisma.winEvent.findMany({where:{winnerId}, orderBy:{occurredAt:'desc'}, take:10}); return events.length===0?0:events.reduce((acc,e,i)=> i===0?1: acc + (events[i-1].occurredAt>=e.occurredAt?1:0),0); }
export async function recordWin(winnerId:string,note?:string){ const now=new Date(); const current=await getCurrentKing(); const isSameKing=current?.playerId===winnerId; const previousEvents=await prisma.winEvent.findMany({orderBy:{occurredAt:'desc'},take:7}); const previousStreakCount=previousEvents[0]?.streakCount ?? 0; const streakCount=isSameKing?previousStreakCount+1:1; const eventType=determineEventType({isSameKing:!!isSameKing, streakCount, previousStreakCount}); const nationState=determineNationState({recentWinnerIds:previousEvents.map(e=>e.winnerId),currentStreak:streakCount,brokeBigStreak:!isSameKing&&previousStreakCount>=3}); const winner=await prisma.player.findUniqueOrThrow({where:{id:winnerId}}); const ann=generateAnnouncement({eventType,winnerName:winner.name,previousKingName:current?.player.name,previousStreakCount,nationState,isFridayFinal:isFriday(now)});
 return prisma.$transaction(async(tx)=>{ if(current && !isSameKing){ await tx.reign.update({where:{id:current.id}, data:{endedAt:now}}); await tx.reign.create({data:{playerId:winnerId,startedAt:now}});} if(!current){ await tx.reign.create({data:{playerId:winnerId,startedAt:now}});} const win=await tx.winEvent.create({data:{winnerId,previousKingId:current?.playerId,occurredAt:now,eventType,streakCount,previousStreakCount,note,announcementText:ann.text,nationState,isFridayFinal:isFriday(now)}}); const a=await tx.announcement.create({data:{winEventId:win.id,text:ann.text,layout:ann.layout,persona:ann.persona}}); return {win,a}; }); }

export function buildPlayerStats(player: any, currentKingId?: string | null) {
  const totalWins = player.wins.length;
  const totalReignMs = player.reigns.reduce((s: number, r: any) => s + durationMs(r.startedAt, r.endedAt), 0);
  const longestReignMs = Math.max(0, ...player.reigns.map((r: any) => durationMs(r.startedAt, r.endedAt)));
  const isCurrentKing = currentKingId === player.id;
  const currentReign = isCurrentKing ? player.reigns.find((r: any) => !r.endedAt) : null;
  const currentReignMs = currentReign ? durationMs(currentReign.startedAt) : 0;
  const longestStreak = Math.max(0, ...player.wins.map((w: any) => w.streakCount));
  const fridayWins = player.wins.filter((w: any) => w.isFridayFinal).length;
  const takeoverWins = player.wins.filter((w: any) => w.previousKingId && w.previousKingId !== w.winnerId).length;
  const lastWinAt = player.wins[0]?.occurredAt ?? null;
  const daysSinceLastWin = lastWinAt ? differenceInDays(new Date(), lastWinAt) : null;
  const averageReignMs = player.reigns.length ? totalReignMs / player.reigns.length : 0;
  const crownEfficiencyMsPerWin = totalWins ? totalReignMs / totalWins : 0;
  return { totalWins, totalReignMs, longestReignMs, currentReignMs, currentStreak: isCurrentKing ? (player.wins[0]?.streakCount ?? 0) : 0, longestStreak, fridayWins, takeoverWins, daysSinceLastWin, averageReignMs, crownEfficiencyMsPerWin, lastWinAt, isCurrentKing };
}

export async function getLeaderboard() {
  const players = await prisma.player.findMany({ include: { wins: { orderBy: { occurredAt: 'desc' } }, reigns: true } });
  const current = await getCurrentKing();
  const rows = players.map((p) => ({ id: p.id, name: p.name, ...buildPlayerStats(p, current?.playerId) })).sort((a,b)=>b.totalReignMs-a.totalReignMs);
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function getKingdomStats() {
  const rows = await getLeaderboard();
  const currentKing = rows.find((r) => r.isCurrentKing) ?? null;
  const fridayChampion = [...rows].sort((a,b)=>b.fridayWins-a.fridayWins)[0] ?? null;
  const longestStreak = [...rows].sort((a,b)=>b.longestStreak-a.longestStreak)[0] ?? null;
  return { currentKing, fridayChampion, longestStreak, mostThroneTime: rows[0] ?? null };
}

export async function getPlayerTimeline(playerId: string) {
  const wins = await prisma.winEvent.findMany({ where: { winnerId: playerId }, include: { winner: true }, orderBy: { occurredAt: 'desc' }, take: 20 });
  return wins.map((w) => ({ id: w.id, date: w.occurredAt, eventType: w.eventType, announcementText: w.announcementText, previousKingId: w.previousKingId, reignDurationMs: null }));
}

export async function getPlayerStats(playerId: string) {
  const current = await getCurrentKing();
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { wins: { orderBy: { occurredAt: 'desc' } }, reigns: true } });
  if (!player) return null;
  const stats = buildPlayerStats(player, current?.playerId);
  const board = await getLeaderboard();
  return {
    ...stats,
    currentRankByThroneTime: board.findIndex((r) => r.id === playerId) + 1 || null,
    rankByWins: [...board].sort((a,b)=>b.totalWins-a.totalWins).findIndex((r)=>r.id===playerId)+1 || null,
    rankByLongestStreak: [...board].sort((a,b)=>b.longestStreak-a.longestStreak).findIndex((r)=>r.id===playerId)+1 || null,
    rankByFridayWins: [...board].sort((a,b)=>b.fridayWins-a.fridayWins).findIndex((r)=>r.id===playerId)+1 || null,
  };
}

export async function getPlayerProfile(playerId: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const stats = await getPlayerStats(playerId);
  const timeline = await getPlayerTimeline(playerId);
  return { player, stats, timeline };
}

export async function calculateLeaderboard(){ return getLeaderboard(); }
