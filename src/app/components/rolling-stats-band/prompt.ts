/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable React stats band called <RollingStats /> for landing pages, where every number rolls into place like a mechanical counter when the band scrolls into view.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Client component ("use client"). CSS transforms + IntersectionObserver — no animation or chart libraries.

## Look (editorial, not cartoonish)
- A rounded band on warm paper (#fbf8f1) with a very faint SVG film-grain overlay (feTurbulence, ~7% opacity) and hairline rules; an "ink" variant on deep purple (#170a2c) with a soft purple glow and cream text.
- Header: small mono eyebrow, a tight bold title, and a short description on the right.
- Up to 4 stats in columns separated by hairlines (4 → 2 → 1 columns with container queries). Each: mono "01 DEVELOPERS" label (+ a pulsing green LIVE dot for live stats), a huge light-weight number (font-weight 300, tracking −0.04em, tabular numerals, suffix smaller and lighter), a change badge (▲/▼ with green for good, rose for bad — respect lowerIsBetter), a one-line description, and a sparkline.
- All numbers in the band share one font size, computed from the longest number so everything lines up.

## Rolling digits
- Format with Intl.NumberFormat (locale, decimals, standard or compact). Split the string: separators, prefix and suffix are static; each digit is a column.
- Each column is a 1em-tall window (overflow hidden, with a soft top/bottom mask fade) holding a vertical strip of 60 digits (six 0–9 cycles). Show a digit by translateY(-pos em).
- On scroll-in (IntersectionObserver, threshold .3) each column rolls from 0 through one full lap (the last digit through two) with cubic-bezier(.16,1,.3,1), staggered 70ms left to right, each stat 120ms after the one before.
- When value changes later, roll forward for increases and backward for decreases; after the transition, silently re-centre the strip (keep pos within the middle cycles) so it never runs out. Derive the new position while rendering (no setState in effects). Key columns from the right so growing numbers keep their columns.

## Sparkline
- SVG viewBox 0 0 100 30, normalised points, a line that draws itself (pathLength 1 + stroke-dashoffset) and a fading gradient area, an end dot, and a hover crosshair + tooltip ("Week 7 · 34,400+").

## States & accessibility
- loading → skeleton blocks; no stats → "No numbers to show yet."
- The animated number is aria-hidden; a visually-hidden copy holds the real value ("48,210+"), the badge says "Up/Down", and the sparkline has a text summary ("Trend up from 21,040 to 48,210"). Use a <dl> with dt/dd.
- prefers-reduced-motion: no rolling or drawing — show final values.

## Props (typed)
stats: { id?, label, value, prefix?, suffix?, decimals?, notation?, description?, delta?, deltaLabel?, lowerIsBetter?, trend?, trendLabels?, live? }[] (required), eyebrow, title, description, variant "paper" | "ink", locale = "en-US", duration = 1700, loading = false, className.

## Files
- src/components/rolling-stats/RollingStats.tsx
- src/components/rolling-stats/index.ts`;
