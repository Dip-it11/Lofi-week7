"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createSlideSound, type SlideSound } from "./slideSound";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Slide = {
  id: string;
  src: string;
  /** Describes the photo (required). */
  alt: string;
  /** Handwritten-style label on the mount. */
  caption?: string;
};

export type LightTablePalette = {
  /** Aluminium frame around the light box. */
  frame: string;
  /** Plastic slide mounts. */
  mount: string;
  /** Backlight colour. */
  glow: string;
  /** Grease-pencil star marks. */
  pencil: string;
};

export type LightTableSorterProps = {
  /** The slides, in their starting order. */
  items: Slide[];
  /** Called with the new order after every move or removal. */
  onChange?: (items: Slide[]) => void;
  /** Adds a "Save order" button once the order changes. Return a promise — a rejection shows "Not saved". */
  onSave?: (items: Slide[]) => Promise<void> | void;
  /** Called when a slide is starred or un-starred, with all starred ids. */
  onStarChange?: (ids: string[]) => void;
  /** Ids that start starred. */
  defaultStarred?: string[];
  /** Allow removing slides (with undo). */
  removable?: boolean;
  /** Show the magnifying loupe on hover by default. */
  defaultLoupe?: boolean;
  /** Loupe magnification. */
  zoom?: number;
  /** Start with click sounds on. */
  defaultSound?: boolean;
  /** Heading on the toolbar. */
  title?: string;
  palette?: Partial<LightTablePalette>;
  className?: string;
};

type Box = { left: number; top: number; width: number; height: number };
type Drag = { id: string; x: number; y: number; slots: Box[] };
type Loupe = { src: string; left: number; top: number; w: number; h: number; x: number; y: number };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_PALETTE: LightTablePalette = {
  frame: "#3a3542",
  mount: "#f4f0e6",
  glow: "#fffaf0",
  pencil: "#d7263d",
};

const TYPE = 'var(--font-typewriter), "Special Elite", "Courier New", monospace';
const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const LOUPE = 150;
const pad = (n: number) => String(n).padStart(2, "0");

