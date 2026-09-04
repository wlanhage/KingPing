import { describe, expect, it } from 'vitest';
import { describeSeasonEcho, pickSeasonEcho } from '../lib/domain/season-echo';
import { generateAnnouncement } from '../lib/domain/riket';
import { realm } from '../lib/theme/themes/realm';

const previous = { id: 's1', slug: 's1', name: 'Rundpingisriket', theme: 'realm', startedAt: new Date('2026-06-18'), endedAt: new Date('2026-08-28') };
const board = [
  { id: 'axel', name: 'Axel', rank: 1, totalWins: 17, totalReignMs: 900 },
  { id: 'hansson', name: 'Hansson', rank: 2, totalWins: 3, totalReignMs: 600 },
  { id: 'calle', name: 'Calle', rank: 3, totalWins: 1, totalReignMs: 100 },
  { id: 'oliver', name: 'Oliver', rank: 4, totalWins: 0, totalReignMs: 0 },
];

describe('describeSeasonEcho', () => {
  it('känner igen förra härskaren, tvåan, noll vinster och den störtade härskaren', () => {
    expect(describeSeasonEcho(previous, board, 'axel', null)).toMatchObject({ champion: true, lastRank: 1, lastWins: 17, lastChampion: 'Axel' });
    expect(describeSeasonEcho(previous, board, 'hansson', 'axel')).toMatchObject({ runnerUp: true, dethronedChampion: true, champion: false });
    expect(describeSeasonEcho(previous, board, 'oliver', 'calle')).toMatchObject({ winless: true, last: false, dethronedChampion: false });
    expect(describeSeasonEcho(previous, board, 'calle', null)?.last).toBe(false); // sist är Oliver, inte Calle
  });
  it('sist kräver minst en vinst — annars är det noll-vinster-gruppen', () => {
    const b = board.map((r) => (r.id === 'oliver' ? { ...r, totalWins: 1 } : r));
    expect(describeSeasonEcho(previous, b, 'oliver', null)).toMatchObject({ last: true, winless: false });
  });
  it('okänd spelare ger ingen tillbakablick', () => {
    expect(describeSeasonEcho(previous, board, 'ny', null)).toBeNull();
  });
});

describe('pickSeasonEcho', () => {
  const copy = { champion: ['C @{winner}'], winless: ['W @{winner}'], generic: ['G {lastSeason}'] };
  const render = (t: string) => t.replaceAll('@{winner}', 'Axel').replaceAll('{lastSeason}', 'S1');
  const echo = describeSeasonEcho(previous, board, 'axel', null)!;
  it('speciell grupp går före generell', () => {
    expect(pickSeasonEcho(copy, echo, [], render, () => 0)).toBe('C Axel');
  });
  it('generell när inget speciellt gäller', () => {
    const plain = describeSeasonEcho(previous, board, 'calle', null)!;
    expect(pickSeasonEcho(copy, plain, [], render, () => 0)).toBe('G S1');
  });
  it('inte alltid: hög slump ger ingen rad', () => {
    expect(pickSeasonEcho(copy, echo, [], render, () => 0.99)).toBeNull();
  });
  it('ingen tillbakablick utan underlag', () => {
    expect(pickSeasonEcho(copy, null, [], render, () => 0)).toBeNull();
  });
});

describe('generateAnnouncement med tillbakablick', () => {
  it('lägger raden sist och fyller i förra säsongen', () => {
    const echo = describeSeasonEcho(previous, board, 'oliver', null)!;
    const a = generateAnnouncement({ eventType: 'NEW_KING', winnerName: 'Oliver', nationState: 'STABLE_ERA', echo, rand: () => 0 }, realm.announcements);
    const lines = a.text.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(realm.announcements.seasonEchoes.winless.map((t) => t.replaceAll('@{winner}', 'Oliver').replaceAll('{lastSeason}', 'Rundpingisriket'))).toContain(lines.at(-1));
  });
});
