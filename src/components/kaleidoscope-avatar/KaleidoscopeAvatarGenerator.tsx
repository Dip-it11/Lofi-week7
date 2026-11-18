"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { KaleidoAvatar } from "./KaleidoAvatar";
import { avatarCode, PALETTES, resolve, type KaleidoConfig, type KaleidoPaletteName, type KaleidoStyle, type Symmetry } from "./kaleido";
import { createKaleidoSound, type KaleidoSound } from "./kaleidoSound";

export type KaleidoscopeAvatarGeneratorProps = {
  /** Name the generator starts with. */
  defaultName?: string;
  /** Called whenever the avatar settings change. */
  onChange?: (config: Required<KaleidoConfig> & { shape: "circle" | "rounded" }) => void;
  /** Called after a download, with the file. */
  onExport?: (file: Blob, format: "svg" | "png") => void;
  /** PNG export size in px. */
  pngSize?: number;
  /** Start with bead sounds on. */
  defaultSound?: boolean;
  className?: string;
};

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const TYPE = 'var(--font-typewriter), "Special Elite", "Courier New", monospace';
const SYMMETRIES: (Symmetry | "auto")[] = ["auto", 6, 8, 10, 12];
const PALETTE_NAMES: KaleidoPaletteName[] = ["auto", "lofi", "sunset", "ocean", "mint", "mono"];
const STYLES: (KaleidoStyle | "auto")[] = ["auto", "beads", "petals", "crystals"];
const clock = (): number => performance.now();
const norm = (d: number) => ((d % 360) + 360) % 360;
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "avatar";

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