function move<T>(arr: T[], from: number, to: number) {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** Reorder photos like 35mm slides on a glowing light table — drag, keyboard, a magnifying loupe and grease-pencil stars. */
export function LightTableSorter({
  items,
  onChange,
  onSave,
  onStarChange,
  defaultStarred = [],
  removable = true,
  defaultLoupe = true,
  zoom = 2.6,
  defaultSound = false,
  title = "Light table",
  palette: paletteOverrides,
  className = "",
}: LightTableSorterProps) {
  const palette = { ...DEFAULT_PALETTE, ...paletteOverrides };
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const [order, setOrder] = useState<Slide[]>(items);
  const [baseline, setBaseline] = useState(() => items.map((s) => s.id).join("|"));
  const [preview, setPreview] = useState<Slide[] | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [starred, setStarred] = useState<Set<string>>(() => new Set(defaultStarred));
  const [removed, setRemoved] = useState<{ slide: Slide; index: number } | null>(null);
  const [lamp, setLamp] = useState(true);
  const [loupeOn, setLoupeOn] = useState(defaultLoupe);
  const [loupe, setLoupe] = useState<Loupe | null>(null);
  const [sound, setSound] = useState(defaultSound);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [announce, setAnnounce] = useState("");

  const tableRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const itemEls = useRef(new Map<string, HTMLLIElement>());
  const mountEls = useRef(new Map<string, HTMLDivElement>());
  const lastPos = useRef(new Map<string, { x: number; y: number }>());
  const pendingDrop = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const session = useRef<{ id: string; pid: number; sx: number; sy: number; active: boolean; grabX: number; grabY: number } | null>(null);
  const previewRef = useRef<Slide[] | null>(null);
  const snapshot = useRef<Slide[] | null>(null);
  const undoTimer = useRef(0);
  const sfxRef = useRef<SlideSound | null>(null);

  useEffect(
    () => () => {
      window.clearTimeout(undoTimer.current);
      sfxRef.current?.dispose();
    },
    [],
  );

  const sfx = () => {
    if (!sound) return null;
    sfxRef.current ??= createSlideSound();
    return sfxRef.current;
  };

  const display = preview ?? order;
  const dirty = order.map((s) => s.id).join("|") !== baseline;
  const total = display.length;

  const commit = (next: Slide[], message?: string) => {
    setOrder(next);
    onChange?.(next);
    setSaveState("idle");
    if (message) setAnnounce(message);
  };

  /* ---------- FLIP: animate slides sliding to their new places ---------- */
  useLayoutEffect(() => {
    const seen = new Set<string>();
    itemEls.current.forEach((el, id) => {
      seen.add(id);
      const now = { x: el.offsetLeft, y: el.offsetTop };
      const before = lastPos.current.get(id);
      lastPos.current.set(id, now);
      const drop = pendingDrop.current;
      if (drop && drop.id === id) {
        pendingDrop.current = null;
        el.animate(
          [{ transform: `translate(${drop.dx}px, ${drop.dy}px) scale(1.06) rotate(-2deg)` }, { transform: "none" }],
          { duration: 280, easing: "cubic-bezier(.3,1.5,.5,1)" },
        );
        return;
      }
      if (!before || drag?.id === id) return;
      const dx = before.x - now.x;
      const dy = before.y - now.y;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.3,1)" });
    });
    lastPos.current.forEach((_, id) => !seen.has(id) && lastPos.current.delete(id));
    if (grabbed) mountEls.current.get(grabbed)?.focus({ preventScroll: true });
  }, [display, drag?.id, grabbed]);

  /* ---------- Pointer drag ---------- */
  const slotBoxes = (): Box[] =>
    Array.from(gridRef.current?.children ?? []).map((c) => {
      const el = c as HTMLElement;
      return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || grabbed || (e.target as HTMLElement).closest("button")) return;
    session.current = { id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, active: false, grabX: 0, grabY: 0 };
    let slots: Box[] = [];

    const onMove = (ev: PointerEvent) => {
      const s = session.current;
      const grid = gridRef.current;
      if (!s || ev.pointerId !== s.pid || !grid) return;
      const g = grid.getBoundingClientRect();
      const px = ev.clientX - g.left;
      const py = ev.clientY - g.top;
      if (!s.active) {
        if (Math.hypot(ev.clientX - s.sx, ev.clientY - s.sy) < 6) return;
        s.active = true;
        slots = slotBoxes();
        const from = order.findIndex((x) => x.id === s.id);
        s.grabX = s.sx - g.left - slots[from].left;
        s.grabY = s.sy - g.top - slots[from].top;
        previewRef.current = order.slice();
        setPreview(previewRef.current);
        setLoupe(null);
        sfx()?.pick();
        setAnnounce("Slide picked up.");
      }
      ev.preventDefault();
      const cur = previewRef.current!;
      const at = cur.findIndex((x) => x.id === s.id);
      let best = at;
      let bestD = Infinity;
      slots.forEach((b, i) => {
        const d = Math.hypot(px - (b.left + b.width / 2), py - (b.top + b.height / 2));
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best !== at) {
        previewRef.current = move(cur, at, best);
        setPreview(previewRef.current);
      }
      setDrag({ id: s.id, x: px - s.grabX, y: py - s.grabY, slots });
    };

    const finish = (ev: PointerEvent, cancel: boolean) => {
      const s = session.current;
      if (!s || ev.pointerId !== s.pid) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onEsc);
      session.current = null;
      if (!s.active) return;
      const final = previewRef.current ?? order;
      const idx = final.findIndex((x) => x.id === s.id);
      const g = gridRef.current!.getBoundingClientRect();
      const slot = slots[cancel ? order.findIndex((x) => x.id === s.id) : idx];
      pendingDrop.current = { id: s.id, dx: ev.clientX - g.left - s.grabX - slot.left, dy: ev.clientY - g.top - s.grabY - slot.top };
      previewRef.current = null;
      setPreview(null);
      setDrag(null);
      sfx()?.drop();
      if (cancel) setAnnounce("Move cancelled.");
      else commit(final, `Slide dropped at position ${idx + 1} of ${final.length}.`);
    };
    const onUp = (ev: PointerEvent) => finish(ev, false);
    const onCancel = (ev: PointerEvent) => finish(ev, true);
    const onEsc = (ev: globalThis.KeyboardEvent) => {
      if (ev.key !== "Escape" || !session.current?.active) return;
      finish(new PointerEvent("pointercancel", { pointerId: session.current.pid }), true);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onEsc);
  };

  /* ---------- Keyboard ---------- */
  const columns = () => {
    const kids = Array.from(gridRef.current?.children ?? []) as HTMLElement[];
    if (!kids.length) return 1;
    const top = kids[0].offsetTop;
    return Math.max(1, kids.filter((k) => k.offsetTop === top).length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, slide: Slide) => {
    const idx = display.findIndex((s) => s.id === slide.id);
    const k = e.key;
    if (k === " " || k === "Enter") {
      e.preventDefault();
      if (grabbed === slide.id) {
        setGrabbed(null);
        snapshot.current = null;
        sfx()?.drop();
        commit(previewRef.current ?? order, `Dropped. Slide is now ${idx + 1} of ${total}.`);
        previewRef.current = null;
        setPreview(null);
      } else if (!grabbed) {
        setGrabbed(slide.id);
        snapshot.current = order;
        previewRef.current = order.slice();
        setPreview(previewRef.current);
        setLoupe(null);
        sfx()?.pick();
        setAnnounce(`Picked up slide ${idx + 1}: ${slide.alt}. Use the arrow keys to move it, Space to drop, Escape to cancel.`);
      }
      return;
    }
    if (grabbed === slide.id && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(k)) {
      e.preventDefault();
      const cols = columns();
      const delta = k === "ArrowLeft" ? -1 : k === "ArrowRight" ? 1 : k === "ArrowUp" ? -cols : k === "ArrowDown" ? cols : 0;
      const to = k === "Home" ? 0 : k === "End" ? total - 1 : Math.max(0, Math.min(total - 1, idx + delta));
      if (to !== idx) {
        previewRef.current = move(display, idx, to);
        setPreview(previewRef.current);
        setAnnounce(`Position ${to + 1} of ${total}.`);
      }
      return;
    }
    if (k === "Escape" && grabbed === slide.id) {
      e.preventDefault();
      setGrabbed(null);
      previewRef.current = null;
      setPreview(null);
      setAnnounce("Move cancelled.");
      return;
    }
    if (grabbed) return;
    if (k === "ArrowRight" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowUp") {
      e.preventDefault();
      const cols = columns();
      const delta = k === "ArrowLeft" ? -1 : k === "ArrowRight" ? 1 : k === "ArrowUp" ? -cols : cols;
      const next = display[Math.max(0, Math.min(total - 1, idx + delta))];
      mountEls.current.get(next.id)?.focus();
    } else if (k.toLowerCase() === "s") {
      e.preventDefault();
      toggleStar(slide);
    } else if ((k === "Delete" || k === "Backspace") && removable) {
      e.preventDefault();
      remove(slide);
    } else if (k.toLowerCase() === "z" && loupeOn) {
      e.preventDefault();
      if (loupe) setLoupe(null);
      else {
        const img = mountEls.current.get(slide.id)?.querySelector("img");
        if (img) showLoupe(img, slide.src, null);
      }
    }
  };

  /* ---------- Loupe ---------- */
  function showLoupe(img: HTMLImageElement, src: string, point: { x: number; y: number } | null) {
    const table = tableRef.current;
    if (!table) return;
    const r = img.getBoundingClientRect();
    const t = table.getBoundingClientRect();
    const cx = point ? point.x : r.left + r.width / 2;
    const cy = point ? point.y : r.top + r.height / 2;
    const nw = img.naturalWidth || 4;
    const nh = img.naturalHeight || 3;
    const scale = Math.max(r.width / nw, r.height / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    const ox = (r.width - dw) / 2;
    const oy = (r.height - dh) / 2;
    const rx = cx - r.left - ox;
    const ry = cy - r.top - oy;
    setLoupe({
      src,
      left: cx - t.left - LOUPE / 2,
      top: cy - t.top - LOUPE / 2,
      w: dw * zoom,
      h: dh * zoom,
      x: -(rx * zoom - LOUPE / 2),
      y: -(ry * zoom - LOUPE / 2),
    });
  }

  const onImageMove = (e: ReactPointerEvent<HTMLImageElement>, slide: Slide) => {
    if (!loupeOn || drag || grabbed || e.pointerType === "touch") return;
    showLoupe(e.currentTarget, slide.src, { x: e.clientX, y: e.clientY });
  };

  /* ---------- Star / remove / save ---------- */
  function toggleStar(slide: Slide) {
    const next = new Set(starred);
    const on = !next.has(slide.id);
    if (on) next.add(slide.id);
    else next.delete(slide.id);
    setStarred(next);
    onStarChange?.([...next]);
    setAnnounce(on ? `Starred: ${slide.alt}.` : `Star removed: ${slide.alt}.`);
  }

  function remove(slide: Slide) {
    const index = order.findIndex((s) => s.id === slide.id);
    if (index < 0) return;
    const next = order.filter((s) => s.id !== slide.id);
    commit(next, `Removed ${slide.alt}. Press Undo to put it back.`);
    setRemoved({ slide, index });
    setLoupe(null);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setRemoved(null), 6000);
    const neighbour = next[Math.min(index, next.length - 1)];
    if (neighbour) requestAnimationFrame(() => mountEls.current.get(neighbour.id)?.focus());
  }

  const undo = () => {
    if (!removed) return;
    const next = order.slice();
    next.splice(Math.min(removed.index, next.length), 0, removed.slide);
    commit(next, `${removed.slide.alt} is back.`);
    setRemoved(null);
    window.clearTimeout(undoTimer.current);
  };

  const reset = () => {
    const byId = new Map([...order, ...items].map((s) => [s.id, s]));
    const next = baseline
      .split("|")
      .map((id) => byId.get(id))
      .filter((s): s is Slide => !!s);
    commit(next, "Order reset.");
    setRemoved(null);
  };

  const save = async () => {
    if (!onSave) return;
    setSaveState("saving");
    try {
      await onSave(order);
      setBaseline(order.map((s) => s.id).join("|"));
      setSaveState("saved");
      setAnnounce("Order saved.");
    } catch {
      setSaveState("error");
      setAnnounce("The order wasn't saved. Try again.");
    }
  };

  const toggleLamp = () => {
    sfx()?.lamp(!lamp);
    setLamp((v) => !v);
  };

  /* ---------- Render ---------- */
  const style = {
    "--lt-frame": palette.frame,
    "--lt-mount": palette.mount,
    "--lt-glow": palette.glow,
    "--lt-pencil": palette.pencil,
  } as CSSProperties;

  const tool = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#351367] active:scale-95 ${
      on ? "border-[#351367] bg-[#351367] text-white" : "border-[#351367]/20 bg-white text-[#351367] hover:border-[#351367]/50"
    }`;

  return (
    <section style={style} className={`lt @container w-full ${className}`} aria-label={title}>
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {announce}
      </p>
      <p id={`${uid}-help`} className="sr-only">
        Press Space to pick up a slide, arrow keys to move it, Space to drop or Escape to cancel. S stars a slide{removable ? ", Delete removes it" : ""}{loupeOn ? ", Z shows the loupe" : ""}.
      </p>

      {/* ---------- toolbar ---------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h3 className="truncate text-lg leading-tight font-semibold text-[#351367]">{title}</h3>
          <p className="text-xs text-[#5d5275]" style={{ fontFamily: MONO }}>
            {total} slide{total === 1 ? "" : "s"} · {starred.size} starred{dirty ? " · order changed" : ""}
          </p>
        </div>
        <button type="button" role="switch" aria-checked={lamp} onClick={toggleLamp} className={tool(lamp)}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.4 1 2.5h6c0-1.1.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
          </svg>
          Lamp
        </button>
        <button type="button" aria-pressed={loupeOn} onClick={() => (setLoupeOn((v) => !v), setLoupe(null))} className={tool(loupeOn)}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="10" cy="10" r="6" />
            <path d="m20 20-5.5-5.5" />
          </svg>
          Loupe
        </button>
        <button type="button" aria-pressed={sound} aria-label={sound ? "Turn sounds off" : "Turn sounds on"} onClick={() => setSound((v) => !v)} className={`${tool(sound)} !px-2`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />
            {sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
          </svg>
        </button>
        {dirty && (
          <button type="button" onClick={reset} className={tool(false)}>
            Reset
          </button>
        )}
        {onSave && (dirty || saveState === "saved") && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saveState === "saving" || (!dirty && saveState === "saved")}
            aria-busy={saveState === "saving" || undefined}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#351367] active:scale-95 disabled:cursor-default ${
              saveState === "error" ? "bg-[#c8322b] hover:brightness-110" : saveState === "saved" ? "bg-emerald-600" : "bg-[#351367] hover:brightness-125 disabled:opacity-70"
            }`}
          >
            {saveState === "saving" && <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />}
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "✓ Saved" : saveState === "error" ? "Not saved — retry" : "Save order"}
          </button>
        )}
      </div>

      {/* ---------- the light box ---------- */}
      <div
        ref={tableRef}
        className="relative rounded-2xl border-[10px] p-3 shadow-[0_24px_40px_-26px_rgba(20,6,40,.8)] transition-colors duration-500 @md:p-5"
        style={{
          borderColor: "var(--lt-frame)",
          backgroundColor: lamp ? "var(--lt-glow)" : "#26232c",
          backgroundImage: lamp
            ? "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,.95), transparent 70%), repeating-linear-gradient(0deg, rgba(60,50,80,.07) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(60,50,80,.07) 0 1px, transparent 1px 44px)"
            : "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 44px)",
          boxShadow: lamp ? "inset 0 0 40px rgba(255,240,200,.6), 0 24px 40px -26px rgba(20,6,40,.8)" : "inset 0 0 30px rgba(0,0,0,.6)",
        }}
        onPointerLeave={() => setLoupe(null)}
      >
        {total === 0 ? (
          <div className={`grid min-h-48 place-items-center rounded-lg border-2 border-dashed text-center ${lamp ? "border-[#351367]/25 text-[#5d5275]" : "border-white/20 text-white/60"}`}>
            <p className="text-sm" style={{ fontFamily: TYPE }}>
              The light table is empty.
            </p>
          </div>
        ) : (
          <ul ref={gridRef} role="list" className="relative grid grid-cols-2 gap-3 @md:grid-cols-3 @md:gap-4 @3xl:grid-cols-4 @5xl:grid-cols-5">
            {display.map((slide, i) => {
              const isDrag = drag?.id === slide.id;
              const isGrab = grabbed === slide.id;
              const slot = isDrag ? drag.slots[i] : null;
              const star = starred.has(slide.id);
              return (
                <li
                  key={slide.id}
                  ref={(el) => {
                    if (el) itemEls.current.set(slide.id, el);
                    else itemEls.current.delete(slide.id);
                  }}
                  className="relative"
                  style={
                    isDrag && slot
                      ? { transform: `translate(${drag.x - slot.left}px, ${drag.y - slot.top}px) scale(1.06) rotate(-2deg)`, zIndex: 30, transition: "none" }
                      : isGrab
                        ? { transform: "scale(1.06) rotate(-2deg)", zIndex: 20, transition: "transform .15s" }
                        : undefined
                  }
                >
                  <div
                    ref={(el) => {
                      if (el) mountEls.current.set(slide.id, el);
                      else mountEls.current.delete(slide.id);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-roledescription="sortable slide"
                    aria-describedby={`${uid}-help`}
                    aria-pressed={isGrab}
                    aria-label={`Slide ${i + 1} of ${total}: ${slide.alt}${star ? ", starred" : ""}`}
                    onPointerDown={(e) => onPointerDown(e, slide.id)}
                    onKeyDown={(e) => onKeyDown(e, slide)}
                    className={`group relative flex aspect-square touch-none flex-col justify-center rounded-[9%] px-[9%] select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#351367] ${
                      isDrag ? "cursor-grabbing" : "cursor-grab"
                    }`}
                    style={{
                      background: "linear-gradient(145deg, color-mix(in srgb, var(--lt-mount) 70%, white), var(--lt-mount) 45%, color-mix(in srgb, var(--lt-mount) 88%, black))",
                      boxShadow: isDrag || isGrab ? "0 22px 30px -12px rgba(20,6,40,.55), inset 0 1px 0 rgba(255,255,255,.9)" : "0 3px 6px -2px rgba(20,6,40,.35), inset 0 1px 0 rgba(255,255,255,.9), inset 0 -2px 0 rgba(0,0,0,.08)",
                    }}
                  >
                    {/* top label */}
                    <div className="absolute inset-x-[9%] top-[4%] flex items-center gap-1.5">
                      <span className="relative shrink-0 text-[11px] font-bold text-[#2b2238] @md:text-xs" style={{ fontFamily: MONO }}>
                        {pad(i + 1)}
                        {star && (
                          <svg viewBox="0 0 40 24" className="pointer-events-none absolute -inset-x-2 -inset-y-1.5 h-[calc(100%+12px)] w-[calc(100%+16px)] overflow-visible" aria-hidden="true">
                            <path d="M5 13c1-7 14-10 24-8 9 2 9 10 1 13-8 3-24 2-27-3-2-4 4-8 13-9" fill="none" stroke="var(--lt-pencil)" strokeWidth="2.6" strokeLinecap="round" className="lt-pencil" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-center text-[10px] text-[#2b2238]/70 @md:text-[11px]" style={{ fontFamily: TYPE }}>
                        {slide.caption ?? ""}
                      </span>
                    </div>

                    {/* film window */}
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[5%] bg-[#111] shadow-[inset_0_1px_3px_rgba(0,0,0,.6)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.src}
                        alt=""
                        draggable={false}
                        onPointerMove={(e) => onImageMove(e, slide)}
                        onPointerLeave={() => setLoupe(null)}
                        className="h-full w-full object-cover transition-[filter] duration-500"
                        style={{ filter: lamp ? "brightness(1.04) saturate(1.05)" : "brightness(.38) saturate(.6)" }}
                      />
                      {lamp && <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.18),transparent_40%)]" />}
                    </div>

                    {/* bottom strip */}
                    <div className="absolute inset-x-[7%] bottom-[2%] flex items-center justify-between">
                      <span className="hidden text-[9px] tracking-[0.2em] whitespace-nowrap text-[#2b2238]/45 @3xl:inline" style={{ fontFamily: MONO }}>
                        LOFI 400
                      </span>
                      <span className="flex gap-0.5 opacity-100 transition-opacity @3xl:opacity-0 @3xl:group-focus-within:opacity-100 @3xl:group-hover:opacity-100">
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => toggleStar(slide)}
                          aria-label={star ? `Remove star from slide ${i + 1}` : `Star slide ${i + 1}`}
                          aria-pressed={star}
                          className={`grid size-7 place-items-center rounded-full transition hover:bg-black/10 active:scale-90 ${star ? "text-[var(--lt-pencil)]" : "text-[#2b2238]/55"}`}
                        >
                          <svg viewBox="0 0 24 24" className="size-3.5" fill={star ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
                          </svg>
                        </button>
                        {removable && (
                          <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => remove(slide)}
                            aria-label={`Remove slide ${i + 1}`}
                            className="grid size-7 place-items-center rounded-full text-[#2b2238]/55 transition hover:bg-red-100 hover:text-red-700 active:scale-90"
                          >
                            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                              <path d="M6 6l12 12M18 6 6 18" />
                            </svg>
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* loupe */}
        {loupe && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-40 rounded-full border-[7px] border-[#1d1a22] shadow-[0_14px_30px_-6px_rgba(0,0,0,.55),inset_0_0_0_2px_rgba(255,255,255,.25)]"
            style={{
              left: loupe.left,
              top: loupe.top,
              width: LOUPE,
              height: LOUPE,
              backgroundImage: `url("${loupe.src}")`,
              backgroundSize: `${loupe.w}px ${loupe.h}px`,
              backgroundPosition: `${loupe.x}px ${loupe.y}px`,
              backgroundRepeat: "no-repeat",
              backgroundColor: "#111",
            }}
          >
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.35),transparent_40%)]" />
          </div>
        )}
      </div>

      {/* undo bar / hint */}
      <div className="mt-2 flex min-h-9 flex-wrap items-center justify-between gap-2 text-xs text-[#5d5275]">
        {removed ? (
          <p role="status" className="flex items-center gap-2 rounded-lg bg-[#2b2238] px-3 py-1.5 text-white">
            Slide removed.
            <button type="button" onClick={undo} className="rounded px-1.5 py-0.5 font-bold text-[#ffb347] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[#ffb347]">
              Undo
            </button>
          </p>
        ) : (
          <p>Drag slides to reorder · hover for the loupe · keyboard: Space to pick up, arrows to move, S to star</p>
        )}
      </div>

      <style>{`
        @keyframes lt-pencil { from { stroke-dashoffset: 120 } to { stroke-dashoffset: 0 } }
        .lt .lt-pencil { stroke-dasharray: 120; animation: lt-pencil .45s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .lt .lt-pencil { animation: none } }
      `}</style>
    </section>
  );
}

export default LightTableSorter;
