import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("light-table-slide-sorter")!;
const IMPORT_DIR = "src/components/light-table-sorter";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { LightTableSorter } from "@/components/light-table-sorter";

const photos = [
  { id: "p1", src: "/gallery/ridge.jpg", alt: "Purple mountains at sunset", caption: "Ridge line" },
  { id: "p2", src: "/gallery/city.jpg", alt: "City skyline at night", caption: "Night shift" },
  { id: "p3", src: "/gallery/sea.jpg", alt: "Sun setting over the sea", caption: "Low tide" },
];

export default function GalleryOrder() {
  return (
    <LightTableSorter
      items={photos}
      title="Portfolio order"
      onSave={async (items) => {
        const res = await fetch("/api/gallery/order", { method: "PUT", body: JSON.stringify(items.map((i) => i.id)) });
        if (!res.ok) throw new Error("Not saved"); // shows "Not saved — retry"
      }}
    />
  );
}
`;

const FEATURES = [
  "Drag slides with mouse or touch — the others glide out of the way (FLIP) and the dropped slide snaps into place.",
  "Full keyboard reordering: Space to pick up, arrows to move (up / down jump a row), Space to drop, Escape to cancel — every step announced.",
  "A magnifying loupe follows the pointer at 2.6× with the photo lined up exactly under the glass.",
  "Grease-pencil stars, remove with a 6-second undo, a lamp switch that dims the table, Reset and Save order with saving / saved / error states.",
  "onChange, onSave and onStarChange hooks hand you the new order to store anywhere.",
  "Container-query grid from 2 to 5 columns, optional plastic-click sounds, reduced-motion support.",
];

export default async function LightTableSlideSorterPage() {
  const files = await loadComponentFiles(
    IMPORT_DIR,
    [{ name: "LightTableSorter.tsx" }, { name: "slideSound.ts" }, { name: "index.ts" }],
    USAGE,
  );
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Drag the slides to reorder them, hover a photo for the loupe, star your favourites, remove one and undo, switch the lamp off, then save the order. Keyboard: Tab to a slide, Space to pick up, arrows to move, Space to drop."
      codeDescription="Copy the three files into src/components/light-table-sorter — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/light-table-sorter and paste each file from the tabs below."],
        ["Pass your photos", "Give each slide a stable id, a src and a real alt."],
        ["Store the order", "Use onSave (or onChange) to send the new order to your backend."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="Only items is required — everything else is optional and typed."
      features={FEATURES}
    />
  );
}
