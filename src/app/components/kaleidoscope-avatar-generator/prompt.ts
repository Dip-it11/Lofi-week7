/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable React avatar generator called <KaleidoscopeAvatarGenerator /> that turns any name into a unique, repeatable kaleidoscope avatar, plus a standalone <KaleidoAvatar name="…" /> to use as a default profile picture.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Pure SVG + a seeded random generator — no canvas libraries, no images, no audio files.

## The engine (deterministic)
- Hash the lower-cased name with FNV-1a and seed a mulberry32 PRNG. Same name + settings must always draw the exact same picture.
- From the seed pick (unless overridden): mirrors 6 / 8 / 10 / 12, a style (beads, petals or crystals) and an auto palette (5 HSL colours around a seeded hue + a dark radial background). Presets: lofi, sunset, ocean, mint, mono.
- Generate ~15 "pieces" inside ONE half-wedge (3 big translucent stained-glass shapes + 11–15 small ones): bead (circle + highlight), petal (ellipse), crystal (triangle), diamond, ring, dot — each with radius, angle, size, colour, rotation, speed, wobble and phase.
- Draw: put the pieces in a <g> clipped to the half-wedge (angle 180°/N, with a 0.6° overlap so there are no seams), then for i in 0..N−1 render <use> of it rotated i·360°/N plus a mirrored copy (scale(1 −1)). Clip the whole thing to a circle or a rounded square, add a centre jewel and a faint rim.
- Twist: each piece's angle = bounce(theta + twist/360 · speed) (a triangle wave so pieces bounce between the mirrors) and its radius wobbles with sin(twist · wob + phase) — twisting makes the whole pattern tumble like a real kaleidoscope.
- Use useId for every SVG id so many avatars can share a page. Show an avatar code like "6AE8-12·T045".

## Generator UI
- Left: the eyepiece — a knurled brass ring (repeating-conic-gradient, rotates with the twist, with a grip dot), a dark tube rim, the live avatar and a glass glare. Drag around the ring (atan2), scroll or use the arrow keys to twist (role="slider", aria-valuetext "Twist 45 degrees"; ←/→ 5°, PageUp/Down 45°, Home resets). Buttons: ⟲ ⟳ (15°), a TWIST 045° readout, Shake (animated random spin) and a sound toggle (tiny glass-bead clicks while twisting).
- Right: "Name or email" input (typewriter font), Mirrors (Auto shows the picked number), Colours chips with swatches, Pieces, Shape (circle / rounded), live previews at 96 / 64 / 40 / 28px and a profile chip, and export: ↓ SVG, ↓ PNG 512 (draw the serialized SVG onto a canvas), Copy SVG — with ✓ saved / ✓ copied / error states.
- Empty name: the tube slowly turns by itself and downloads are disabled.
- Accessibility: the avatar is role="img" with "Avatar for {name}" (or decorative with label=""); toggle groups use aria-pressed; a polite live region announces downloads and twist; prefers-reduced-motion stops the idle spin and animated shakes.
- Container queries: viewer and controls side by side when wide, stacked when narrow.

## Props (typed)
Generator: defaultName = "Lofistack", onChange(config), onExport(blob, "svg" | "png"), pngSize = 512, defaultSound = false, className.
KaleidoAvatar: name, size = 64, symmetry ("auto" | 6 | 8 | 10 | 12), palette, style, twist = 0, shape ("circle" | "rounded"), label, className.

## Files
- src/components/kaleidoscope-avatar/KaleidoscopeAvatarGenerator.tsx
- src/components/kaleidoscope-avatar/KaleidoAvatar.tsx
- src/components/kaleidoscope-avatar/kaleido.ts (hash, PRNG, palettes, piece generator)
- src/components/kaleidoscope-avatar/kaleidoSound.ts
- src/components/kaleidoscope-avatar/index.ts`;
