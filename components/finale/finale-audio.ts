'use client';

/**
 * Finalens musik: ett intro som spelas en gång och därefter en loop tills sidan
 * lämnas eller ljudet mutas. Sömlösheten kräver Web Audio — <audio loop> har
 * hörbara glapp. Loopkällan schemaläggs sample-exakt vid introts slut.
 * Saknas filerna (404) körs finalen tyst utan fel.
 */

const MUTE_KEY = 'kp-finale-muted';

/**
 * Kandidater i fallande prioritet: säsongsvariant före standard, och WAV före MP3.
 * WAV först eftersom MP3-kodning lägger till tystnad i början och slutet
 * (encoder delay/padding) som följer med in i den avkodade bufferten och ger ett
 * hörbart glapp vid varje looprunda — precis det loopen inte får ha.
 */
export function resolveFinaleAudioSources(slug: string) {
  const candidates = (part: 'intro' | 'loop') => [
    `/audio/finale-${part}-${slug}.wav`,
    `/audio/finale-${part}-${slug}.mp3`,
    `/audio/finale-${part}.wav`,
    `/audio/finale-${part}.mp3`,
  ];
  return { intro: candidates('intro'), loop: candidates('loop') };
}

export type FinaleAudio = {
  start: () => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMutedInitially: () => boolean;
  /** Intro + två loopvarv, för cinema-lägets tempo. null tills filerna laddats. */
  suggestedSeconds: () => number | null;
};

export function createFinaleAudio(slug: string): FinaleAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let started = false;
  let hidden = false;
  let muted = false;
  let durations: { intro: number; loop: number } | null = null;

  const gainTarget = () => (muted ? 0 : hidden ? 0.12 : 0.7);
  const applyGain = () => {
    if (ctx && master) master.gain.linearRampToValueAtTime(gainTarget(), ctx.currentTime + 0.25);
  };

  async function fetchBuffer(c: AudioContext, urls: string[]): Promise<AudioBuffer | null> {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch { /* prova nästa källa */ }
    }
    return null;
  }

  const onVisibility = () => { hidden = document.hidden; applyGain(); };

  return {
    isMutedInitially() {
      try { muted = window.localStorage.getItem(MUTE_KEY) === '1'; } catch {}
      return muted;
    },
    async start() {
      if (started) return;
      started = true;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = gainTarget();
      master.connect(ctx.destination);
      document.addEventListener('visibilitychange', onVisibility);
      const src = resolveFinaleAudioSources(slug);
      const [intro, loop] = await Promise.all([fetchBuffer(ctx, src.intro), fetchBuffer(ctx, src.loop)]);
      if (!ctx) return; // stop() hann köras under laddningen
      durations = { intro: intro?.duration ?? 0, loop: loop?.duration ?? 0 };
      const t0 = ctx.currentTime + 0.08;
      if (intro) {
        const s = ctx.createBufferSource();
        s.buffer = intro; s.connect(master); s.start(t0);
      }
      if (loop) {
        const s = ctx.createBufferSource();
        s.buffer = loop; s.loop = true; s.connect(master);
        s.start(t0 + (intro?.duration ?? 0)); // sample-exakt vid introts slut
      }
    },
    stop() {
      document.removeEventListener('visibilitychange', onVisibility);
      void ctx?.close().catch(() => {});
      ctx = null; master = null;
    },
    setMuted(m: boolean) {
      muted = m;
      try { window.localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {}
      applyGain();
    },
    suggestedSeconds() {
      if (!durations || (durations.intro === 0 && durations.loop === 0)) return null;
      return Math.min(180, Math.max(60, durations.intro + durations.loop * 2));
    },
  };
}
