import { describe,it,expect } from 'vitest';
import { determineEventType, determineNationState, generateAnnouncement } from '@/lib/domain/riket';
describe('domain',()=>{
it('event escalation',()=>{ expect(determineEventType({isSameKing:true,streakCount:2})).toBe('SAME_KING_STREAK_2'); expect(determineEventType({isSameKing:true,streakCount:5})).toBe('SAME_KING_STREAK_5_PLUS');});
it('breaker',()=>{ expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:4})).toBe('STREAK_BREAK_MAJOR'); expect(determineEventType({isSameKing:false,streakCount:1,previousStreakCount:5})).toBe('STREAK_BREAK_LEGENDARY');});
it('nation',()=>{ expect(determineNationState({recentWinnerIds:['a','b','c','d','e'],currentStreak:1,brokeBigStreak:false})).toBe('INSTABILITY');});
it('announcement has winner',()=>{ const a=generateAnnouncement({eventType:'SAME_KING_STREAK_2',winnerName:'Erik',nationState:'STABLE_ERA'}); expect(a.text.includes('Erik')).toBeTruthy();});
});
