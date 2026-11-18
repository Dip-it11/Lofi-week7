"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createMachineSounds, pickMimeType, toWav, type MachineSounds } from "./tapeAudio";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type VoiceMessage = {
  id: string;
  /** Playable URL (an object URL for recordings made here). */
  url: string;
  /** Length in seconds. */
  duration: number;
  /** Unix ms. */
  createdAt: number;
  /** The recording itself (a WAV for recordings made here) — send this to your server. */
  blob?: Blob;
  mimeType?: string;
};

export type AnsweringMachinePalette = {
  /** Plastic body. */
  body: string;
  /** Keys. */
  keys: string;
  /** Red record light and counter digits. */
  led: string;
  /** Amber display text. */
  display: string;
};

export type AnsweringMachineProps = {
  /** The outgoing message printed on the machine (and spoken, with speakGreeting). */
  greeting?: string;
  /** Read the greeting aloud with the browser's speech voice before the beep. */
  speakGreeting?: boolean;
  /** Longest message in seconds — the tape runs out after this. */
  maxDuration?: number;
  /** Start with the beep, key clunks and rewind squeal on. */
  defaultSound?: boolean;
  /** Messages already on the tape. */
  initialMessages?: VoiceMessage[];
  /** Called when a new recording is saved. */
  onRecord?: (message: VoiceMessage) => void;
  /** Called when a message is deleted. */
  onDelete?: (message: VoiceMessage) => void;
  /** Adds a Send button to each message. Return a promise — a rejection shows "Not sent". */
  onSend?: (message: VoiceMessage) => Promise<void> | void;
  /** Name on the machine's badge. */
  brand?: string;
  palette?: Partial<AnsweringMachinePalette>;
  className?: string;
};

type Status =
  | "idle"
  | "requesting"
  | "greeting"
  | "beep"
  | "recording"
  | "saving"
  | "playing"
  | "paused"
  | "rewinding"
  | "denied"
  | "nomic"
  | "unsupported"
  | "error";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PALETTE: AnsweringMachinePalette = {
  body: "#3b1f66",
  keys: "#efe7d8",
  led: "#ff4d3d",
  display: "#ffb347",
};

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const TYPE = 'var(--font-typewriter), "Special Elite", "Courier New", monospace';

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const spoken = (s: number) => {
  const t = Math.max(1, Math.round(s));
  return t < 60 ? `${t} second${t === 1 ? "" : "s"}` : `${Math.floor(t / 60)} min ${t % 60} s`;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Clock helpers (only ever called from event handlers and animation frames). */
const clock = (): number => performance.now();
const stamp = () => Date.now();

function speak(text: string) {
  return new Promise<void>((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.cancel();
    synth.speak(u);
    setTimeout(resolve, 12000);
  });
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};
const SEG_RECTS: Record<string, [number, number, number, number]> = {
  a: [4, 1, 12, 3],
  b: [16, 4, 3, 12],
  c: [16, 18, 3, 12],
  d: [4, 30, 12, 3],
  e: [1, 18, 3, 12],
  f: [1, 4, 3, 12],
  g: [4, 15.5, 12, 3],
};

/** One red seven-segment digit. */
function Digit({ value }: { value: string }) {
  const on = SEGMENTS[value] ?? "";
  return (
    <svg viewBox="0 0 20 34" className="h-full w-auto" aria-hidden="true">
      {Object.entries(SEG_RECTS).map(([k, [x, y, w, h]]) => (
        <rect
          key={k}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="1.2"
          fill="var(--am-led)"
          opacity={on.includes(k) ? 1 : 0.12}
          style={on.includes(k) ? { filter: "drop-shadow(0 0 2px var(--am-led))" } : undefined}
        />
      ))}
    </svg>
  );
}

/** A tape reel: the hub spins, the brown tape pack grows or shrinks. */
function Reel({ cx, r, spin }: { cx: number; r: number; spin: "off" | "play" | "rev" }) {
  return (
    <g>
      <circle cx={cx} cy={60} r={r} fill="#3a2418" />
      <circle cx={cx} cy={60} r={r} fill="none" stroke="#5a3a28" strokeWidth="1" opacity=".7" />
      <circle cx={cx} cy={60} r={Math.max(12, r - 6)} fill="none" stroke="#000" strokeOpacity=".25" />
      <g
        className={spin === "off" ? undefined : "am-spin"}
        style={{ transformOrigin: `${cx}px 60px`, animationDuration: spin === "rev" ? ".28s" : "1.8s", animationDirection: spin === "rev" ? "reverse" : "normal" }}
      >
        <circle cx={cx} cy={60} r="12" fill="#e9e2f5" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect key={a} x={cx - 1.5} y={60 - 7.5} width="3" height="4" rx=".8" fill="#2a1c3a" transform={`rotate(${a} ${cx} 60)`} />
        ))}
        {[30, 150, 270].map((a) => (
          <circle key={a} cx={cx + 7 * Math.cos((a * Math.PI) / 180)} cy={60 + 7 * Math.sin((a * Math.PI) / 180)} r="2.4" fill="#2a1c3a" />
        ))}
        <circle cx={cx} cy={60} r="3" fill="#1a1024" />
      </g>
    </g>
  );
}