/** Type a name, twist the tube, download a one-of-a-kind kaleidoscope avatar (SVG or PNG). */
export function KaleidoscopeAvatarGenerator({
  defaultName = "Lofistack",
  onChange,
  onExport,
  pngSize = 512,
  defaultSound = false,
  className = "",
}: KaleidoscopeAvatarGeneratorProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = usePrefersReducedMotion();
  const [name, setName] = useState(defaultName);
  const [symmetry, setSymmetry] = useState<Symmetry | "auto">("auto");
  const [palette, setPalette] = useState<KaleidoPaletteName>("auto");
  const [style, setStyle] = useState<KaleidoStyle | "auto">("auto");
  const [shape, setShape] = useState<"circle" | "rounded">("circle");
  const [twist, setTwist] = useState(0);
  const [sound, setSound] = useState(defaultSound);
  const [status, setStatus] = useState<{ kind: "idle" | "copied" | "svg" | "png" | "error"; text?: string }>({ kind: "idle" });
  const [announce, setAnnounce] = useState("");

  const svgRef = useRef<SVGSVGElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const sfxRef = useRef<KaleidoSound | null>(null);
  const soundRef = useRef(sound);
  const twistRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const drag = useRef<{ pid: number; angle: number } | null>(null);
  const animRef = useRef(0);
  const statusTimer = useRef(0);

  useEffect(() => {
    soundRef.current = sound;
    twistRef.current = twist;
    onChangeRef.current = onChange;
  });
  useEffect(
    () => () => {
      cancelAnimationFrame(animRef.current);
      window.clearTimeout(statusTimer.current);
      sfxRef.current?.dispose();
    },
    [],
  );

  const tumble = (amount: number) => {
    if (!soundRef.current) return;
    sfxRef.current ??= createKaleidoSound();
    sfxRef.current?.tumble(amount);
  };

  const empty = !name.trim();
  const roundTwist = Math.round(norm(twist));
  const config = { name, symmetry, palette, style, twist: roundTwist };
  const resolved = resolve(config);
  const code = avatarCode(resolved, roundTwist);

  /* Report changes. */
  useEffect(() => {
    onChangeRef.current?.({ name, symmetry, palette, style, twist: roundTwist, shape });
  }, [name, symmetry, palette, style, roundTwist, shape]);

  /* Idle: the tube turns slowly until someone types a name. */
  useEffect(() => {
    if (!empty || reduced) return;
    let raf = 0;
    const step = () => {
      setTwist((t) => t + 0.25);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [empty, reduced]);

  /* Mouse wheel / trackpad twists the tube. */
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(animRef.current);
      const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 0.25;
      setTwist((t) => t + d);
      tumble(d);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- Twist ring ---------- */
  const angleAt = (x: number, y: number) => {
    const r = viewerRef.current!.getBoundingClientRect();
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    cancelAnimationFrame(animRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pid: e.pointerId, angle: angleAt(e.clientX, e.clientY) };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.pid !== e.pointerId) return;
    const a = angleAt(e.clientX, e.clientY);
    let delta = a - d.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.angle = a;
    setTwist((t) => t + delta);
    tumble(delta);
  };
  const onPointerUp = () => {
    drag.current = null;
    setAnnounce(`Twist ${Math.round(norm(twistRef.current))} degrees.`);
  };

  const twistTo = (target: number, ms: number) => {
    cancelAnimationFrame(animRef.current);
    const from = twistRef.current;
    if (reduced || ms <= 0) {
      setTwist(target);
      return;
    }
    const t0 = clock();
    let last = from;
    const step = () => {
      const k = Math.min(1, (clock() - t0) / ms);
      const v = from + (target - from) * (1 - Math.pow(1 - k, 3));
      tumble(v - last);
      last = v;
      setTwist(v);
      if (k < 1) animRef.current = requestAnimationFrame(step);
      else setAnnounce(`Twist ${Math.round(norm(target))} degrees.`);
    };
    animRef.current = requestAnimationFrame(step);
  };

  const onRingKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    const by = k === "ArrowRight" || k === "ArrowUp" ? 5 : k === "ArrowLeft" || k === "ArrowDown" ? -5 : k === "PageUp" ? 45 : k === "PageDown" ? -45 : 0;
    if (by) {
      e.preventDefault();
      cancelAnimationFrame(animRef.current);
      setTwist((t) => Math.round(t) + by);
      tumble(by);
    } else if (k === "Home") {
      e.preventDefault();
      twistTo(twistRef.current - norm(twistRef.current), 300);
    }
  };

  const shake = () => twistTo(twistRef.current + 120 + Math.random() * 200, 900);

  /* ---------- Export ---------- */
  const flash = (kind: "copied" | "svg" | "png" | "error", text?: string) => {
    setStatus({ kind, text });
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus({ kind: "idle" }), 2200);
  };
  const svgText = (px: number) => {
    const el = svgRef.current;
    if (!el) return "";
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(px));
    clone.setAttribute("height", String(px));
    clone.removeAttribute("class");
    return new XMLSerializer().serializeToString(clone);
  };
  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadSvg = () => {
    const blob = new Blob([svgText(pngSize)], { type: "image/svg+xml" });
    download(blob, `${slug(name)}-${code.replace(/[^A-Z0-9-]/gi, "")}.svg`);
    onExport?.(blob, "svg");
    flash("svg");
    setAnnounce("SVG downloaded.");
  };
  const downloadPng = async () => {
    try {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText(pngSize))}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = pngSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, 0, 0, pngSize, pngSize);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("no blob");
      download(blob, `${slug(name)}-${code.replace(/[^A-Z0-9-]/gi, "")}.png`);
      onExport?.(blob, "png");
      flash("png");
      setAnnounce("PNG downloaded.");
    } catch {
      flash("error", "PNG export failed — try SVG");
      setAnnounce("PNG export failed. Try the SVG download.");
    }
  };
  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgText(pngSize));
      flash("copied");
      setAnnounce("SVG code copied.");
    } catch {
      flash("error", "Couldn't copy — use download");
    }
  };

  /* ---------- UI bits ---------- */
  const chip = (on: boolean) =>
    `inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold capitalize transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#351367] active:scale-95 ${
      on ? "border-[#351367] bg-[#351367] text-white" : "border-[#351367]/20 bg-white text-[#351367] hover:border-[#351367]/50"
    }`;
  const label = "mb-1.5 block text-[11px] font-bold tracking-[0.18em] text-[#5d5275] uppercase";

  const swatch = (p: KaleidoPaletteName) => (p === "auto" ? resolve({ name, palette: "auto" }).colors : PALETTES[p].colors).slice(0, 4);

  return (
    <section className={`kx @container w-full ${className}`} aria-label="Kaleidoscope avatar generator">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] @3xl:gap-10">
        {/* ================= viewer ================= */}
        <div className="flex flex-col items-center">
          <div
            ref={viewerRef}
            role="slider"
            tabIndex={0}
            aria-label="Twist the kaleidoscope"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={roundTwist}
            aria-valuetext={`Twist ${roundTwist} degrees`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onRingKey}
            className="relative aspect-square w-full max-w-[20rem] cursor-grab touch-none rounded-full select-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ffb347] active:cursor-grabbing @xl:max-w-[22rem]"
          >
            {/* knurled brass twist ring */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full shadow-[0_20px_40px_-18px_rgba(20,6,40,.8),inset_0_2px_0_rgba(255,255,255,.5)]"
              style={{
                background: "repeating-conic-gradient(from 0deg, #a8782f 0deg 3deg, #f3d9a4 3deg 5deg, #c99a4f 5deg 6deg)",
                transform: `rotate(${twist}deg)`,
              }}
            >
              <span className="absolute top-[2.5%] left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#351367] shadow-[0_0_0_2px_#f3d9a4]" />
            </div>
            {/* tube rim */}
            <div aria-hidden="true" className="absolute inset-[7%] rounded-full bg-[#1a1024] shadow-[inset_0_4px_12px_rgba(0,0,0,.8)]" />
            {/* the view */}
            <div className="absolute inset-[10%] overflow-hidden rounded-full">
              <KaleidoAvatar svgRef={svgRef} {...config} shape={shape} size={512} className="h-full w-full" />
            </div>
            {/* glass glare */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.28),transparent_38%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,.08),transparent_30%)]" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={() => twistTo(twistRef.current - 15, 220)} aria-label="Twist left 15 degrees" className={chip(false)}>
              ⟲
            </button>
            <span className="min-w-[8.5rem] rounded-lg bg-[#1d1430] px-3 py-2 text-center text-xs tracking-[0.15em] text-[#ffb347] tabular-nums" style={{ fontFamily: MONO }}>
              TWIST {String(roundTwist).padStart(3, "0")}°
            </span>
            <button type="button" onClick={() => twistTo(twistRef.current + 15, 220)} aria-label="Twist right 15 degrees" className={chip(false)}>
              ⟳
            </button>
            <button type="button" onClick={shake} className={chip(false)}>
              Shake
            </button>
            <button
              type="button"
              aria-pressed={sound}
              aria-label={sound ? "Turn bead sounds off" : "Turn bead sounds on"}
              onClick={() => setSound((v) => !v)}
              className={`${chip(sound)} !px-2.5`}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5z" />
                {sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-[#5d5275]">Drag the brass ring, scroll, or use the arrow keys to twist.</p>
        </div>

        {/* ================= controls ================= */}
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <label htmlFor={`${uid}-name`} className={label}>
              Name or email
            </label>
            <input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a name…"
              autoComplete="off"
              maxLength={80}
              className="h-11 w-full rounded-xl border border-[#351367]/20 bg-white px-3.5 text-[15px] text-[#1d1430] placeholder:text-[#5d5275]/50 focus-visible:border-[#351367] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#351367]/40"
              style={{ fontFamily: TYPE }}
            />
            <p className="mt-1.5 text-xs text-[#5d5275]">
              {empty ? "Type a name to make it yours — the same name always gives the same avatar." : (
                <>
                  Avatar code <span className="font-semibold text-[#351367]" style={{ fontFamily: MONO }}>{code}</span> · same name + settings = same avatar
                </>
              )}
            </p>
          </div>

          <div>
            <span className={label} id={`${uid}-mir`}>
              Mirrors
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${uid}-mir`}>
              {SYMMETRIES.map((s) => (
                <button key={s} type="button" aria-pressed={symmetry === s} onClick={() => setSymmetry(s)} className={chip(symmetry === s)}>
                  {s === "auto" ? `Auto (${resolve({ name }).symmetry})` : s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label} id={`${uid}-pal`}>
              Colours
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${uid}-pal`}>
              {PALETTE_NAMES.map((p) => (
                <button key={p} type="button" aria-pressed={palette === p} onClick={() => setPalette(p)} className={chip(palette === p)}>
                  <span className="flex -space-x-1" aria-hidden="true">
                    {swatch(p).map((c, i) => (
                      <span key={i} className="size-3 rounded-full border border-white/70" style={{ background: c }} />
                    ))}
                  </span>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <div>
              <span className={label} id={`${uid}-sty`}>
                Pieces
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={`${uid}-sty`}>
                {STYLES.map((s) => (
                  <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)} className={chip(style === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={label} id={`${uid}-shp`}>
                Shape
              </span>
              <div className="flex gap-1.5" role="group" aria-labelledby={`${uid}-shp`}>
                {(["circle", "rounded"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={shape === s} onClick={() => setShape(s)} className={chip(shape === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* size previews */}
          <div>
            <span className={label}>Preview</span>
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[#351367]/10 bg-white p-4">
              {[96, 64, 40, 28].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <KaleidoAvatar {...config} shape={shape} size={s} label="" />
                  <span className="text-[10px] text-[#5d5275]" style={{ fontFamily: MONO }}>
                    {s}px
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2.5 rounded-full border border-[#351367]/10 bg-[#fbfaff] py-1.5 pr-4 pl-1.5">
                <KaleidoAvatar {...config} shape={shape} size={32} label="" />
                <span className="min-w-0 leading-tight">
                  <span className="block max-w-[10rem] truncate text-sm font-semibold text-[#1d1430]">{name.trim() || "Your name"}</span>
                  <span className="block text-[11px] text-[#5d5275]">Lofistack member</span>
                </span>
              </div>
            </div>
          </div>

          {/* export */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadSvg} disabled={empty} className={`${chip(true)} disabled:cursor-not-allowed disabled:opacity-45`}>
              ↓ SVG
            </button>
            <button type="button" onClick={() => void downloadPng()} disabled={empty} className={`${chip(true)} disabled:cursor-not-allowed disabled:opacity-45`}>
              ↓ PNG {pngSize}
            </button>
            <button type="button" onClick={() => void copySvg()} disabled={empty} className={`${chip(false)} disabled:cursor-not-allowed disabled:opacity-45`}>
              Copy SVG
            </button>
            <span role="status" className={`text-xs font-semibold ${status.kind === "error" ? "text-[#c8322b]" : "text-emerald-700"}`}>
              {status.kind === "copied" ? "✓ Copied" : status.kind === "svg" ? "✓ SVG saved" : status.kind === "png" ? "✓ PNG saved" : status.kind === "error" ? status.text : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default KaleidoscopeAvatarGenerator;
