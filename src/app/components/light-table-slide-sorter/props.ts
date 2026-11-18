import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "items", type: "Slide[]", description: "Required. { id, src, alt, caption? } in their starting order. alt is required and is read out for each slide." },
  { name: "onChange", type: "(items: Slide[]) => void", description: "Called with the new order after every drop, keyboard move, removal or undo." },
  { name: "onSave", type: "(items: Slide[]) => Promise<void> | void", description: "Adds a “Save order” button once the order changes — Saving… / ✓ Saved / Not saved — retry." },
  { name: "onStarChange", type: "(ids: string[]) => void", description: "Called with every starred slide id when a star is added or removed." },
  { name: "defaultStarred", type: "string[]", default: "[]", description: "Slide ids that start with a grease-pencil star." },
  { name: "removable", type: "boolean", default: "true", description: "Allow removing slides (✕ or Delete) with a 6-second undo." },
  { name: "defaultLoupe", type: "boolean", default: "true", description: "Show the magnifying loupe when hovering a photo (mouse and pen only)." },
  { name: "zoom", type: "number", default: "2.6", description: "Loupe magnification." },
  { name: "defaultSound", type: "boolean", default: "false", description: "Start with pick-up, snap and lamp sounds on." },
  { name: "title", type: "string", default: '"Light table"', description: "Heading on the toolbar and accessible name of the section." },
  { name: "palette", type: "Partial<LightTablePalette>", default: "Warm light box", description: "{ frame, mount, glow, pencil }." },
  { name: "className", type: "string", description: "Extra classes for the section." },
];
