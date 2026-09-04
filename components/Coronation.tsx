'use client';
import { useEffect, useRef, useState } from 'react';
import type { Theme } from '@/lib/theme';

/**
 * THE ROYAL CORONATION SPECTACULAR™
 * Full-screen firande som avfyras när tronen byter ägare (eller försvaras med besked).
 * - Ny regent: guldkonfetti, nedstigande krona, utropare, fanfar och en hovnarr som rostar den störtade.
 * - Samma kung som försvarar (streak ≥ 3): drakar som skalar med streaken.
 * Respekterar prefers-reduced-motion och kan tystas (val sparas i localStorage).
 */

export type CoronationEvent = {
  winnerName: string;
  deposedName: string | null;
  streakCount: number;
  isNewRuler: boolean;
};

const MUTE_KEY = 'kp-coronation-muted';
const GOLD = ['#e7c25c', '#f3d98a', '#c9a227', '#b8901f', '#fbeec2'];

export type CoronationCopy = Theme['coronation'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Ljud: syntetiserad fanfar, hovets "song of ice and ping"-drone och en sorgtrombon ── */

function playFanfare(ctx: AudioContext, master: GainNode) {
  const now = ctx.currentTime;
  // Fyra stigande toner (C-dur-arpeggio upp till oktaven) = en riktig kröningsfanfar.
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((freq, i) => {
    const t = now + i * 0.22;
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filt.type = 'lowpass';
    filt.frequency.value = 2600;
    const dur = i === notes.length - 1 ? 1.1 : 0.34;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt).connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    // En diskret oktav under för brassig tyngd.
    const low = ctx.createOscillator();
    const lg = ctx.createGain();
    low.type = 'triangle';
    low.frequency.value = freq / 2;
    lg.gain.setValueAtTime(0.0001, t);
    lg.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    lg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    low.connect(lg).connect(master);
    low.start(t);
    low.stop(t + dur + 0.05);
  });

  // "A faint song of ice and ping" — en låg drone med små pling under fanfaren.
  const drone = ctx.createOscillator();
  const dg = ctx.createGain();
  drone.type = 'sine';
  drone.frequency.value = 65.4; // C2
  dg.gain.setValueAtTime(0.0001, now);
  dg.gain.exponentialRampToValueAtTime(0.07, now + 0.4);
  dg.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
  drone.connect(dg).connect(master);
  drone.start(now);
  drone.stop(now + 2.7);
  [0.5, 1.15, 1.8].forEach((offset, i) => {
    const t = now + offset;
    const ping = ctx.createOscillator();
    const pg = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.value = [1046, 1318, 1568][i];
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    ping.connect(pg).connect(master);
    ping.start(t);
    ping.stop(t + 0.3);
  });
}

function playSadTrombone(ctx: AudioContext, master: GainNode, at: number) {
  // Klassiskt "womp-womp-womp-wompppp" för den störtade.
  const steps = [233.08, 207.65, 185.0, 155.56];
  steps.forEach((freq, i) => {
    const t = at + i * 0.28;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const dur = i === steps.length - 1 ? 0.7 : 0.24;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  });
}

/* ── Galaxens ljud: en egen marsch i moll (inte Williams melodi) och droidpip för den störtade ── */

function playDarkMarch(ctx: AudioContext, master: GainNode) {
  const now = ctx.currentTime;
  // Punkterad marschrytm i d-moll: D D F D | Bb C D — tung, långsam, ingen fanfarglädje.
  const steps: [number, number][] = [[146.83, 0.32], [146.83, 0.32], [174.61, 0.16], [146.83, 0.48], [116.54, 0.32], [130.81, 0.16], [146.83, 1.0]];
  let t = now;
  for (const [freq, dur] of steps) {
    for (const [mult, type, vol] of [[1, 'sawtooth', 0.26], [0.5, 'square', 0.1], [2, 'triangle', 0.06]] as [number, OscillatorType, number][]) {
      const osc = ctx.createOscillator();
      const filt = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq * mult;
      filt.type = 'lowpass';
      filt.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
      osc.connect(filt).connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur);
    }
    // Trumslag på varje ton: kort brusstöt genom ett bandpass.
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 180;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    noise.connect(bp).connect(ng).connect(master);
    noise.start(t);
    t += dur;
  }
  // Mörk drone under hela marschen.
  const drone = ctx.createOscillator();
  const dg = ctx.createGain();
  drone.type = 'sawtooth';
  drone.frequency.value = 36.71; // D1
  dg.gain.setValueAtTime(0.0001, now);
  dg.gain.exponentialRampToValueAtTime(0.09, now + 0.3);
  dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  drone.connect(dg).connect(master);
  drone.start(now);
  drone.stop(t + 0.5);
}

function playDroidBeeps(ctx: AudioContext, master: GainNode, at: number) {
  // Bekymrade droidpip: korta toner som glider upp eller ner, i oregelbunden takt.
  const freqs = [1320, 880, 1760, 990, 1480, 740, 1180];
  let t = at;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = i % 2 ? 'square' : 'sine';
    const dur = 0.09 + (i % 3) * 0.04;
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * (i % 2 ? 0.7 : 1.5), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    t += dur + 0.05 + (i % 2) * 0.07;
  });
}

