import { useId, type Ref } from "react";
import { bounce, resolve, type Bead, type KaleidoConfig } from "./kaleido";

export type KaleidoAvatarProps = KaleidoConfig & {
  /** Rendered size in px. */
  size?: number;
  /** Circle (default) or rounded square. */
  shape?: "circle" | "rounded";
  /** Accessible label. Defaults to "Avatar for {name}". Pass "" to make it decorative. */
  label?: string;
  className?: string;
  /** Ref to the <svg> element (e.g. to export it). */
  svgRef?: Ref<SVGSVGElement>;
};

const R = 100;

function beadShape(b: Bead, color: string, key: number, twist: number, halfWedge: number) {
  const t = (twist * Math.PI) / 180;
  const theta = bounce(b.theta + (twist / 360) * b.speed) * halfWedge;
  const r = Math.max(0.05, Math.min(0.98, b.r + 0.12 * Math.sin(t * b.wob + b.phase))) * R;
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  const rot = b.rot + twist * b.speed * 2;
  const s = b.size;
  const common = { fill: color, opacity: b.opacity };
  const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`;
  switch (b.kind) {
    case "bead":
      return (
        <g key={key} transform={tf}>
          <circle r={s} {...common} />
          <circle cx={-s * 0.35} cy={-s * 0.35} r={s * 0.3} fill="#fff" opacity={0.35 * b.opacity} />
        </g>
      );
    case "petal":
      return <ellipse key={key} transform={tf} rx={s * 1.7} ry={s * 0.6} {...common} />;
    case "crystal":
      return <path key={key} transform={tf} d={`M0 ${-s * 1.3} L${s * 1.1} ${s * 0.8} L${-s * 1.1} ${s * 0.8} Z`} {...common} />;
    case "diamond":
      return <path key={key} transform={tf} d={`M0 ${-s * 1.4} L${s * 0.8} 0 L0 ${s * 1.4} L${-s * 0.8} 0 Z`} {...common} />;
    case "ring":
      return <circle key={key} transform={tf} r={s} fill="none" stroke={color} strokeWidth={Math.max(1.2, s * 0.35)} opacity={b.opacity} />;
    case "dot":
      return <circle key={key} transform={tf} r={Math.max(1.4, s * 0.45)} {...common} />;
  }
}

/** A deterministic kaleidoscope avatar — the same name (and settings) always draws the same picture. */
export function KaleidoAvatar({ size = 64, shape = "circle", label, className, svgRef, ...config }: KaleidoAvatarProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = resolve(config);
  const twist = config.twist ?? 0;
  const half = Math.PI / r.symmetry; // half of one mirror wedge
  const halfDeg = 180 / r.symmetry;
  const o = 0.6; // overlap (deg) so there are no hairline seams
  const a1 = ((halfDeg + o) * Math.PI) / 180;
  const a0 = (-o * Math.PI) / 180;
  const wedge = `M0 0 L${(110 * Math.cos(a0)).toFixed(2)} ${(110 * Math.sin(a0)).toFixed(2)} A110 110 0 0 1 ${(110 * Math.cos(a1)).toFixed(2)} ${(110 * Math.sin(a1)).toFixed(2)} Z`;
  const name = config.name.trim();
  const aria = label ?? `Avatar for ${name || "Lofistack"}`;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="-100 -100 200 200"
      width={size}
      height={size}
      role={aria ? "img" : undefined}
      aria-label={aria || undefined}
      aria-hidden={aria ? undefined : true}
      className={className}
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={r.bg[0]} />
          <stop offset="1" stopColor={r.bg[1]} />
        </radialGradient>
        <clipPath id={`${id}-wedge`}>
          <path d={wedge} />
        </clipPath>
        <clipPath id={`${id}-frame`}>{shape === "circle" ? <circle r="100" /> : <rect x="-100" y="-100" width="200" height="200" rx="34" />}</clipPath>
        <g id={`${id}-half`} clipPath={`url(#${id}-wedge)`}>
          {r.beads.map((b, i) => beadShape(b, r.colors[b.color], i, twist, half))}
        </g>
      </defs>
      <g clipPath={`url(#${id}-frame)`}>
        <rect x="-100" y="-100" width="200" height="200" fill={`url(#${id}-bg)`} />
        {Array.from({ length: r.symmetry }, (_, i) => (
          <g key={i} transform={`rotate(${(i * 360) / r.symmetry})`}>
            <use href={`#${id}-half`} xlinkHref={`#${id}-half`} />
            <use href={`#${id}-half`} xlinkHref={`#${id}-half`} transform="scale(1 -1)" />
          </g>
        ))}
        <circle r="7" fill={r.colors[4]} opacity=".9" />
        <circle r="3" fill={r.colors[0]} />
        {shape === "circle" ? (
          <circle r="98.5" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="3" />
        ) : (
          <rect x="-98.5" y="-98.5" width="197" height="197" rx="33" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="3" />
        )}
      </g>
    </svg>
  );
}

export default KaleidoAvatar;