type KeyProps = {
  label: string;
  caption: string;
  onClick: () => void;
  disabled?: boolean;
  latched?: boolean;
  record?: boolean;
  children: ReactNode;
};

/** A chunky piano-style machine key. Latched keys stay pushed in. */
function Key({ label, caption, onClick, disabled, latched, record, children }: KeyProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={latched === undefined ? undefined : latched}
      onClick={onClick}
      disabled={disabled}
      className={`group flex h-16 flex-col items-center justify-center gap-1 rounded-xl border border-black/30 text-[10px] font-bold tracking-[0.18em] uppercase transition-[transform,box-shadow,filter] duration-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--am-display)] disabled:cursor-not-allowed disabled:opacity-45 @xl:h-[4.5rem] ${
        latched
          ? "translate-y-1 shadow-[0_1px_0_rgba(0,0,0,.45),inset_0_2px_6px_rgba(0,0,0,.35)]"
          : "shadow-[0_5px_0_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.6)] enabled:hover:brightness-105 enabled:active:translate-y-1 enabled:active:shadow-[0_1px_0_rgba(0,0,0,.45)]"
      } ${record ? "text-white" : "text-[#2a1c3a]"}`}
      style={{
        background: record
          ? "linear-gradient(180deg, color-mix(in srgb, var(--am-led) 70%, white), var(--am-led) 55%, color-mix(in srgb, var(--am-led) 70%, black))"
          : "linear-gradient(180deg, color-mix(in srgb, var(--am-keys) 60%, white), var(--am-keys) 55%, color-mix(in srgb, var(--am-keys) 82%, black))",
      }}
    >
      <span className="grid h-5 place-items-center" aria-hidden="true">
        {children}
      </span>
      <span aria-hidden="true">{caption}</span>
    </button>
  );
}

