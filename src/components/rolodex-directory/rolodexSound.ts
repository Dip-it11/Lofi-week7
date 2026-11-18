/**
 * Rolodex sounds made with the Web Audio API — no audio files.
 * flick: a card flicking past the rail.
 * flip:  a card turning over.
 */

export type RolodexSound = {
  flick: () => void;
  flip: () => void;
  dispose: () => void;
};

export function createRolodexSound(): RolodexSound | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let last = 0;
  const get = () => {
    if (!ctx) {
      ctx = new Ctx();
      noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    void ctx.resume();
    return { ctx, noise: noise! };
  };
  const burst = (type: BiquadFilterType, freq: number, len: number, vol: number, sweepTo?: number) => {
    const { ctx, noise } = get();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + len);
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(t, Math.random() * 0.3);
    src.stop(t + len + 0.02);
  };
  return {
    flick() {
      // Rate-limit so a fast spin sounds like a purr, not a wall of clicks.
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      if (now - last < 28) return;
      last = now;
      burst("bandpass", 2600 + Math.random() * 500, 0.03, 0.22);
    },
    flip() {
      burst("highpass", 600, 0.22, 0.12, 3200);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
