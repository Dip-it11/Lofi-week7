import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("kaleidoscope-avatar-generator")!;
const IMPORT_DIR = "src/components/kaleidoscope-avatar";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { KaleidoAvatar, KaleidoscopeAvatarGenerator } from "@/components/kaleidoscope-avatar";

// 1) The full generator — e.g. on a profile settings page
export function AvatarSettings() {
  return (
    <KaleidoscopeAvatarGenerator
      defaultName="Ada Okafor"
      onChange={(config) => saveAvatarSettings(config)} // store it to redraw the same avatar
      onExport={(file, format) => uploadAvatar(file, format)}
    />
  );
}

// 2) Just the avatar — a default profile picture for anyone, from their name
export function UserChip({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <KaleidoAvatar name={name} size={32} label="" />
      {name}
    </span>
  );
}
`;

const FEATURES = [
  "Deterministic: the same name and settings always draw the exact same avatar — no storage needed, just the name.",
  "Twist the knurled brass ring (drag, scroll or arrow keys) and the pieces tumble between the mirrors like a real kaleidoscope.",
  "Mirrors 6 / 8 / 10 / 12, six colour palettes, beads / petals / crystals, circle or rounded shape.",
  "Live previews at 96, 64, 40 and 28px plus a profile chip; download SVG or PNG, or copy the SVG code.",
  "<KaleidoAvatar /> on its own makes instant default profile pictures for every user in your app.",
  "Pure SVG with unique ids, slider semantics on the ring, glass-bead sounds and reduced-motion support.",
];

export default async function KaleidoscopeAvatarGeneratorPage() {
  const files = await loadComponentFiles(
    IMPORT_DIR,
    [{ name: "KaleidoscopeAvatarGenerator.tsx" }, { name: "KaleidoAvatar.tsx" }, { name: "kaleido.ts" }, { name: "kaleidoSound.ts" }, { name: "index.ts" }],
    USAGE,
  );
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Type your name, then twist the brass ring — drag it, scroll over it or use the arrow keys. Change the mirrors, colours and pieces, then download your avatar as SVG or PNG."
      codeDescription="Copy the five files into src/components/kaleidoscope-avatar — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/kaleidoscope-avatar and paste each file from the tabs below."],
        ["Use the avatar", "Drop <KaleidoAvatar name={user.name} /> wherever a profile picture is missing."],
        ["Let people pick", "Add the generator to settings and store the config from onChange."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="The generator's props are all optional; the last row is the standalone avatar component."
      features={FEATURES}
    />
  );
}