const ICON = "size-5";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** A voice recorder built as an 80s answering machine: real microphone recording, tape reels, VU meter and a tape log. */
export function AnsweringMachine({
  greeting = "Hi, you've reached Lofistack. Leave a message after the beep.",
  speakGreeting = false,
  maxDuration = 60,
  defaultSound = true,
  initialMessages,
  onRecord,
  onDelete,
  onSend,
  brand = "LOFISTACK",
  palette: paletteOverrides,
  className = "",
}: AnsweringMachineProps) {
  const palette = { ...DEFAULT_PALETTE, ...paletteOverrides };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = usePrefersReducedMotion();

  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>(() => initialMessages ?? []);
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const [currentId, setCurrentId] = useState<string | null>(() => initialMessages?.[0]?.id ?? null);
  const [elapsed, setElapsed] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [level, setLevel] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [sound, setSound] = useState(defaultSound);
  const [sendState, setSendState] = useState<Record<string, "sending" | "sent" | "error">>({});

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const meterCtxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<MachineSounds | null>(null);
  const recRaf = useRef(0);
  const playRaf = useRef(0);
  const runRef = useRef(0);
  const owned = useRef<Set<string>>(new Set());
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* Release the mic, timers, audio and object URLs on unmount. */
  useEffect(() => {
    const ownedIds = owned.current;
    const run = runRef;
    return () => {
      run.current++;
      cancelAnimationFrame(recRaf.current);
      cancelAnimationFrame(playRaf.current);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void meterCtxRef.current?.close();
      audioRef.current?.pause();
      sfxRef.current?.dispose();
      window.speechSynthesis?.cancel();
      messagesRef.current.forEach((m) => ownedIds.has(m.id) && URL.revokeObjectURL(m.url));
    };
  }, []);

  const sfx = () => {
    if (!sound) return null;
    sfxRef.current ??= createMachineSounds();
    return sfxRef.current;
  };
  const clunk = () => sfx()?.clunk();
  const audio = () => (audioRef.current ??= new Audio());

  const current = messages.find((m) => m.id === currentId) ?? null;
  const recordingish = status === "requesting" || status === "greeting" || status === "beep" || status === "recording";
  const errorish = status === "denied" || status === "nomic" || status === "unsupported" || status === "error";

  /* ---------- Recording ---------- */

  const releaseMic = () => {
    cancelAnimationFrame(recRaf.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void meterCtxRef.current?.close();
    meterCtxRef.current = null;
    setLevel(0);
  };

  const finish = async (mime: string, measured: number) => {
    releaseMic();
    setStatus("saving");
    const raw = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    const wav = await toWav(raw);
    const blob = wav?.blob ?? raw;
    const duration = wav?.duration ?? measured;
    if (duration < 0.4) {
      setStatus("idle");
      setNotice("TOO SHORT");
      setAnnounce("That was too short — nothing was saved.");
      return;
    }
    const m: VoiceMessage = { id: `msg-${stamp()}`, url: URL.createObjectURL(blob), blob, duration, createdAt: stamp(), mimeType: blob.type };
    owned.current.add(m.id);
    setMessages((prev) => [...prev, m]);
    setNewIds((prev) => new Set(prev).add(m.id));
    setCurrentId(m.id);
    setPlayTime(0);
    setStatus("idle");
    setAnnounce(`Message saved, ${spoken(duration)}. Press play to listen.`);
    onRecord?.(m);
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state === "recording") {
      cancelAnimationFrame(recRaf.current);
      rec.stop(); // onstop → finish()
      return;
    }
    // Still asking for the mic, greeting or beeping: cancel.
    runRef.current++;
    window.speechSynthesis?.cancel();
    releaseMic();
    setStatus("idle");
    setAnnounce("Recording cancelled.");
  };

  const record = async () => {
    if (recordingish || status === "saving") return;
    stopPlayback(true);
    setNotice(null);
    clunk();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      setAnnounce("This browser can't record audio.");
      return;
    }
    const run = ++runRef.current;
    setStatus("requesting");
    setAnnounce("Asking for microphone access.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      if (run !== runRef.current) return;
      const name = (err as DOMException | undefined)?.name;
      const next: Status = name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "nomic" : "error";
      setStatus(next);
      setAnnounce(next === "denied" ? "Microphone access is blocked." : next === "nomic" ? "No microphone found." : "The microphone couldn't start.");
      return;
    }
    if (run !== runRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = stream;

    if (speakGreeting) {
      setStatus("greeting");
      await speak(greeting);
      if (run !== runRef.current) return;
    }
    setStatus("beep");
    const s = sfx();
    if (s) await s.beep();
    else await wait(200);
    if (run !== runRef.current) return;

    // Level meter
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    meterCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    const mime = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      releaseMic();
      setStatus("unsupported");
      return;
    }
    const t0 = clock();
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => void finish(rec.mimeType || mime || "audio/webm", (clock() - t0) / 1000);
    recorderRef.current = rec;
    rec.start(250);
    setElapsed(0);
    setStatus("recording");
    setAnnounce("Recording. Press stop when you're done.");

    const tick = () => {
      const e = (clock() - t0) / 1000;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4.5));
      setElapsed(Math.min(e, maxDuration));
      if (e >= maxDuration) {
        setNotice("TAPE FULL");
        stopRecording();
        return;
      }
      recRaf.current = requestAnimationFrame(tick);
    };
    recRaf.current = requestAnimationFrame(tick);
  };

  /* ---------- Playback ---------- */

  function stopPlayback(rewind: boolean) {
    const a = audioRef.current;
    cancelAnimationFrame(playRaf.current);
    if (!a) return;
    a.pause();
    if (rewind) {
      a.currentTime = 0;
      setPlayTime(0);
    }
    setStatus((s) => (s === "playing" || s === "paused" || s === "rewinding" ? "idle" : s));
  }

  const load = (m: VoiceMessage) => {
    const a = audio();
    if (a.dataset.id !== m.id) {
      a.src = m.url;
      a.dataset.id = m.id;
      setPlayTime(0);
    }
    return a;
  };

  const play = (id?: string) => {
    const m = messages.find((x) => x.id === (id ?? currentId)) ?? messages.find((x) => newIds.has(x.id)) ?? messages[0];
    if (!m || recordingish) return;
    setNotice(null);
    const a = load(m);
    if (id && id !== currentId) a.currentTime = 0;
    a.onended = () => {
      cancelAnimationFrame(playRaf.current);
      a.currentTime = 0;
      setPlayTime(0);
      setStatus("idle");
      setAnnounce("End of message.");
    };
    clunk();
    a.play().catch(() => {
      setStatus("error");
      setAnnounce("This message can't be played.");
    });
    setCurrentId(m.id);
    setStatus("playing");
    setNewIds((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });
    setAnnounce(`Playing message ${messages.indexOf(m) + 1}.`);
    cancelAnimationFrame(playRaf.current);
    const tick = () => {
      setPlayTime(a.currentTime);
      playRaf.current = requestAnimationFrame(tick);
    };
    playRaf.current = requestAnimationFrame(tick);
  };

  const pause = () => {
    clunk();
    audioRef.current?.pause();
    cancelAnimationFrame(playRaf.current);
    setStatus("paused");
    setAnnounce("Paused.");
  };

  const stop = () => {
    clunk();
    if (recordingish) stopRecording();
    else stopPlayback(true);
  };

  const rewind = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    const wasPlaying = status === "playing";
    a.pause();
    cancelAnimationFrame(playRaf.current);
    const from = a.currentTime;
    const done = () => {
      a.currentTime = 0;
      setPlayTime(0);
      if (wasPlaying) play(current.id);
      else setStatus("idle");
    };
    if (reduced || from < 0.15) return done();
    setStatus("rewinding");
    setAnnounce("Rewinding.");
    const ms = Math.min(900, 300 + from * 40);
    sfx()?.squeal(ms);
    const t0 = clock();
    const tick = () => {
      const k = Math.min(1, (clock() - t0) / ms);
      setPlayTime(from * (1 - k));
      if (k < 1) playRaf.current = requestAnimationFrame(tick);
      else done();
    };
    playRaf.current = requestAnimationFrame(tick);
  };

  const seek = (v: number) => {
    if (!current) return;
    const a = load(current);
    a.currentTime = v;
    setPlayTime(v);
  };

  /* ---------- Tape log ---------- */

  const remove = (m: VoiceMessage) => {
    if (currentId === m.id) {
      stopPlayback(true);
      if (audioRef.current) {
        audioRef.current.removeAttribute("src");
        delete audioRef.current.dataset.id;
      }
      setCurrentId(null);
    }
    if (owned.current.has(m.id)) {
      URL.revokeObjectURL(m.url);
      owned.current.delete(m.id);
    }
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setNewIds((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });
    setAnnounce("Message deleted.");
    onDelete?.(m);
  };

  const send = async (m: VoiceMessage) => {
    if (!onSend) return;
    setSendState((s) => ({ ...s, [m.id]: "sending" }));
    try {
      await onSend(m);
      setSendState((s) => ({ ...s, [m.id]: "sent" }));
      setAnnounce("Message sent.");
    } catch {
      setSendState((s) => ({ ...s, [m.id]: "error" }));
      setAnnounce("Message not sent. Try again.");
    }
  };

  /* ---------- Display ---------- */

  const dur = current?.duration ?? 0;
  const p = status === "recording" || status === "beep" ? elapsed / maxDuration : dur ? Math.min(1, playTime / dur) : 0;
  const R_MIN = 15;
  const R_MAX = 44;
  const radius = (frac: number) => Math.sqrt(R_MIN ** 2 + (R_MAX ** 2 - R_MIN ** 2) * Math.max(0, Math.min(1, frac)));
  const leftR = radius(1 - p);
  const rightR = radius(p);
  const spin: "off" | "play" | "rev" = reduced ? "off" : status === "recording" || status === "playing" ? "play" : status === "rewinding" ? "rev" : "off";

  const screen: Record<Status, string> = {
    idle: notice ?? (messages.length ? "READY" : "NO MESSAGES"),
    requesting: "ALLOW MIC…",
    greeting: "GREETING",
    beep: "BEEP!",
    recording: "● REC",
    saving: "SAVING TAPE",
    playing: "▶ PLAY",
    paused: "❚❚ PAUSE",
    rewinding: "◀◀ REWIND",
    denied: "MIC BLOCKED",
    nomic: "NO MIC FOUND",
    unsupported: "NOT SUPPORTED",
    error: "ERROR",
  };
  const timeText =
    status === "recording" ? `${fmt(elapsed)} / ${fmt(maxDuration)}` : current && !recordingish ? `${fmt(playTime)} / ${fmt(dur)}` : `00:00 / ${fmt(maxDuration)}`;

  const help: Partial<Record<Status, string>> = {
    denied: "Microphone access is blocked for this site. Allow it from the site settings next to the address bar, then press REC again.",
    nomic: "No microphone was found. Plug one in (or check your system settings) and press REC again.",
    unsupported: "This browser can't record audio. Try a recent Chrome, Edge, Firefox or Safari.",
    error: "Something went wrong with the microphone or tape. Press REC to try again.",
  };

  const count = String(Math.min(99, messages.length)).padStart(2, "0");
  const LEVEL_BARS = 10;

  const style = {
    "--am-body": palette.body,
    "--am-keys": palette.keys,
    "--am-led": palette.led,
    "--am-display": palette.display,
  } as CSSProperties;

  return (
    <section style={style} className={`am @container w-full ${className}`} aria-label="Voice message recorder">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @3xl:gap-6">
        {/* ================= Machine ================= */}
        <div
          className="rounded-[26px] border border-black/40 p-3.5 shadow-[0_30px_50px_-28px_rgba(20,6,40,.9)] @xl:p-5"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--am-body) 70%, white) 0, var(--am-body) 6%, var(--am-body) 88%, color-mix(in srgb, var(--am-body) 65%, black))",
          }}
        >
          {/* badge row */}
          <div className="mb-3 flex items-center gap-2.5">
            <span className="rounded-md bg-black/25 px-2.5 py-1 text-[10px] font-bold tracking-[0.3em] text-[var(--am-keys)] shadow-[inset_0_1px_2px_rgba(0,0,0,.5)]" style={{ fontFamily: MONO }}>
              {brand}
              <span className="hidden @md:inline"> · PHONE-MATE</span>
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-white/60" style={{ fontFamily: MONO }}>
              <span
                aria-hidden="true"
                className={`size-2.5 rounded-full ${newIds.size ? `bg-[var(--am-led)] ${reduced ? "" : "am-blink"}` : "bg-black/40"}`}
                style={newIds.size ? { boxShadow: "0 0 8px var(--am-led)" } : undefined}
              />
              NEW
            </span>
            <button
              type="button"
              aria-pressed={sound}
              aria-label={sound ? "Turn machine sounds off" : "Turn machine sounds on"}
              onClick={() => setSound((v) => !v)}
              className={`grid size-8 place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--am-display)] active:scale-90 ${
                sound ? "bg-[var(--am-display)] text-[#2a1c3a]" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5z" />
                {sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
              </svg>
            </button>
          </div>

          {/* cassette window */}
          <div className="relative overflow-hidden rounded-2xl border-4 border-black/35 bg-[#130a1d] shadow-[inset_0_6px_16px_rgba(0,0,0,.8)]">
            <svg viewBox="0 0 300 120" className="block w-full" aria-hidden="true">
              <rect x="40" y="20" width="220" height="80" rx="40" fill="#1f1430" />
              <path
                d={`M ${80 - leftR * 0.2} ${60 + leftR} L 128 108 L 172 108 L ${220 + rightR * 0.2} ${60 + rightR}`}
                fill="none"
                stroke="#3a2418"
                strokeWidth="2"
              />
              <rect x="134" y="102" width="32" height="12" rx="2" fill="#8d8799" />
              <Reel cx={80} r={leftR} spin={spin} />
              <Reel cx={220} r={rightR} spin={spin} />
            </svg>
            {/* tape label */}
            <span
              className="absolute top-2 left-1/2 -translate-x-1/2 rounded-sm bg-[#f4ecd8] px-2.5 py-0.5 text-[9px] tracking-[0.25em] whitespace-nowrap text-[#2a1c3a] uppercase shadow"
              style={{ fontFamily: TYPE }}
            >
              Incoming · Side A
            </span>
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.14),transparent_35%,transparent_70%,rgba(255,255,255,.06))]" />
          </div>

          {/* greeting card */}
          <p className="mt-3 rounded-md bg-[#f4ecd8] px-3 py-2 text-[12px] leading-snug text-[#2a1c3a] shadow-[0_2px_0_rgba(0,0,0,.3)] @xl:text-[13px]" style={{ fontFamily: TYPE }}>
            <span className="text-[#b0342b]">OGM ▸ </span>“{greeting}”
          </p>

          {/* display */}
          <div className="mt-3 flex items-stretch gap-3 rounded-xl border-2 border-black/50 bg-[#1a0d0a] p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,.8)] @xl:p-3">
            <div className="flex flex-col items-center justify-center">
              <div className={`flex h-9 gap-1 @xl:h-11 ${newIds.size && !reduced ? "am-blink-slow" : ""}`} aria-hidden="true">
                <Digit value={count[0]} />
                <Digit value={count[1]} />
              </div>
              <span className="mt-1 text-[8px] tracking-[0.3em] text-white/45" style={{ fontFamily: MONO }}>
                MSG
              </span>
              <span className="sr-only">{messages.length} messages</span>
            </div>
            <div className="min-w-0 flex-1 border-l border-white/10 pl-3" style={{ fontFamily: MONO }}>
              <p className={`truncate text-[13px] font-bold tracking-[0.15em] text-[var(--am-display)] [text-shadow:0_0_6px_var(--am-display)] @xl:text-sm ${errorish ? "!text-[var(--am-led)] [text-shadow:0_0_6px_var(--am-led)]" : ""}`}>
                {screen[status]}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.08em] whitespace-nowrap text-[var(--am-display)]/70 tabular-nums @xl:text-[12px] @xl:tracking-[0.12em]">{timeText}</p>
            </div>
            {/* VU meter */}
            <div className="flex items-end gap-[3px]" aria-hidden="true">
              {Array.from({ length: LEVEL_BARS }, (_, i) => {
                const lit = status === "recording" && level * LEVEL_BARS > i;
                const color = i >= 8 ? "var(--am-led)" : i >= 6 ? "var(--am-display)" : "#4ade80";
                return (
                  <span
                    key={i}
                    className="w-1.5 rounded-[1px] transition-opacity duration-75 @xl:w-2"
                    style={{ height: `${10 + i * 3.2}px`, background: color, opacity: lit ? 1 : 0.15, boxShadow: lit ? `0 0 6px ${color}` : undefined }}
                  />
                );
              })}
            </div>
          </div>

          {/* tape position */}
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor={`${uid}-seek`} className="text-[9px] font-bold tracking-[0.25em] whitespace-nowrap text-white/55 uppercase" style={{ fontFamily: MONO }}>
              Tape
            </label>
            <input
              id={`${uid}-seek`}
              type="range"
              min={0}
              max={Math.max(0.1, dur)}
              step={0.05}
              value={Math.min(playTime, dur || 0)}
              disabled={!current || recordingish || status === "rewinding"}
              onChange={(e) => seek(Number(e.target.value))}
              aria-valuetext={`${spoken(playTime)} of ${spoken(dur)}`}
              className="am-range h-6 flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          {/* keys */}
          <div className="mt-3 grid grid-cols-4 gap-2 @xl:gap-3">
            <Key label="Rewind" caption="Rew" onClick={rewind} disabled={!current || recordingish || status === "saving" || status === "rewinding" || (playTime < 0.05 && status !== "playing")}>
              <svg viewBox="0 0 24 24" className={ICON} fill="currentColor" aria-hidden="true">
                <path d="M11 6v12L2.5 12 11 6Zm10 0v12l-8.5-6L21 6Z" />
              </svg>
            </Key>
            <Key
              label={status === "playing" ? "Pause" : current && newIds.has(current.id) ? "Play new message" : "Play message"}
              caption={status === "playing" ? "Pause" : "Play"}
              latched={status === "playing"}
              onClick={() => (status === "playing" ? pause() : play())}
              disabled={!messages.length || recordingish || status === "saving" || status === "rewinding"}
            >
              {status === "playing" ? (
                <svg viewBox="0 0 24 24" className={ICON} fill="currentColor" aria-hidden="true">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className={ICON} fill="currentColor" aria-hidden="true">
                  <path d="M7 5v14l12-7L7 5Z" />
                </svg>
              )}
            </Key>
            <Key label="Stop" caption="Stop" onClick={stop} disabled={!(recordingish || status === "playing" || status === "paused" || status === "rewinding")}>
              <svg viewBox="0 0 24 24" className={ICON} fill="currentColor" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            </Key>
            <Key label={recordingish ? "Recording" : "Record a message"} caption="Rec" record latched={recordingish} onClick={() => void record()} disabled={status === "saving"}>
              <span className={`size-4 rounded-full bg-white ${status === "recording" && !reduced ? "am-blink" : ""}`} />
            </Key>
          </div>

          {errorish && (
            <div role="alert" className="mt-3 rounded-lg border border-[var(--am-led)]/50 bg-black/30 p-3 text-[13px] leading-snug text-white/90">
              {help[status]}
            </div>
          )}
        </div>

        {/* ================= Tape log ================= */}
        <div className="flex min-h-[14rem] flex-col rounded-[22px] border border-[#e6dcc6] bg-[#fbf8f1] p-4 text-[#2a1c3a] shadow-[0_18px_30px_-24px_rgba(20,6,40,.6)] @xl:p-5">
          <div className="flex items-baseline justify-between gap-2 border-b border-dashed border-[#2a1c3a]/25 pb-2">
            <h3 className="text-lg leading-none tracking-[0.08em] uppercase" style={{ fontFamily: TYPE }}>
              Tape log
            </h3>
            <span className="text-[11px] tracking-[0.15em] text-[#2a1c3a]/60 uppercase" style={{ fontFamily: MONO }}>
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <svg viewBox="0 0 48 32" className="h-8 w-12 text-[#2a1c3a]/30" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="2" width="44" height="28" rx="4" />
                <circle cx="15" cy="15" r="5" />
                <circle cx="33" cy="15" r="5" />
              </svg>
              <p className="text-sm" style={{ fontFamily: TYPE }}>
                The tape is empty.
              </p>
              <p className="max-w-[16rem] text-xs text-[#2a1c3a]/60">Press REC, wait for the beep and leave a message.</p>
            </div>
          ) : (
            <ol role="list" className="mt-2 flex flex-col gap-1.5">
              {messages.map((m, i) => {
                const isCurrent = m.id === currentId;
                const sent = sendState[m.id];
                const ext = m.mimeType?.includes("wav") ? "wav" : m.mimeType?.includes("mp4") ? "m4a" : m.mimeType?.includes("ogg") ? "ogg" : "webm";
                const time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <li
                    key={m.id}
                    className={`relative overflow-hidden rounded-lg border px-2.5 py-2 transition ${isCurrent ? "border-[#2a1c3a]/40 bg-white" : "border-transparent hover:bg-white/70"}`}
                  >
                    {isCurrent && dur > 0 && (
                      <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[var(--am-display)]/15" style={{ width: `${Math.min(100, (playTime / dur) * 100)}%` }} />
                    )}
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (isCurrent && status === "playing" ? pause() : play(m.id))}
                        disabled={recordingish || status === "saving"}
                        aria-label={isCurrent && status === "playing" ? `Pause message ${i + 1}` : `Play message ${i + 1}`}
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2a1c3a] text-[#fbf8f1] transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a1c3a] active:scale-90 disabled:opacity-40"
                      >
                        {isCurrent && status === "playing" ? (
                          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
                            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="size-3.5 translate-x-px" fill="currentColor" aria-hidden="true">
                            <path d="M7 5v14l12-7L7 5Z" />
                          </svg>
                        )}
                      </button>
                      <div className="min-w-0 flex-1" style={{ fontFamily: MONO }}>
                        <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-wide">
                          #{String(i + 1).padStart(2, "0")}
                          {newIds.has(m.id) && <span className="rounded bg-[var(--am-led)] px-1 text-[9px] tracking-[0.15em] text-white">NEW</span>}
                        </p>
                        <p className="truncate text-[11px] text-[#2a1c3a]/60">
                          {fmt(m.duration)} · {time}
                        </p>
                      </div>
                      {onSend && (
                        <button
                          type="button"
                          onClick={() => void send(m)}
                          disabled={sent === "sending" || sent === "sent"}
                          aria-busy={sent === "sending" || undefined}
                          className={`h-8 shrink-0 rounded-md border px-2 text-[10px] font-bold tracking-[0.12em] uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a1c3a] ${
                            sent === "sent"
                              ? "border-emerald-600/40 bg-emerald-50 text-emerald-800"
                              : sent === "error"
                                ? "border-[var(--am-led)]/60 bg-red-50 text-red-800 hover:bg-red-100"
                                : "border-[#2a1c3a]/30 hover:bg-[#2a1c3a] hover:text-white disabled:opacity-60"
                          }`}
                        >
                          {sent === "sending" ? "Sending…" : sent === "sent" ? "✓ Sent" : sent === "error" ? "Retry" : "Send"}
                        </button>
                      )}
                      <a
                        href={m.url}
                        download={`message-${String(i + 1).padStart(2, "0")}.${ext}`}
                        aria-label={`Download message ${i + 1}`}
                        className="grid size-8 shrink-0 place-items-center rounded-md text-[#2a1c3a]/70 transition hover:bg-[#2a1c3a]/10 hover:text-[#2a1c3a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2a1c3a]"
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14" />
                        </svg>
                      </a>
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        disabled={isCurrent && recordingish}
                        aria-label={`Delete message ${i + 1}`}
                        className="grid size-8 shrink-0 place-items-center rounded-md text-[#2a1c3a]/70 transition hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2a1c3a] active:scale-90"
                      >
                        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-auto pt-4 text-[11px] leading-snug text-[#2a1c3a]/55">
            Recordings stay in this browser until you send or download them. Nothing is uploaded on its own.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes am-spin { to { transform: rotate(360deg) } }
        .am .am-spin { animation: am-spin linear infinite; }
        @keyframes am-blink { 50% { opacity: .2 } }
        .am .am-blink { animation: am-blink .9s steps(2) infinite; }
        .am .am-blink-slow { animation: am-blink 1.4s steps(2) infinite; }
        .am .am-range { accent-color: var(--am-display); }
      `}</style>
    </section>
  );
}

export default AnsweringMachine;
