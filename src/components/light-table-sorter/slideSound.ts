/**
 * Light table sounds made with the Web Audio API — no audio files.
 * pick:  a plastic slide mount lifting off the glass.
 * drop:  the mount snapping down into place.
 * lamp:  the light-box switch and a short fluorescent buzz.
 */

export type SlideSound = {
  pick: () => void;
  drop: () => void;
  lamp: (on: boolean) => void;
  dispose: () => void;
};

export function createSlideSound(): SlideSound | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  let ctx: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
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
  const tick = (freq: number, len: number, vol: number, delay = 0) => {
    const { ctx, noise } = get();
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t, Math.random() * 0.3);
    src.stop(t + len + 0.02);
  };
  return {
    pick() {
      tick(3200, 0.03, 0.18);
    },
    drop() {
      tick(1800, 0.04, 0.3);
      tick(900, 0.06, 0.18, 0.03);
    },
    lamp(on) {
      const { ctx } = get();
      tick(2400, 0.02, 0.35);
      if (!on) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 120;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.025, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(lp).connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.75);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
