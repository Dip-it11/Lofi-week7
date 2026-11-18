/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable React team directory called <RolodexDirectory /> that looks and works like a spinning desk Rolodex card file.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Client component ("use client"). CSS 3D transforms + requestAnimationFrame — no 3D, gesture, UI or audio libraries.

## Look
- Index cards (cream #fdf8ee with faint blue ruled lines and a red margin line) standing on a chrome rail, above a purple base with a brass plate showing "03 / 16" and two round knobs at the ends of the rail that turn as the wheel spins.
- Each card: a letter tab sticking up from the top edge (its position shifts with the letter so tabs stagger like a real Rolodex; the front card's tab is amber), a slightly rotated photo or stamped initials on a colour picked from the name, the name in Special Elite, role, team badge, and city with live local time (☀ during 07–19, ☾ at night). Two rail slots are cut into the bottom edge.
- 3D wheel: the front card stands upright; the next cards lean back 11° each so their tops and tabs peek above it (perspective 640px, perspective-origin above the stage); the card being flicked away falls forward 78° and fades. Cards further back get a darker shade (an overlay, not a CSS filter, so 3D isn't flattened). Every card rotates around the rail axis below it (transform-origin: 50% calc(100% + 46px)).
- Above the wheel: a search box, team filter chips (Everyone + each team) and an A–Z letter index (letters with nobody are disabled, the current letter is highlighted). Up / down round buttons beside the wheel.

## Behaviour
- Keep one number, the wheel position (it can grow past the list length — the wheel loops with modulo). Render ~8 cards from floor(position) onwards, each with d = index − position, so cards move smoothly between slots.
- Drag up or down to spin (56 px per card); on release, use the last few pointer samples for velocity and glide to the nearest card with an ease-out (momentum). Mouse wheel / trackpad spins one card per 50 px of delta (a non-passive wheel listener so the page doesn't scroll while you're over the wheel).
- Letter tabs, type-ahead letters and search spin the shortest way round to the target. Search matches name first, then role, team or city; Enter jumps to the next match, with "No card for “…”" when nothing matches.
- Team chips filter the cards and reset the wheel.
- Click the front card (or its ↻ button, or Enter / Space) to flip it over (rotateY 180°, backface-visibility hidden) to the back: email with mailto + a Copy button (Copied state), phone with tel:, local time "· working hours / · probably asleep", link chips and a short red note. Spinning flips it back.
- Optional Web Audio sounds (off by default): a short card flick each time a card passes (rate-limited) and a paper swish on flip.

## Accessibility
- The section has aria-roledescription="carousel" and a label; the wheel is a focusable group: Arrow Up / Down (or Left / Right) spin, Page Up / Down jump five, Home / End go to the ends, letters jump, Enter / Space flip, Escape flips back.
- Only the front card is interactive and exposed (role="group", aria-roledescription="card", "3 of 16: Name, Role"); the others are aria-hidden and inert, and the hidden face of the flipped card is inert.
- A polite live region announces the card the wheel settles on and team filter changes. All buttons have labels; the letter index uses aria-current.
- prefers-reduced-motion: spins jump straight to the card, no momentum or flip animation.

## Props (typed)
people: { id?, name, role, team?, email?, phone?, location?, timezone?, photo?, links?: { label, href }[], note? }[] (required), title = "Team directory", searchable = true, defaultSound = false, onSelect(person), palette { base, card, ink, accent }, className.

## Files
- src/components/rolodex-directory/RolodexDirectory.tsx
- src/components/rolodex-directory/rolodexSound.ts
- src/components/rolodex-directory/index.ts`;
