"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Stat = {
  id?: string;
  /** Small label above the number, e.g. "Active users". */
  label: string;
  value: number;
  /** Text before the number, e.g. "$". */
  prefix?: string;
  /** Text after the number, e.g. "%", "+", " ms". */
  suffix?: string;
  /** Decimal places to show. */
  decimals?: number;
  /** "standard" → 12,400 · "compact" → 12.4K. */
  notation?: "standard" | "compact";
  /** One line under the number. */
  description?: string;
  /** Change vs a previous period, in percent (e.g. 12.4 or -3). */
  delta?: number;
  /** Text after the delta, e.g. "vs last month". */
  deltaLabel?: string;
  /** For metrics where down is good (e.g. response time). */
  lowerIsBetter?: boolean;
  /** Points for the sparkline under the number. */
  trend?: number[];
  /** Labels for the trend points (shown on hover). */
  trendLabels?: string[];
  /** Shows a pulsing LIVE dot (update `value` and the digits roll to the new number). */
  live?: boolean;
};

export type RollingStatsProps = {
  stats: Stat[];
  eyebrow?: string;
  title?: string;
  description?: string;
  /** "paper" (light) or "ink" (dark). */
  variant?: "paper" | "ink";
  /** Number formatting locale. */
  locale?: string;
  /** Roll duration in ms. */
  duration?: number;
  /** Show skeletons while the numbers load. */
  loading?: boolean;
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
const STRIP = 60; // six 0–9 cycles per column

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

function format(stat: Stat, locale: string) {
  const fmt = new Intl.NumberFormat(locale, {
    notation: stat.notation === "compact" ? "compact" : "standard",
    minimumFractionDigits: stat.decimals ?? 0,
    maximumFractionDigits: stat.decimals ?? (stat.notation === "compact" ? 1 : 0),
  });
  return fmt.format(stat.value);
}

/* ------------------------------------------------------------------ */
/* One rolling digit column                                            */
/* ------------------------------------------------------------------ */

type ColumnState = { pos: number; digit: number; active: boolean; instant: boolean };

function DigitColumn({ digit, active, up, laps, delay, duration, reduced }: { digit: number; active: boolean; up: boolean; laps: number; delay: number; duration: number; reduced: boolean }) {
  const [s, setS] = useState<ColumnState>({ pos: active ? digit + 10 : 0, digit, active, instant: false });

  // Derive the new strip position when the digit or visibility changes (adjusting state while rendering).
  if (digit !== s.digit || active !== s.active) {
    let pos = s.pos;
    if (!active) pos = 0;
    else if (!s.active) pos = digit + 10 * laps; // first roll in: spin through whole laps
    else if (up) pos = s.pos + ((digit - (s.pos % 10) + 10) % 10);
    else pos = s.pos - (((s.pos % 10) - digit + 10) % 10);
    setS({ pos, digit, active, instant: false });
  }

  // Keep the strip inside its six cycles once a roll finishes.
  const onEnd = () => {
    if (s.pos >= 40 || s.pos < 10) setS({ ...s, pos: (s.pos % 10) + 20, instant: true });
  };

  const pos = reduced ? (active ? digit + 10 : 0) : s.pos;
  return (
    <span
      className="relative inline-block h-[1em] overflow-hidden align-top"
      style={{ maskImage: "linear-gradient(transparent, #000 12%, #000 88%, transparent)", WebkitMaskImage: "linear-gradient(transparent, #000 12%, #000 88%, transparent)" }}
    >
      <span
        className="flex flex-col"
        onTransitionEnd={onEnd}
        style={{
          transform: `translateY(${-pos}em)`,
          transition: reduced || s.instant ? "none" : `transform ${duration}ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
        }}
      >
        {Array.from({ length: STRIP }, (_, i) => (
          <span key={i} className="block h-[1em] leading-none">
            {i % 10}
          </span>
        ))}
      </span>
    </span>
  );
}

function RollingNumber({ text, active, up, duration, reduced }: { text: string; active: boolean; up: boolean; duration: number; reduced: boolean }) {
  const chars = [...text];
  const lastDigit = chars.findLastIndex((c) => /\d/.test(c));
  return (
    <span className="inline-flex items-start leading-none whitespace-nowrap tabular-nums">
      {chars.map((c, i) => {
        const fromRight = chars.length - i;
        if (!/\d/.test(c)) {
          return (
            <span key={`s${fromRight}`} className="inline-block h-[1em] leading-none">
              {c}
            </span>
          );
        }
        return (
          <DigitColumn
            key={`d${fromRight}`}
            digit={Number(c)}
            active={active}
            up={up}
            laps={i === lastDigit ? 2 : 1}
            delay={i * 70}
            duration={duration}
            reduced={reduced}
          />
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

function Sparkline({ points, labels, drawn, color, format: fmt, reduced, uid }: { points: number[]; labels?: string[]; drawn: boolean; color: string; format: (n: number) => string; reduced: boolean; uid: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 100, 26 - ((p - min) / span) * 22] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const area = `${line} L100 30 L0 30 Z`;

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const h = hover === null ? null : xy[hover];

  return (
    <div className="relative mt-4">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="block h-10 w-full overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".22" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${uid}-area)`} style={{ opacity: drawn ? 1 : 0, transition: reduced ? "none" : "opacity .8s .6s" }} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: drawn || reduced ? 0 : 1, transition: reduced ? "none" : "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1) .2s" }}
        />
        {h && <line x1={h[0]} x2={h[0]} y1="0" y2="30" stroke={color} strokeOpacity=".35" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
      </svg>
      {/* end dot */}
      <span
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: "100%", top: `${(xy[xy.length - 1][1] / 30) * 100}%`, background: color, opacity: drawn ? 1 : 0, transition: "opacity .3s 1.4s" }}
      />
      {h && hover !== null && (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-[var(--rs-ink)] px-2 py-1 text-[11px] whitespace-nowrap text-[var(--rs-paper)] shadow"
          style={{ left: `${Math.min(88, Math.max(12, h[0]))}%`, fontFamily: MONO }}
        >
          {labels?.[hover] ? `${labels[hover]} · ` : ""}
          {fmt(points[hover])}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One stat                                                            */
/* ------------------------------------------------------------------ */

function StatCell({ stat, index, active, locale, duration, reduced, ink, chars }: { stat: Stat; index: number; active: boolean; locale: string; duration: number; reduced: boolean; ink: boolean; chars: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const text = format(stat, locale);
  const [prev, setPrev] = useState({ value: stat.value, up: true });
  if (stat.value !== prev.value) setPrev({ value: stat.value, up: stat.value > prev.value });

  const good = stat.delta === undefined ? null : stat.lowerIsBetter ? stat.delta <= 0 : stat.delta >= 0;
  const pointFmt = (n: number) => `${stat.prefix ?? ""}${new Intl.NumberFormat(locale, { notation: stat.notation === "compact" ? "compact" : "standard", maximumFractionDigits: stat.decimals ?? 1 }).format(n)}${stat.suffix ?? ""}`;
  const trendSummary =
    stat.trend && stat.trend.length > 1
      ? `Trend ${stat.trend[stat.trend.length - 1] >= stat.trend[0] ? "up" : "down"} from ${pointFmt(stat.trend[0])} to ${pointFmt(stat.trend[stat.trend.length - 1])}.`
      : "";

  return (
    <div className="rs-cell @container relative px-5 py-7 @xl:px-7">
      <dt className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70" style={{ fontFamily: MONO }}>
        <span className="opacity-60">{String(index + 1).padStart(2, "0")}</span>
        {stat.label}
        {stat.live && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-emerald-600 opacity-100">
            <span className="relative flex size-2">
              {!reduced && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </dt>
      <dd className="mt-3">
        <span
          aria-hidden="true"
          className="block font-light tracking-[-0.04em] text-[var(--rs-ink)]"
          style={{ fontSize: `min(4.6rem, calc(100cqi / ${Math.max(3, chars) * 0.62}))` }}
        >
          {stat.prefix && <span className="inline-block leading-none">{stat.prefix}</span>}
          <RollingNumber text={text} active={active} up={prev.up} duration={duration + index * 120} reduced={reduced} />
          {stat.suffix && <span className="inline-block leading-none text-[0.55em] tracking-normal opacity-70">{stat.suffix}</span>}
        </span>
        <span className="sr-only">
          {stat.prefix}
          {text}
          {stat.suffix}
        </span>
      </dd>
      {stat.delta !== undefined && (
        <dd className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums ${
              good ? (ink ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-600/10 text-emerald-700") : ink ? "bg-rose-400/15 text-rose-300" : "bg-rose-600/10 text-rose-700"
            }`}
          >
            <span aria-hidden="true">{stat.delta >= 0 ? "▲" : "▼"}</span>
            <span className="sr-only">{stat.delta >= 0 ? "Up" : "Down"}</span>
            {Math.abs(stat.delta).toLocaleString(locale, { maximumFractionDigits: 1 })}%
          </span>
          {stat.deltaLabel && <span className="opacity-60">{stat.deltaLabel}</span>}
        </dd>
      )}
      {stat.description && <dd className="mt-2 max-w-[28ch] text-sm leading-snug opacity-70">{stat.description}</dd>}
      {stat.trend && stat.trend.length > 1 && (
        <dd>
          <span className="sr-only">{trendSummary}</span>
          <Sparkline points={stat.trend} labels={stat.trendLabels} drawn={active} color="var(--rs-accent)" format={pointFmt} reduced={reduced} uid={uid} />
        </dd>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Band                                                                */
/* ------------------------------------------------------------------ */

/** A stats band whose numbers roll into place like mechanical counters when it scrolls into view — with deltas, sparklines and live updates. */
export function RollingStats({
  stats,
  eyebrow,
  title,
  description,
  variant = "paper",
  locale = "en-US",
  duration = 1700,
  loading = false,
  className = "",
}: RollingStatsProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const [seen, setSeen] = useState(false);
  const ink = variant === "ink";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = seen && !loading;
  // One shared size so every number in the band lines up; the longest number decides it.
  const maxChars = Math.max(3, ...stats.map((s) => (s.prefix ?? "").length + format(s, locale).length + (s.suffix ?? "").length * 0.55));
  const cols = Math.min(4, Math.max(1, loading ? 4 : stats.length));
  const style = {
    "--rs-paper": ink ? "#170a2c" : "#fbf8f1",
    "--rs-ink": ink ? "#f5efe2" : "#1d1430",
    "--rs-accent": ink ? "#ffb347" : "#351367",
    "--rs-rule": ink ? "rgba(245,239,226,.14)" : "rgba(29,20,48,.12)",
  } as CSSProperties;

  return (
    <section
      ref={ref}
      style={style}
      aria-label={title ?? "Key numbers"}
      aria-busy={loading || undefined}
      className={`rs @container relative isolate overflow-hidden rounded-[1.75rem] border border-[var(--rs-rule)] bg-[var(--rs-paper)] text-[var(--rs-ink)] ${className}`}
    >
      {/* film grain */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[.07] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
      {ink && <span aria-hidden="true" className="pointer-events-none absolute -top-1/2 left-1/3 -z-10 size-[40rem] rounded-full bg-[#351367] opacity-60 blur-3xl" />}

      {(eyebrow || title || description) && (
        <header className="grid gap-3 border-b border-[var(--rs-rule)] px-5 pt-8 pb-7 @xl:px-7 @4xl:grid-cols-[1fr_1fr] @4xl:items-end">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold tracking-[0.24em] uppercase opacity-60" style={{ fontFamily: MONO }}>
                {eyebrow}
              </p>
            )}
            {title && <h2 className="mt-2 text-3xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance @xl:text-4xl">{title}</h2>}
          </div>
          {description && <p className="max-w-[46ch] text-[15px] leading-relaxed opacity-70 @4xl:justify-self-end">{description}</p>}
        </header>
      )}

      {loading ? (
        <div className={`grid ${cols >= 2 ? "@md:grid-cols-2" : ""} ${cols >= 4 ? "@4xl:grid-cols-4" : cols === 3 ? "@4xl:grid-cols-3" : ""}`}>
          {Array.from({ length: cols }, (_, i) => (
            <div key={i} className="rs-cell px-5 py-7 @xl:px-7">
              <span className="block h-3 w-24 animate-pulse rounded bg-[var(--rs-ink)]/10 motion-reduce:animate-none" />
              <span className="mt-4 block h-14 w-40 animate-pulse rounded-lg bg-[var(--rs-ink)]/10 motion-reduce:animate-none" />
              <span className="mt-4 block h-3 w-28 animate-pulse rounded bg-[var(--rs-ink)]/10 motion-reduce:animate-none" />
              <span className="mt-5 block h-10 w-full animate-pulse rounded bg-[var(--rs-ink)]/[.06] motion-reduce:animate-none" />
            </div>
          ))}
          <span className="sr-only">Loading numbers…</span>
        </div>
      ) : stats.length === 0 ? (
        <p className="px-7 py-10 text-sm opacity-60">No numbers to show yet.</p>
      ) : (
        <dl className={`grid ${cols >= 2 ? "@md:grid-cols-2" : ""} ${cols >= 4 ? "@4xl:grid-cols-4" : cols === 3 ? "@4xl:grid-cols-3" : ""}`}>
          {stats.map((s, i) => (
            <StatCell key={s.id ?? s.label} stat={s} index={i} active={active} locale={locale} duration={duration} reduced={reduced} ink={ink} chars={maxChars} />
          ))}
        </dl>
      )}

      <style>{`
        .rs .rs-cell + .rs-cell { border-top: 1px solid var(--rs-rule); }
        @container (min-width: 28rem) {
          .rs dl > .rs-cell:nth-child(2n) { border-left: 1px solid var(--rs-rule); }
          .rs dl > .rs-cell:nth-child(2) { border-top: 0; }
        }
        @container (min-width: 56rem) {
          .rs dl > .rs-cell + .rs-cell { border-top: 0; border-left: 1px solid var(--rs-rule); }
        }
      `}</style>
    </section>
  );
}

export default RollingStats;
