/** Glass beads tumbling inside the tube — tiny high clicks, made with the Web Audio API. */
export type KaleidoSound = { tumble: (amount: number) => void; dispose: () => void };

export function createKaleidoSound(): KaleidoSound | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  let ctx: AudioContext | null = null;
  let last = 0;
  return {
    /** amount: degrees twisted since the last call — more twist, more clicks. */
    tumble(amount) {
      ctx ??= new Ctx();
      void ctx.resume();
      const now = ctx.currentTime;
      if (now - last < 0.03) return;
      last = now;
      const clicks = Math.min(3, 1 + Math.floor(Math.abs(amount) / 8));
      for (let i = 0; i < clicks; i++) {
        const t = now + i * 0.018 + Math.random() * 0.01;
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = 2600 + Math.random() * 2600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.06);
      }
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
