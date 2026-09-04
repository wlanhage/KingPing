import { describe, expect, it } from 'vitest';
import { resolveFinaleAudioSources } from '../components/finale/finale-audio';

describe('resolveFinaleAudioSources', () => {
  it('säsongsvariant före standard, och WAV före MP3', () => {
    const s = resolveFinaleAudioSources('s1');
    expect(s.intro).toEqual([
      '/audio/finale-intro-s1.wav', '/audio/finale-intro-s1.mp3',
      '/audio/finale-intro.wav', '/audio/finale-intro.mp3',
    ]);
    expect(s.loop).toEqual([
      '/audio/finale-loop-s1.wav', '/audio/finale-loop-s1.mp3',
      '/audio/finale-loop.wav', '/audio/finale-loop.mp3',
    ]);
  });
});