export function Coronation({ event, copy, onDone }: { event: CoronationEvent; copy: CoronationCopy; onDone: () => void }) {
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [doorHeld, setDoorHeld] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const doorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roast = useRef(pick(copy.roasts)).current;
  const holdDecree = copy.holdDecree.replaceAll('{streak}', String(event.streakCount));

  const dragonCount = event.streakCount >= 3 ? Math.min(event.streakCount, 7) : 0;
  const showDeposed = event.isNewRuler && !!event.deposedName;

  // Läs mute-val och reduced-motion en gång (klientkomponent, avfyras efter klick).
  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(rm);
    setMuted(window.localStorage.getItem(MUTE_KEY) === '1');
  }, []);

  // Auto-stäng + tangentbord (Esc), och fokusera hoppa-över-knappen.
  useEffect(() => {
    skipRef.current?.focus();
    const timer = setTimeout(onDone, reduced ? 9000 : 8000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, [onDone, reduced]);

  // Ljud: fanfar (+ ev. sorgtrombon för den störtade). Följer på användarens klick → tillåtet.
  useEffect(() => {
    if (muted) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audioRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    const march = copy.sound === 'march';
    void ctx.resume().then(() => {
      if (march) playDarkMarch(ctx, master); else playFanfare(ctx, master);
      if (showDeposed) (march ? playDroidBeeps : playSadTrombone)(ctx, master, ctx.currentTime + 2.6);
    });
    return () => { void ctx.close().catch(() => {}); audioRef.current = null; };
  }, [muted, showDeposed, copy.sound]);

  // Guldkonfetti (hoppas över vid reduced-motion).
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    type P = { x: number; y: number; w: number; h: number; vy: number; vx: number; rot: number; vr: number; sway: number; color: string };
    const parts: P[] = Array.from({ length: 260 }, () => ({
      x: Math.random() * w,
      y: Math.random() * -h,
      w: 5 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      vy: 1.6 + Math.random() * 2.8,
      vx: -0.6 + Math.random() * 1.2,
      rot: Math.random() * Math.PI * 2,
      vr: -0.12 + Math.random() * 0.24,
      sway: Math.random() * Math.PI * 2,
      color: GOLD[(Math.random() * GOLD.length) | 0],
    }));

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.sway += 0.03;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.7;
        p.rot += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [reduced]);

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      return next;
    });
  }

  // Hemligt "hold the door"-easter egg. 🚪
  function startDoor() {
    doorTimer.current = setTimeout(() => setDoorHeld(true), 1600);
  }
  function endDoor() {
    if (doorTimer.current) clearTimeout(doorTimer.current);
    setDoorHeld(false);
  }
  useEffect(() => () => { if (doorTimer.current) clearTimeout(doorTimer.current); }, []);

  const bannerName = event.winnerName;

  return (
    <div
      className={`coro-overlay${reduced ? ' coro-reduced' : ''}`}
      role='dialog'
      aria-modal='true'
      aria-label={copy.crier}
      onClick={onDone}
    >
      {!reduced && <canvas ref={canvasRef} className='coro-confetti' aria-hidden='true' />}

      {/* Skärmläsar-utrop */}
      <p className='coro-sr' aria-live='assertive'>
        {event.isNewRuler ? `${copy.crier} ${bannerName} ${copy.decree}` : `${bannerName} ${holdDecree}`}
      </p>

      {dragonCount > 0 && (
        <div className='coro-dragons' aria-hidden='true'>
          {Array.from({ length: dragonCount }).map((_, i) => (
            <span key={i} className='coro-dragon' style={{ top: `${12 + i * 11}%`, animationDelay: `${i * 0.35}s` }}>{copy.streakCreature}</span>
          ))}
        </div>
      )}

      <div className='coro-stage' onClick={(e) => e.stopPropagation()}>
        {event.isNewRuler ? (
          <>
            <div className='coro-crown' aria-hidden='true'>👑</div>
            <p className='coro-crier'>{copy.crier}</p>
            <h2 className='coro-name'>{bannerName}</h2>
            <p className='coro-decree'>{copy.decree}</p>

            {showDeposed && (
              <div className='coro-jester'>
                <span className='coro-jester-face' aria-hidden='true'>{copy.jester}</span>
                <p className='coro-roast'>“{roast.replaceAll('{name}', event.deposedName!)}”</p>
                <span className='coro-tear' aria-hidden='true'>💧</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className='coro-crown coro-crown-hold' aria-hidden='true'>👑</div>
            <p className='coro-crier'>{copy.holdCrier}</p>
            <h2 className='coro-name'>{bannerName}</h2>
            <p className='coro-decree'>{holdDecree}</p>
          </>
        )}

        <div className='coro-actions'>
          <button type='button' className='coro-mute' onClick={toggleMute} aria-pressed={muted}>
            {muted ? '🔇 Ljud av' : '🔊 Ljud på'}
          </button>
          <button type='button' ref={skipRef} className='coro-skip' onClick={onDone}>
            {copy.dismiss}
          </button>
        </div>
      </div>

      {/* 🤫 hold the door */}
      <span
        className={`coro-door${doorHeld ? ' coro-door-held' : ''}`}
        aria-hidden='true'
        onMouseDown={startDoor}
        onMouseUp={endDoor}
        onMouseLeave={endDoor}
        onTouchStart={startDoor}
        onTouchEnd={endDoor}
      >
        {doorHeld ? 'Hodor.' : '🚪'}
      </span>
    </div>
  );
}
