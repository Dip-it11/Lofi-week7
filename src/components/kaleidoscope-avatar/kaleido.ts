/**
 * The deterministic kaleidoscope engine: the same name and settings always produce the same pattern.
 * A seeded random generator scatters "beads" inside one half-wedge; the avatar mirrors and rotates
 * that wedge around the centre. Twisting the tube slides the beads between the mirrors.
 */

export type KaleidoStyle = "beads" | "petals" | "crystals";
export type KaleidoPaletteName = "auto" | "lofi" | "sunset" | "ocean" | "mint" | "mono";
export type Symmetry = 6 | 8 | 10 | 12;

export type KaleidoConfig = {
  name: string;
  symmetry?: Symmetry | "auto";
  palette?: KaleidoPaletteName;
  style?: KaleidoStyle | "auto";
  /** Tube twist in degrees. */
  twist?: number;
};

export type BeadKind = "bead" | "petal" | "crystal" | "diamond" | "ring" | "dot";

export type Bead = {
  kind: BeadKind;
  r: number; // 0..1 of the radius
  theta: number; // 0..1 across the half wedge
  size: number;
  color: number;
  rot: number;
  speed: number;
  wob: number;
  phase: number;
  opacity: number;
};

export type Resolved = {
  seed: number;
  symmetry: Symmetry;
  style: KaleidoStyle;
  colors: string[];
  bg: [string, string];
  beads: Bead[];
};

/** FNV-1a 32-bit hash. */
export function hashString(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny seeded PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTES: Record<Exclude<KaleidoPaletteName, "auto">, { colors: string[]; bg: [string, string] }> = {
  lofi: { colors: ["#ffb347", "#f08a7e", "#c9a7ff", "#8b5cf6", "#fdf8ee"], bg: ["#3a1a6e", "#14062b"] },
  sunset: { colors: ["#ff6b6b", "#ffd166", "#f78c6b", "#ef476f", "#fff1d6"], bg: ["#4a1530", "#1a0710"] },
  ocean: { colors: ["#4cc9f0", "#4895ef", "#80ffdb", "#f1faee", "#3a86ff"], bg: ["#123056", "#06111f"] },
  mint: { colors: ["#80ed99", "#57cc99", "#c7f9cc", "#38a3a5", "#fefae0"], bg: ["#174238", "#071612"] },
  mono: { colors: ["#ffffff", "#d4d4d8", "#a1a1aa", "#71717a", "#f4f4f5"], bg: ["#3f3f46", "#0c0c0e"] },
};

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(((h % 360) + 360) % 360)} ${s}% ${l}%)`;

const WEIGHTS: Record<KaleidoStyle, [BeadKind, number][]> = {
  beads: [
    ["bead", 4],
    ["ring", 2],
    ["dot", 3],
    ["petal", 1],
  ],
  petals: [
    ["petal", 5],
    ["dot", 2],
    ["bead", 1],
    ["diamond", 1],
  ],
  crystals: [
    ["crystal", 4],
    ["diamond", 3],
    ["dot", 1],
    ["ring", 1],
  ],
};

export function resolve(config: KaleidoConfig): Resolved {
  const key = config.name.trim().toLowerCase() || "lofistack";
  const seed = hashString(key);
  const symmetry: Symmetry = config.symmetry && config.symmetry !== "auto" ? config.symmetry : ([6, 8, 10, 12] as const)[seed % 4];
  const styles: KaleidoStyle[] = ["beads", "petals", "crystals"];
  const style: KaleidoStyle = config.style && config.style !== "auto" ? config.style : styles[(seed >>> 3) % 3];

  let colors: string[];
  let bg: [string, string];
  const pal = config.palette ?? "auto";
  if (pal === "auto") {
    const h = (seed >>> 7) % 360;
    colors = [hsl(h, 82, 62), hsl(h + 38, 86, 62), hsl(h + 180, 70, 60), hsl(h - 42, 76, 72), hsl(h + 12, 70, 88)];
    bg = [hsl(h, 50, 22), hsl(h, 55, 7)];
  } else {
    ({ colors, bg } = PALETTES[pal]);
  }

  // Beads depend on the name and style, not on palette or symmetry, so recolouring keeps the shape.
  const rand = rng(hashString(`${key}|${style}`));
  const table = WEIGHTS[style];
  const totalW = table.reduce((a, [, w]) => a + w, 0);
  const pick = () => {
    let x = rand() * totalW;
    for (const [k, w] of table) {
      if ((x -= w) < 0) return k;
    }
    return table[0][0];
  };

  const beads: Bead[] = [];
  // a few large translucent "stained glass" pieces first
  for (let i = 0; i < 3; i++) {
    beads.push({
      kind: style === "crystals" ? "crystal" : style === "petals" ? "petal" : "bead",
      r: 0.25 + rand() * 0.55,
      theta: rand(),
      size: 16 + rand() * 14,
      color: Math.floor(rand() * colors.length),
      rot: rand() * 360,
      speed: (rand() - 0.5) * 1.2,
      wob: 0.5 + rand(),
      phase: rand() * Math.PI * 2,
      opacity: 0.35,
    });
  }
  const n = 11 + Math.floor(rand() * 5);
  for (let i = 0; i < n; i++) {
    beads.push({
      kind: pick(),
      r: 0.08 + rand() * 0.86,
      theta: rand(),
      size: 3 + rand() * 9,
      color: Math.floor(rand() * colors.length),
      rot: rand() * 360,
      speed: (rand() - 0.5) * 3,
      wob: 0.5 + rand() * 2,
      phase: rand() * Math.PI * 2,
      opacity: 0.8 + rand() * 0.2,
    });
  }
  return { seed, symmetry, style, colors, bg, beads };
}

/** Triangle wave: bounces any value back and forth between 0 and 1 (beads bounce off the mirrors). */
export const bounce = (x: number) => {
  const m = ((x % 2) + 2) % 2;
  return m <= 1 ? m : 2 - m;
};

/** A short code that identifies the avatar, e.g. "3F9A-8·T045". */
export const avatarCode = (r: Resolved, twist: number) =>
  `${r.seed.toString(16).toUpperCase().slice(0, 4)}-${r.symmetry}·T${String(Math.round(((twist % 360) + 360) % 360)).padStart(3, "0")}`;
