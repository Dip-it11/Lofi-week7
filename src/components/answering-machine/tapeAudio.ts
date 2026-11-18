/**
 * Audio helpers for the answering machine — Web Audio only, no files.
 * - pickMimeType: the best recording format this browser supports.
 * - toWav: turn any recording into a small, seekable mono WAV.
 * - createMachineSounds: the "leave a message after the beep" beep, key clunks and the rewind squeal.
 */

export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
}

type Ctor = typeof AudioContext;
const ctxCtor = (): Ctor | undefined =>
  typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext);

/** Encode an AudioBuffer as 16-bit mono PCM WAV at `rate` Hz. */
export async function encodeWav(buffer: AudioBuffer, rate = 24000): Promise<Blob> {
  const length = Math.max(1, Math.ceil(buffer.duration * rate));
  const off = new OfflineAudioContext(1, length, rate);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start();
  const mono = (await off.startRendering()).getChannelData(0);

  const bytes = 44 + mono.length * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, bytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, mono.length * 2, true);
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
}

/** Decode a recording and re-encode it as WAV. Returns null if the browser can't decode it. */
export async function toWav(blob: Blob): Promise<{ blob: Blob; duration: number } | null> {
  const Ctx = ctxCtor();
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    return { blob: await encodeWav(buffer), duration: buffer.duration };
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}

export type MachineSounds = {
  /** The classic 1 kHz beep. Resolves when it ends. */
  beep: () => Promise<void>;
  /** A plastic key clunk. */
  clunk: () => void;
  /** Tape squeal while rewinding. */
  squeal: (ms: number) => void;
  dispose: () => void;
};

export function createMachineSounds(): MachineSounds | null {
  const Ctx = ctxCtor();
  if (!Ctx) return null;
  let ctx: AudioContext | null = null;
  const get = () => {
    ctx ??= new Ctx();
    void ctx.resume();
    return ctx;
  };

  return {
    beep() {
      const c = get();
      const t = c.currentTime + 0.05;
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = 1000;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.setValueAtTime(0.16, t + 0.42);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.47);
      return new Promise((resolve) => (o.onended = () => resolve()));
    },
    clunk() {
      const c = get();
      const t = c.currentTime;
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.06);
      const g = c.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.1);
    },
    squeal(ms) {
      const c = get();
      const t = c.currentTime;
      const len = ms / 1000;
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(3200, t + len);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      bp.Q.value = 3;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.05);
      g.gain.setValueAtTime(0.035, t + len - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(bp).connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + len + 0.02);
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
