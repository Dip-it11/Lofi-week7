export type ComponentEntry = {
  slug: string;
  name: string;
  summary: string;
  /** Challenge week the component was shipped in. */
  week: number;
  /** Position within that week (1-based). */
  number: number;
  category: "Hero" | "Navigation" | "Content" | "Form" | "Feedback" | "Pricing" | "Media" | "People" | "Tools";
  tags: string[];
  addedOn: string;
};

/** Every component in the library. Add new entries here — each gets its own /components/<slug>/ page. */
export const COMPONENTS: ComponentEntry[] = [
  {
    slug: "cat-reveal-hero",
    name: "Cat Reveal Hero",
    summary:
      "A hero banner where a hand-drawn black cat walks in from the left, reveals the company name letter by letter behind it, then sits down at the end of the name.",
    week: 1,
    number: 1,
    category: "Hero",
    tags: ["Animation", "SVG rig", "Responsive", "Reduced motion"],
    addedOn: "2026-10-02",
  },
  {
    slug: "vinyl-player-card",
    name: "Vinyl Player Card",
    summary:
      "A lofi music card: the record peeks out of its sleeve on hover, then slides out, spins and gets the tonearm when you press play — with a beat generated live in the browser.",
    week: 1,
    number: 2,
    category: "Content",
    tags: ["Card", "Audio", "Web Audio", "Animation"],
    addedOn: "2026-10-05",
  },
  {
    slug: "radio-tuner-pricing",
    name: "Radio Tuner Pricing",
    summary:
      "A pricing section built as a retro radio: turn the knob, drag the dial or press a preset, and each plan comes in clearly through the static when you hit its station.",
    week: 2,
    number: 1,
    category: "Pricing",
    tags: ["Pricing", "Slider", "Web Audio", "Keyboard"],
    addedOn: "2026-10-14",
  },
  {
    slug: "typewriter-contact-form",
    name: "Typewriter Contact Form",
    summary:
      "A contact form typed onto paper in a typewriter — struck-ink letters, key clacks and a bell, red rubber-stamp errors, and a letter that folds into an envelope and flies off when sent.",
    week: 2,
    number: 2,
    category: "Form",
    tags: ["Form", "Validation", "Web Audio", "Animation"],
    addedOn: "2026-10-14",
  },
  {
    slug: "elevator-panel-navbar",
    name: "Elevator Panel Navbar",
    summary:
      "A sticky navbar built as a vintage elevator panel: a brass dial needle follows you as you scroll, direction lamps light up, and pressing a floor closes the doors, travels and dings open on that section.",
    week: 3,
    number: 1,
    category: "Navigation",
    tags: ["Navbar", "Scroll spy", "Web Audio", "Keyboard"],
    addedOn: "2026-10-14",
  },
  {
    slug: "film-projector-lightbox",
    name: "Film Projector Lightbox",
    summary:
      "An image gallery on a strip of film: open a frame and a projector warms up, throws a beam onto the screen and clacks to the next frame — with grain, flicker, swipe and full keyboard support.",
    week: 3,
    number: 2,
    category: "Content",
    tags: ["Lightbox", "Gallery", "Modal", "Web Audio"],
    addedOn: "2026-10-14",
  },
  {
    slug: "receipt-printer-toasts",
    name: "Receipt Printer Toasts",
    summary:
      "Toast notifications that print line by line out of a little thermal printer — stamped DONE, VOID, CHECK or NOTE, queued one at a time, and torn off with a swipe.",
    week: 4,
    number: 1,
    category: "Feedback",
    tags: ["Toast", "Notifications", "Queue", "Web Audio"],
    addedOn: "2026-10-29",
  },
  {
    slug: "filing-cabinet-faq",
    name: "Filing Cabinet FAQ",
    summary:
      "An FAQ accordion built as a metal filing cabinet: every question is a labelled drawer you pull open to find the answer on a manila folder — with search, locked drawers and keyboard support.",
    week: 4,
    number: 2,
    category: "Content",
    tags: ["Accordion", "FAQ", "Search", "Keyboard"],
    addedOn: "2026-10-29",
  },
  {
    slug: "answering-machine-recorder",
    name: "Answering Machine Voice Recorder",
    summary:
      "A voice recorder built as an 80s answering machine: real microphone recording after the beep, spinning tape reels, a VU meter, a blinking message counter and a tape log to play, send, download or delete messages.",
    week: 5,
    number: 1,
    category: "Media",
    tags: ["Audio recorder", "Microphone", "Web Audio", "WAV"],
    addedOn: "2026-11-16",
  },
  {
    slug: "rolodex-team-directory",
    name: "Rolodex Team Directory",
    summary:
      "A team directory you spin like a desk Rolodex: 3D cards with drag momentum, letter tabs, team filters and search, and cards that flip over for contact details and each person's local time.",
    week: 5,
    number: 2,
    category: "People",
    tags: ["Directory", "3D", "Drag", "Keyboard"],
    addedOn: "2026-11-16",
  },
  {
    slug: "light-table-slide-sorter",
    name: "Light Table Slide Sorter",
    summary:
      "Reorder photos like 35mm slides on a glowing light box: drag or use the keyboard, magnify with a loupe, star favourites with a grease pencil, remove with undo and save the new order.",
    week: 6,
    number: 1,
    category: "Content",
    tags: ["Drag and drop", "Sortable", "Keyboard", "Gallery"],
    addedOn: "2026-11-17",
  },
  {
    slug: "kaleidoscope-avatar-generator",
    name: "Kaleidoscope Avatar Generator",
    summary:
      "Type a name and twist the brass ring to get a one-of-a-kind kaleidoscope avatar — always the same for the same name — then download it as SVG or PNG or use it as a default avatar.",
    week: 6,
    number: 2,
    category: "Tools",
    tags: ["Avatar", "Generative SVG", "Export", "Deterministic"],
    addedOn: "2026-11-17",
  },
  {
    slug: "rolling-stats-band",
    name: "Rolling-Digit Stats Band",
    summary:
      "A landing-page stats band whose numbers roll into place like mechanical counters when it scrolls into view — with change badges, hoverable trend lines and live numbers that roll up and down.",
    week: 7,
    number: 1,
    category: "Content",
    tags: ["Stats", "Animation", "Sparkline", "Live data"],
    addedOn: "2026-11-18",
  },
  {
    slug: "onboarding-flow",
    name: "Multi-step Onboarding Form",
    summary:
      "A configurable sign-up / setup flow: progress rail, seven field types, per-step and server-side validation, a review page with edit, saved drafts and every submit state.",
    week: 7,
    number: 2,
    category: "Form",
    tags: ["Form", "Stepper", "Validation", "Drafts"],
    addedOn: "2026-11-18",
  },
];

export const getComponent = (slug: string) => COMPONENTS.find((c) => c.slug === slug);

export const componentLabel = (c: Pick<ComponentEntry, "week" | "number">) =>
  `Week ${c.week} · Component ${String(c.number).padStart(2, "0")}`;

/** Components grouped by week, in order. */
export function byWeek() {
  const weeks = new Map<number, ComponentEntry[]>();
  for (const c of [...COMPONENTS].sort((a, b) => a.week - b.week || a.number - b.number)) {
    weeks.set(c.week, [...(weeks.get(c.week) ?? []), c]);
  }
  return [...weeks.entries()].map(([week, items]) => ({ week, items }));
}
