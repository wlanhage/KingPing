import { describe,it,expect } from 'vitest';
import { determineEventType, determineNationState, generateAnnouncement, buildPlayerStats } from '../lib/domain/riket';
describe('domain',()=>{
it('event escalation',()=>{ expect(determineEventType({isSameKing:true,streakCount:2})).toBe('SAME_KING_STREAK_2'); expect(determineEventType({isSameKing:true,streakCount:5})).toBe('SAME_KING_STREAK_5_PLUS');});
it('breaker',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:4})).toBe('STREAK_BREAK_MAJOR'); expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:5})).toBe('STREAK_BREAK_LEGENDARY');});
it('nation',()=>{ expect(determineNationState({recentWinnerIds:['a','b','c','d','e'],currentStreak:1,brokeBigStreak:false})).toBe('INSTABILITY');});
it('announcement has winner',()=>{ const a=generateAnnouncement({eventType:'SAME_KING_STREAK_2',winnerName:'Erik',nationState:'STABLE_ERA'}); expect(a.text.includes('Erik')).toBeTruthy();});
it('stats include active reign and friday wins and current king',()=>{ const now=new Date(); const player={id:'p1',wins:[{streakCount:3,isFridayFinal:true,previousKingId:'p2',winnerId:'p1',occurredAt:now}],reigns:[{startedAt:new Date(now.getTime()-3600000),endedAt:null}]}; const s=buildPlayerStats(player,'p1'); expect(s.totalReignMs).toBeGreaterThan(3500000); expect(s.fridayWins).toBe(1); expect(s.isCurrentKing).toBe(true);});
it('safe zero stats',()=>{ const s=buildPlayerStats({id:'p2',wins:[],reigns:[]},null); expect(s.totalWins).toBe(0); expect(s.totalReignMs).toBe(0); expect(s.currentStreak).toBe(0);});
});
