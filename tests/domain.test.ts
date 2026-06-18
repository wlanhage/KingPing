import { describe,it,expect } from 'vitest';
import { determineEventType, determineNationState, generateAnnouncement, buildPlayerStats } from '../lib/domain/riket';
describe('domain',()=>{
it('event escalation',()=>{ expect(determineEventType({isSameKing:true,streakCount:2})).toBe('SAME_KING_STREAK_2'); expect(determineEventType({isSameKing:true,streakCount:5})).toBe('SAME_KING_STREAK_5_PLUS');});
it('breaker',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:4})).toBe('STREAK_BREAK_MAJOR'); expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:5})).toBe('STREAK_BREAK_LEGENDARY');});
it('first win',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:0,isFirstWin:true})).toBe('FIRST_WIN');});
it('comeback after long drought',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:0,daysSinceLastWin:20})).toBe('COMEBACK');});
it('quick reclaim stays a normal coronation',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:1,daysSinceLastWin:1,isFirstWin:false})).toBe('NEW_KING');});
it('big dethroning beats comeback',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:5,daysSinceLastWin:30,isFirstWin:false})).toBe('STREAK_BREAK_LEGENDARY');});
it('comeback announcement mentions days',()=>{ const a=generateAnnouncement({eventType:'COMEBACK',winnerName:'Erik',nationState:'STABLE_ERA',daysSinceLastWin:21}); expect(a.text.includes('Erik')).toBeTruthy(); expect(a.text.includes('21')).toBeTruthy();});
it('nation',()=>{ expect(determineNationState({recentWinnerIds:['a','b','c','d','e'],currentStreak:1,brokeBigStreak:false})).toBe('INSTABILITY');});
it('announcement has winner',()=>{ const a=generateAnnouncement({eventType:'SAME_KING_STREAK_2',winnerName:'Erik',nationState:'STABLE_ERA'}); expect(a.text.includes('Erik')).toBeTruthy();});
it('stats include active reign and friday wins and current king',()=>{ const now=new Date(); const player={id:'p1',wins:[{streakCount:3,isFridayFinal:true,previousKingId:'p2',winnerId:'p1',occurredAt:now}],reigns:[{startedAt:new Date(now.getTime()-3600000),endedAt:null}]}; const s=buildPlayerStats(player,'p1'); expect(s.totalReignMs).toBeGreaterThan(3500000); expect(s.fridayWins).toBe(1); expect(s.isCurrentKing).toBe(true);});
it('safe zero stats',()=>{ const s=buildPlayerStats({id:'p2',wins:[],reigns:[]},null); expect(s.totalWins).toBe(0); expect(s.totalReignMs).toBe(0); expect(s.currentStreak).toBe(0);});
});
