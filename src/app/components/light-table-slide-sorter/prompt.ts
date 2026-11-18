/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable React drag-and-drop photo sorter called <LightTableSorter /> styled as 35mm slides on a glowing photographer's light table.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Client component ("use client"). Pointer Events + the Web Animations API — no drag-and-drop, animation or audio libraries.

## Look
- A light box: a dark aluminium frame (#3a3542) around a warm white glowing surface with a soft centre glow and faint 44px grid lines. A Lamp switch turns it off: the surface goes dark and the photos dim (brightness .38).
- Slides in a responsive grid (2 → 3 → 4 → 5 columns with @container queries): square cream plastic mounts with a bevel and shadow, a 3:2 film window with the photo (object-cover) and a glass sheen, the slide number (01, 02…) top-left, the caption in Special Elite, and "LOFI 400" at the bottom.
- Star: a red grease-pencil loop drawn around the number (an SVG path with an animated stroke-dashoffset).
- Toolbar: title, "8 slides · 2 starred · order changed", Lamp, Loupe and sound toggles, Reset and "Save order" (only when the order changed).

## Reordering
- Pointer drag: start after 6px of movement; measure every grid slot once; the picked slide follows the pointer (scale 1.06, rotate −2°, big shadow) while the order updates to the nearest slot centre, so the others make room live. On drop, animate it from the pointer into its slot with an overshoot "snap" easing. Escape cancels.
- The other slides glide to their new places with a FLIP animation (compare offsetLeft/Top before and after each reorder and animate the difference with element.animate).
- Keyboard: each slide is focusable (role="button", aria-roledescription="sortable slide"). Space/Enter picks up, arrow keys move it (up/down jump a whole row — count the columns from the layout), Home/End, Space drops, Escape cancels. Keep focus on the moved slide. Without a slide picked up, arrows move focus between slides, S stars, Delete removes, Z shows the loupe.
- Live region (assertive) announces "Picked up slide 3…", "Position 5 of 8", "Dropped", "Move cancelled".

## Loupe
- Hovering a photo with a mouse or pen shows a round magnifier (150px, dark rim, glass highlight) that follows the pointer and shows the photo at 2.6× — compute the object-cover size and offset from naturalWidth/Height so the zoomed image lines up exactly.

## Other states
- Remove (✕ or Delete) with a 6-second "Slide removed · Undo" bar that restores it at the same position.
- Save: onSave(order) — Saving… with a spinner, ✓ Saved (becomes the new baseline), or "Not saved — retry". Reset returns to the saved order.
- Empty state: "The light table is empty."
- Optional Web Audio sounds (off): a plastic tick on pick-up, a snap on drop and a lamp click with a short fluorescent buzz.
- prefers-reduced-motion: no pencil animation; transitions are short.

## Props (typed)
items: { id, src, alt, caption? }[] (required), onChange(items), onSave(items), onStarChange(ids), defaultStarred = [], removable = true, defaultLoupe = true, zoom = 2.6, defaultSound = false, title = "Light table", palette { frame, mount, glow, pencil }, className.

## Files
- src/components/light-table-sorter/LightTableSorter.tsx
- src/components/light-table-sorter/slideSound.ts
- src/components/light-table-sorter/index.ts`;
