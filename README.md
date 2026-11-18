# Lofistack UI

Reusable, accessible React components for the **90 Day Build Challenge — Track A**.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
- **Output:** fully static export (`out/`) — host on Cloudflare Pages, Netlify, Vercel or GitHub Pages
- Every component lives at its own route: `/components/<slug>/`, with a live preview, props playground and copy-ready code.

## Components

| Component | Route |
| --- | --- |
| Week 1 · 01 — Cat Reveal Hero: a cat walks in, reveals the company name and sits down | `/components/cat-reveal-hero/` |
| Week 1 · 02 — Vinyl Player Card: a lofi music card with a spinning record, tonearm and a live-generated beat | `/components/vinyl-player-card/` |
| Week 2 · 01 — Radio Tuner Pricing: a pricing section you tune like a retro radio | `/components/radio-tuner-pricing/` |
| Week 2 · 02 — Typewriter Contact Form: a contact form typed onto paper, sent as a flying envelope | `/components/typewriter-contact-form/` |
| Week 3 · 01 — Elevator Panel Navbar: a sticky navbar with a floor dial, direction lamps and elevator doors | `/components/elevator-panel-navbar/` |
| Week 3 · 02 — Film Projector Lightbox: a film-strip gallery that opens on a flickering projector screen | `/components/film-projector-lightbox/` |
| Week 4 · 01 — Receipt Printer Toasts: notifications that print out of a thermal printer and tear off | `/components/receipt-printer-toasts/` |
| Week 4 · 02 — Filing Cabinet FAQ: an accordion of drawers you pull open to read the answers | `/components/filing-cabinet-faq/` |
| Week 5 · 01 — Answering Machine Voice Recorder: record voice messages after the beep on a tape answering machine | `/components/answering-machine-recorder/` |
| Week 5 · 02 — Rolodex Team Directory: a 3D card wheel of your team you spin, search and flip | `/components/rolodex-team-directory/` |
| Week 6 · 01 — Light Table Slide Sorter: drag-and-drop photo ordering on a glowing light box with a loupe | `/components/light-table-slide-sorter/` |
| Week 6 · 02 — Kaleidoscope Avatar Generator: a unique, repeatable kaleidoscope avatar from any name | `/components/kaleidoscope-avatar-generator/` |
| Week 7 · 01 — Rolling-Digit Stats Band: landing-page numbers that roll in like mechanical counters, with trends and live updates | `/components/rolling-stats-band/` |
| Week 7 · 02 — Multi-step Onboarding Form: a configurable setup flow with validation, review, drafts and submit states | `/components/onboarding-flow/` |

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static site in ./out
```

## Deploy to GitHub Pages

The repo includes `.github/workflows/deploy.yml`, which builds the site and publishes it on every push to `main`.

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the workflow from the **Actions** tab).
3. The site appears at `https://<user>.github.io/<repo>/` — component pages at `/components/<slug>/`.

The workflow sets `NEXT_PUBLIC_BASE_PATH=/<repo>` automatically (empty for `<user>.github.io` repos).

## Other hosts

`npm run build` writes a static site to `out/` that also works on Cloudflare Pages, Netlify or Vercel (leave `NEXT_PUBLIC_BASE_PATH` unset).

## Adding a component

1. Build it in `src/components/<slug>/` with typed props.
2. Register it in `src/lib/registry.ts`.
3. Create `src/app/components/<slug>/page.tsx` (preview + playground + code).
