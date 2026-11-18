import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("rolling-stats-band")!;
const IMPORT_DIR = "src/components/rolling-stats";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { RollingStats } from "@/components/rolling-stats";

export default function Numbers() {
  return (
    <RollingStats
      eyebrow="Trusted by builders"
      title="Small components, big numbers."
      stats={[
        { label: "Developers", value: 48210, suffix: "+", delta: 18.2, deltaLabel: "vs last quarter", trend: [21040, 26120, 31250, 39050, 48210] },
        { label: "Revenue (ARR)", value: 2.84, prefix: "$", suffix: "M", decimals: 2, delta: 31, deltaLabel: "year over year" },
        { label: "Median load time", value: 182, suffix: " ms", delta: -12, lowerIsBetter: true },
      ]}
    />
  );
}

// Live numbers: keep \`value\` in state and update it — the digits roll up or down.
`;

const FEATURES = [
  "Every digit rolls into place like a mechanical counter when the band scrolls into view — staggered, with the last digit spinning longest.",
  "Live numbers: change a value and its digits roll up (or down) to the new number, with a pulsing LIVE dot.",
  "Change badges that know when lower is better, plus self-drawing trend lines with a hover tooltip.",
  "One shared number size so the band always lines up; 4 → 2 → 1 columns with container queries.",
  "Paper and ink (dark) variants, loading skeletons and an empty state.",
  "Screen readers get the real values and a trend summary; reduced motion shows final numbers instantly.",
];

export default async function RollingStatsBandPage() {
  const files = await loadComponentFiles(IMPORT_DIR, [{ name: "RollingStats.tsx" }, { name: "index.ts" }], USAGE);
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Scroll the band into view and the counters roll into place — press Reset to see it again. “Active right now” updates live. Hover a trend line to read a week, and try the Dark and Loading toggles."
      codeDescription="Copy the two files into src/components/rolling-stats — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/rolling-stats and paste each file from the tabs below."],
        ["Add your numbers", "Pass 1–4 stats with a label and value; prefix, suffix, delta and trend are optional."],
        ["Go live (optional)", "Keep a value in state and update it — the digits roll to the new number."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="Only stats is required — everything else is optional and typed."
      features={FEATURES}
    />
  );
}
