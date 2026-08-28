import { describe, expect, it } from 'vitest';
import { resolveFinaleAudioSources } from '../components/finale/finale-audio';

describe('resolveFinaleAudioSources', () => {
  it('säsongsvariant har företräde före standardfilen', () => {
    const s = resolveFinaleAudioSources('s1');
    expect(s.intro).toEqual(['/audio/finale-intro-s1.mp3', '/audio/finale-intro.mp3']);
    expect(s.loop).toEqual(['/audio/finale-loop-s1.mp3', '/audio/finale-loop.mp3']);
  });
});
