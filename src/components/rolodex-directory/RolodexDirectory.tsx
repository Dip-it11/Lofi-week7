"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createRolodexSound, type RolodexSound } from "./rolodexSound";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type RolodexPerson = {
  id?: string;
  name: string;
  role: string;
  /** Used for the team filter chips. */
  team?: string;
  email?: string;
  phone?: string;
  /** City or place, e.g. "Lisbon". */
  location?: string;
  /** IANA time zone, e.g. "Europe/Lisbon" — shows their local time. */
  timezone?: string;
  /** Photo URL. Without one, initials are stamped on the card. */
  photo?: string;
  links?: { label: string; href: string }[];
  /** A short handwritten-style note on the back. */
  note?: string;
};

export type RolodexPalette = {
  /** Base, knobs and rail trim. */
  base: string;
  /** Index cards. */
  card: string;
  /** Text on the cards. */
  ink: string;
  /** Highlights (current tab, focus). */
  accent: string;
};

export type RolodexDirectoryProps = {
  people: RolodexPerson[];
  /** Heading and accessible name. */
  title?: string;
  /** Show the search box. */
  searchable?: boolean;
  /** Start with card flick sounds on. */
  defaultSound?: boolean;
  /** Called when the wheel settles on a person. */
  onSelect?: (person: RolodexPerson) => void;
  palette?: Partial<RolodexPalette>;
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PALETTE: RolodexPalette = {
  base: "#351367",
  card: "#fdf8ee",
  ink: "#2b2238",
  accent: "#ffb347",
};

const TYPE = 'var(--font-typewriter), "Special Elite", "Courier New", monospace';
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';

const STEP = 11; // degrees each upcoming card leans back
const FALL = 78; // degrees the front card falls forward over one step
const PX_PER_CARD = 56; // drag distance for one card
const AXIS = 46; // px from card bottom down to the rail
const VISIBLE = 8; // cards rendered at once

const mod = (a: number, n: number) => ((a % n) + n) % n;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clock = (): number => performance.now();
const AVATAR_COLORS = ["#7c3aed", "#db2777", "#0d9488", "#ea580c", "#2563eb", "#65a30d", "#b45309", "#9333ea"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
const letterOf = (p: RolodexPerson) => (p.name.trim()[0] ?? "#").toUpperCase();

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

function localTime(tz: string | undefined, now: number | null) {
  if (!tz || now === null) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(now);
    const hour = Number(parts.slice(0, 2));
    return { text: parts, day: hour >= 7 && hour < 19 };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* One card                                                            */
/* ------------------------------------------------------------------ */

type CardProps = {
  person: RolodexPerson;
  index: number;
  total: number;
  d: number;
  front: boolean;
  flipped: boolean;
  now: number | null;
  copied: boolean;
  onFlip: () => void;
  onCopy: (email: string) => void;
};

function Card({ person, index, total, d, front, flipped, now, copied, onFlip, onCopy }: CardProps) {
  const angle = d >= 0 ? d * STEP : d * FALL;
  const opacity = Math.max(0, Math.min(1, d < 0 ? 1 + d * 1.25 : VISIBLE - 1 - d));
  const shade = d > 0 ? Math.min(0.5, d * 0.09) : 0;
  const letter = letterOf(person);
  const tabLeft = 6 + ((letter.charCodeAt(0) - 65 + 26) % 6) * 14;
  const color = AVATAR_COLORS[hash(person.name) % AVATAR_COLORS.length];
  const time = localTime(person.timezone, now);

  return (
    <div
      aria-hidden={!front}
      inert={!front}
      role={front ? "group" : undefined}
      aria-roledescription={front ? "card" : undefined}
      aria-label={front ? `${index + 1} of ${total}: ${person.name}, ${person.role}` : undefined}
      className="absolute inset-x-0 mx-auto aspect-[1.72] w-[min(100%,24rem)] [transform-style:preserve-3d]"
      style={{
        bottom: "var(--rx-card-bottom)",
        transform: `rotateX(${angle}deg)`,
        transformOrigin: `50% calc(100% + ${AXIS}px)`,
        opacity,
        zIndex: 100 - Math.round(Math.abs(d) * 10),
        pointerEvents: front ? "auto" : "none",
      }}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 ease-[cubic-bezier(.3,1.3,.5,1)] [transform-style:preserve-3d] motion-reduce:transition-none ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
      >
        {/* ---------- front ---------- */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          {/* index tab */}
          <span
            aria-hidden="true"
            className="absolute -top-5 h-6 w-10 rounded-t-md border border-b-0 border-black/10 pt-0.5 text-center text-sm font-bold"
            style={{ left: `${tabLeft}%`, background: front ? "var(--rx-accent)" : "var(--rx-card)", color: "var(--rx-ink)", fontFamily: TYPE }}
          >
            {letter}
          </span>
          <div
            onClick={front ? onFlip : undefined}
            className="relative flex h-full w-full cursor-pointer gap-3 overflow-hidden rounded-md border border-black/15 bg-[var(--rx-card)] p-3.5 text-[var(--rx-ink)] shadow-[0_1px_0_rgba(255,255,255,.8)_inset,0_10px_20px_-12px_rgba(20,6,40,.6)] @md:gap-4 @md:p-5"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 23px, rgba(80,120,200,.12) 23px 24px)", backgroundPosition: "0 34px" }}
          >
            {/* red margin line */}
            <span aria-hidden="true" className="absolute top-0 bottom-0 left-[4.6rem] w-px bg-[#e05a4f]/35 @md:left-[6.2rem]" />
            {person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photo}
                alt=""
                className="size-14 shrink-0 rotate-[-3deg] rounded-sm border-[3px] border-white object-cover shadow @md:size-[4.5rem]"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-14 shrink-0 rotate-[-3deg] place-items-center rounded-sm border-[3px] border-white text-lg font-bold text-white shadow @md:size-[4.5rem] @md:text-2xl"
                style={{ background: color, fontFamily: TYPE }}
              >
                {initials(person.name)}
              </span>
            )}
            <div className="relative min-w-0 flex-1 pl-1">
              <p className="truncate text-lg leading-tight @md:text-2xl" style={{ fontFamily: TYPE }}>
                {person.name}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-[var(--rx-ink)]/75 @md:text-sm">{person.role}</p>
              {person.team && (
                <span className="mt-1.5 inline-block rounded-sm border border-[var(--rx-ink)]/25 px-1.5 text-[10px] tracking-[0.15em] uppercase" style={{ fontFamily: MONO }}>
                  {person.team}
                </span>
              )}
              {(person.location || time) && (
                <p className="mt-1.5 truncate text-[12px] text-[var(--rx-ink)]/70" style={{ fontFamily: MONO }}>
                  {person.location}
                  {time && (
                    <>
                      {person.location ? " · " : ""}
                      <span aria-hidden="true">{time.day ? "☀" : "☾"} </span>
                      {time.text}
                      <span className="sr-only"> local time</span>
                    </>
                  )}
                </p>
              )}
            </div>
            {front && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                aria-label={`Show contact details for ${person.name}`}
                className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-full text-[var(--rx-ink)]/60 transition hover:bg-[var(--rx-ink)]/10 hover:text-[var(--rx-ink)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--rx-ink)]"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
                </svg>
              </button>
            )}
            {/* rail slots */}
            <span aria-hidden="true" className="absolute bottom-0 left-[30%] h-3 w-6 rounded-t-full bg-[var(--rx-base)]/80" />
            <span aria-hidden="true" className="absolute right-[30%] bottom-0 h-3 w-6 rounded-t-full bg-[var(--rx-base)]/80" />
            {/* depth shading */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#1d1430]" style={{ opacity: shade }} />
          </div>
        </div>

        {/* ---------- back ---------- */}
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]" inert={!flipped}>
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-md border border-black/15 bg-[var(--rx-card)] p-3.5 text-[var(--rx-ink)] shadow-[0_10px_20px_-12px_rgba(20,6,40,.6)] @md:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-base @md:text-lg" style={{ fontFamily: TYPE }}>
                {person.name}
              </p>
              <button
                type="button"
                onClick={onFlip}
                aria-label="Flip the card back"
                className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-[var(--rx-ink)]/60 transition hover:bg-[var(--rx-ink)]/10 hover:text-[var(--rx-ink)] focus-visible:outline-2 focus-visible:outline-[var(--rx-ink)]"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
                </svg>
              </button>
            </div>
            <dl className="mt-1 grid flex-1 grid-cols-[auto_minmax(0,1fr)] content-start gap-x-3 gap-y-1 text-[12px] @md:text-[13px]" style={{ fontFamily: MONO }}>
              {person.email && (
                <>
                  <dt className="text-[var(--rx-ink)]/55">Email</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    <a href={`mailto:${person.email}`} className="truncate underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-[var(--rx-ink)]">
                      {person.email}
                    </a>
                    <button
                      type="button"
                      onClick={() => onCopy(person.email!)}
                      className="shrink-0 rounded border border-[var(--rx-ink)]/25 px-1.5 text-[10px] tracking-wider uppercase transition hover:bg-[var(--rx-ink)] hover:text-[var(--rx-card)] focus-visible:outline-2 focus-visible:outline-[var(--rx-ink)]"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </dd>
                </>
              )}
              {person.phone && (
                <>
                  <dt className="text-[var(--rx-ink)]/55">Phone</dt>
                  <dd className="truncate">
                    <a href={`tel:${person.phone.replace(/[^+\d]/g, "")}`} className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
                      {person.phone}
                    </a>
                  </dd>
                </>
              )}
              {time && (
                <>
                  <dt className="text-[var(--rx-ink)]/55">Local</dt>
                  <dd className="truncate">
                    {time.text} {time.day ? "· working hours" : "· probably asleep"}
                  </dd>
                </>
              )}
            </dl>
            {person.links && person.links.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {person.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-sm bg-[var(--rx-ink)] px-2 py-0.5 text-[11px] text-[var(--rx-card)] transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--rx-ink)]"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
            {person.note && (
              <p className="mt-1.5 truncate text-[13px] text-[#b0342b]" style={{ fontFamily: TYPE }}>
                “{person.note}”
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Directory                                                           */
/* ------------------------------------------------------------------ */

/** A team directory you spin like a desk Rolodex: drag, scroll or use the keys, jump by letter, search, and flip a card for contact details. */
export function RolodexDirectory({
  people,
  title = "Team directory",
  searchable = true,
  defaultSound = false,
  onSelect,
  palette: paletteOverrides,
  className = "",
}: RolodexDirectoryProps) {
  const palette = { ...DEFAULT_PALETTE, ...paletteOverrides };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = usePrefersReducedMotion();

  const [team, setTeam] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [matchAt, setMatchAt] = useState(0);
  const [sound, setSound] = useState(defaultSound);
  const [announce, setAnnounce] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const animRef = useRef(0);
  const sfxRef = useRef<RolodexSound | null>(null);
  const soundRef = useRef(sound);
  const drag = useRef<{ y: number; p0: number; moved: boolean; samples: { t: number; y: number }[]; id: number } | null>(null);
  const wheelAcc = useRef(0);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  /* Local clocks tick every 30 s. */
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const iv = setInterval(tick, 30000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(animRef.current);
      sfxRef.current?.dispose();
    },
    [],
  );

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  const list = team ? sorted.filter((p) => p.team === team) : sorted;
  const N = list.length;
  const teams = [...new Set(people.map((p) => p.team).filter((t): t is string => !!t))];
  const frontIdx = N ? mod(Math.round(pos), N) : -1;
  const front = N ? list[frontIdx] : undefined;
  const personId = (p: RolodexPerson) => p.id ?? p.name;

  const sfx = () => {
    if (!soundRef.current) return null;
    sfxRef.current ??= createRolodexSound();
    return sfxRef.current;
  };

  const writePos = (v: number) => {
    const before = Math.round(posRef.current);
    posRef.current = v;
    if (Math.round(v) !== before) sfx()?.flick();
    setPos(v);
  };

  const settle = (target: number) => {
    if (!N) return;
    const p = list[mod(target, N)];
    setAnnounce(`${mod(target, N) + 1} of ${N}: ${p.name}, ${p.role}`);
    onSelect?.(p);
  };

  /** Spin to an absolute wheel position (can be any integer — the wheel loops). */
  const animateTo = (target: number) => {
    cancelAnimationFrame(animRef.current);
    targetRef.current = target;
    setFlipped(null);
    const from = posRef.current;
    const dist = target - from;
    if (reduced || Math.abs(dist) < 0.001) {
      writePos(target);
      settle(target);
      return;
    }
    const dur = Math.min(1400, 260 + Math.abs(dist) * 85);
    const t0 = clock();
    const step = () => {
      const k = Math.min(1, (clock() - t0) / dur);
      writePos(from + dist * ease(k));
      if (k < 1) animRef.current = requestAnimationFrame(step);
      else settle(target);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const spinBy = (delta: number) => animateTo(Math.round(targetRef.current) + delta);

  /** Spin the shortest way round to a card index. */
  const spinTo = (index: number) => {
    if (!N) return;
    const cur = Math.round(targetRef.current);
    let delta = index - mod(cur, N);
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    animateTo(cur + delta);
  };

  const flip = () => {
    if (!front) return;
    sfx()?.flip();
    setFlipped((f) => (f === personId(front) ? null : personId(front)));
  };

  /* ---------- Drag with momentum ---------- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!N || (e.target as HTMLElement).closest("a,button,input")) return;
    cancelAnimationFrame(animRef.current);
    drag.current = { y: e.clientY, p0: posRef.current, moved: false, samples: [{ t: e.timeStamp, y: e.clientY }], id: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) > 5) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setFlipped(null);
    }
    if (!d.moved) return;
    d.samples.push({ t: e.timeStamp, y: e.clientY });
    if (d.samples.length > 6) d.samples.shift();
    writePos(d.p0 + dy / PX_PER_CARD);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.moved) return;
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0; // px per ms
    animateTo(Math.round(posRef.current + (v * 260) / PX_PER_CARD));
  };

  /* ---------- Mouse wheel / trackpad ---------- */
  const spinByRef = useRef(spinBy);
  useEffect(() => {
    spinByRef.current = spinBy;
  });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      wheelAcc.current += e.deltaY;
      while (Math.abs(wheelAcc.current) >= 50) {
        const dir = Math.sign(wheelAcc.current);
        wheelAcc.current -= dir * 50;
        spinByRef.current(dir);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- Keyboard ---------- */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!N || e.target !== e.currentTarget) return;
    const k = e.key;
    if (k === "ArrowDown" || k === "ArrowRight") spinBy(1);
    else if (k === "ArrowUp" || k === "ArrowLeft") spinBy(-1);
    else if (k === "PageDown") spinBy(5);
    else if (k === "PageUp") spinBy(-5);
    else if (k === "Home") spinTo(0);
    else if (k === "End") spinTo(N - 1);
    else if (k === "Enter" || k === " ") flip();
    else if (k === "Escape") setFlipped(null);
    else if (/^[a-z]$/i.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      // type-ahead: next card starting with that letter
      const L = k.toUpperCase();
      for (let s = 1; s <= N; s++) {
        const i = mod(frontIdx + s, N);
        if (letterOf(list[i]) === L) {
          spinTo(i);
          break;
        }
      }
    } else return;
    e.preventDefault();
  };

  /* ---------- Search ---------- */
  const q = query.trim().toLowerCase();
  const matches = q
    ? list
        .map((p, i) => ({ i, score: p.name.toLowerCase().startsWith(q) ? 0 : p.name.toLowerCase().includes(q) ? 1 : `${p.role} ${p.team ?? ""} ${p.location ?? ""}`.toLowerCase().includes(q) ? 2 : -1 }))
        .filter((m) => m.score >= 0)
        .sort((a, b) => a.score - b.score || a.i - b.i)
    : [];

  const onSearch = (value: string) => {
    setQuery(value);
    setMatchAt(0);
    const v = value.trim().toLowerCase();
    if (!v) return;
    const first = list.findIndex((p) => p.name.toLowerCase().startsWith(v));
    const any = first >= 0 ? first : list.findIndex((p) => `${p.name} ${p.role} ${p.team ?? ""} ${p.location ?? ""}`.toLowerCase().includes(v));
    if (any >= 0) spinTo(any);
  };
  const nextMatch = () => {
    if (!matches.length) return;
    const n = (matchAt + 1) % matches.length;
    setMatchAt(n);
    spinTo(matches[n].i);
  };

  const pickTeam = (t: string | null) => {
    cancelAnimationFrame(animRef.current);
    setTeam(t);
    setFlipped(null);
    posRef.current = 0;
    targetRef.current = 0;
    setPos(0);
    setQuery("");
    const count = t ? people.filter((p) => p.team === t).length : people.length;
    setAnnounce(`${t ?? "Everyone"}: ${count} card${count === 1 ? "" : "s"}.`);
  };

  const copy = (email: string) => {
    void navigator.clipboard?.writeText(email).then(() => {
      setCopied(email);
      setTimeout(() => setCopied((c) => (c === email ? null : c)), 1600);
    });
  };

  /* ---------- Render ---------- */
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const present = new Set(list.map(letterOf));
  const frontLetter = front ? letterOf(front) : "";
  const base = Math.floor(pos);
  const count = Math.min(N, VISIBLE);
  const slots = Array.from({ length: count }, (_, k) => {
    const i = base + k;
    return { i, d: i - pos, idx: mod(i, N) };
  }).reverse();

  const style = {
    "--rx-base": palette.base,
    "--rx-card": palette.card,
    "--rx-ink": palette.ink,
    "--rx-accent": palette.accent,
    "--rx-card-bottom": "5.25rem",
  } as CSSProperties;

  const chip = (active: boolean) =>
    `h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rx-base)] ${
      active ? "border-[var(--rx-base)] bg-[var(--rx-base)] text-white" : "border-[var(--rx-base)]/20 bg-white text-[var(--rx-base)] hover:border-[var(--rx-base)]/50"
    }`;

  return (
    <section style={style} className={`rx @container w-full ${className}`} aria-roledescription="carousel" aria-label={title}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      {/* ---------- controls ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        {searchable && (
          <div className="relative min-w-0 flex-1 basis-56">
            <label htmlFor={`${uid}-q`} className="sr-only">
              Search people
            </label>
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--rx-base)]/60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id={`${uid}-q`}
              type="text"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  nextMatch();
                } else if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search name, role or city…"
              autoComplete="off"
              aria-describedby={`${uid}-qhint`}
              className="h-10 w-full rounded-lg border border-[var(--rx-base)]/20 bg-white pr-3 pl-9 text-sm text-[var(--rx-ink)] placeholder:text-[var(--rx-ink)]/40 focus-visible:border-[var(--rx-base)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--rx-base)]/40"
            />
          </div>
        )}
        <button
          type="button"
          aria-pressed={sound}
          aria-label={sound ? "Turn card sounds off" : "Turn card sounds on"}
          onClick={() => setSound((v) => !v)}
          className={`grid size-10 shrink-0 place-items-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rx-base)] active:scale-90 ${
            sound ? "border-[var(--rx-base)] bg-[var(--rx-base)] text-white" : "border-[var(--rx-base)]/20 bg-white text-[var(--rx-base)] hover:border-[var(--rx-base)]/50"
          }`}
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            {sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
          </svg>
        </button>
      </div>
      <p id={`${uid}-qhint`} className="mt-1.5 min-h-4 text-xs text-[var(--rx-ink)]/60">
        {q ? (matches.length ? `${matches.length} match${matches.length === 1 ? "" : "es"}${matches.length > 1 ? " · Enter for the next" : ""}` : `No card for “${query.trim()}”`) : ""}
      </p>

      {teams.length > 0 && (
        <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Filter by team">
          <button type="button" aria-pressed={team === null} onClick={() => pickTeam(null)} className={chip(team === null)}>
            Everyone
          </button>
          {teams.map((t) => (
            <button key={t} type="button" aria-pressed={team === t} onClick={() => pickTeam(t)} className={chip(team === t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ---------- letter index ---------- */}
      <div className="mt-2 flex gap-0.5 overflow-x-auto pb-1 [scrollbar-width:thin] @3xl:justify-center" role="group" aria-label="Jump to letter">
        {letters.map((L) => {
          const has = present.has(L);
          return (
            <button
              key={L}
              type="button"
              disabled={!has}
              aria-label={`Jump to ${L}`}
              aria-current={L === frontLetter ? "true" : undefined}
              onClick={() => spinTo(list.findIndex((p) => letterOf(p) === L))}
              className={`grid h-8 w-7 shrink-0 place-items-center rounded-t-md text-[13px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--rx-base)] disabled:cursor-default disabled:opacity-25 ${
                L === frontLetter ? "bg-[var(--rx-accent)] text-[var(--rx-ink)]" : has ? "bg-[var(--rx-base)]/10 text-[var(--rx-base)] hover:bg-[var(--rx-base)]/20" : "text-[var(--rx-ink)]"
              }`}
              style={{ fontFamily: TYPE }}
            >
              {L}
            </button>
          );
        })}
      </div>

      {/* ---------- the wheel ---------- */}
      <div className="mt-3 flex items-stretch gap-2 @xl:gap-4">
        <div
          ref={stageRef}
          tabIndex={0}
          role="group"
          aria-label={`${title}: card wheel. Arrow keys spin, Enter flips the card, letters jump.`}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative h-[24rem] min-w-0 flex-1 touch-none overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--rx-base)_14%,transparent),transparent_70%)] select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--rx-accent)] @xl:h-[27rem]"
          style={{ cursor: "grab" }}
        >
          <div className="absolute inset-x-3 top-0 bottom-0 [perspective:640px] [perspective-origin:50%_-55%] @md:inset-x-6">
            <div className="absolute inset-0 [transform-style:preserve-3d]">
              {N > 0 &&
                slots.map(({ i, d, idx }) => {
                  const p = list[idx];
                  const isFront = Math.abs(d) < 0.5;
                  return (
                    <Card
                      key={`slot-${i}`}
                      person={p}
                      index={idx}
                      total={N}
                      d={d}
                      front={isFront}
                      flipped={isFront && flipped === personId(p)}
                      now={now}
                      copied={copied === p.email}
                      onFlip={flip}
                      onCopy={copy}
                    />
                  );
                })}
            </div>
          </div>

          {N === 0 && (
            <div className="absolute inset-x-6 bottom-[6.5rem] mx-auto grid aspect-[1.72] max-w-[25rem] place-items-center rounded-md border-2 border-dashed border-[var(--rx-base)]/30 bg-white/60 p-4 text-center">
              <p className="text-sm text-[var(--rx-ink)]/70" style={{ fontFamily: TYPE }}>
                No cards in this Rolodex yet.
              </p>
            </div>
          )}

          {/* base, rail and knobs */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[5.6rem]">
            <div className="absolute inset-x-[8%] top-3 h-3 rounded-full bg-[linear-gradient(180deg,#f4f1fa,#a9a3b8_55%,#6f6880)] shadow-[0_2px_3px_rgba(0,0,0,.4)]" />
            {[0, 1].map((side) => (
              <div key={side} className={`absolute top-0 grid size-9 place-items-center rounded-full shadow-[0_3px_6px_rgba(0,0,0,.45)] ${side ? "right-[3%]" : "left-[3%]"}`} style={{ background: "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--rx-base) 45%, white), var(--rx-base) 60%, color-mix(in srgb, var(--rx-base) 60%, black))" }}>
                <span className="h-7 w-1 rounded-full bg-white/50" style={{ transform: `rotate(${pos * 36}deg)` }} />
              </div>
            ))}
            <div
              className="absolute inset-x-[6%] bottom-2 h-[3.4rem] rounded-[14px_14px_18px_18px] shadow-[0_14px_20px_-10px_rgba(20,6,40,.7)]"
              style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--rx-base) 75%, white) 0, var(--rx-base) 12%, var(--rx-base) 75%, color-mix(in srgb, var(--rx-base) 65%, black))" }}
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[linear-gradient(180deg,#f3d9a4,#d9b26f)] px-3 py-1 text-[10px] font-bold tracking-[0.3em] whitespace-nowrap text-[#3b2410] shadow-inner" style={{ fontFamily: MONO }}>
                {N ? `${String(frontIdx + 1).padStart(2, "0")} / ${String(N).padStart(2, "0")}` : "00 / 00"}
              </span>
            </div>
          </div>
        </div>

        {/* spin buttons */}
        <div className="flex flex-col justify-center gap-2">
          {[
            { dir: -1, label: "Previous card", path: "M6 15l6-6 6 6" },
            { dir: 1, label: "Next card", path: "M6 9l6 6 6-6" },
          ].map((b) => (
            <button
              key={b.dir}
              type="button"
              onClick={() => spinBy(b.dir)}
              disabled={N < 2}
              aria-label={b.label}
              className="grid size-11 place-items-center rounded-full border border-[var(--rx-base)]/20 bg-white text-[var(--rx-base)] shadow-sm transition hover:border-[var(--rx-base)]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rx-base)] active:scale-90 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={b.path} />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-[var(--rx-ink)]/55">Drag or scroll to spin · click a card to flip it · arrow keys and letters work too</p>
    </section>
  );
}

export default RolodexDirectory;
