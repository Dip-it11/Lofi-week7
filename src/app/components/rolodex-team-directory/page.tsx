import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("rolodex-team-directory")!;
const IMPORT_DIR = "src/components/rolodex-directory";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { RolodexDirectory } from "@/components/rolodex-directory";

const team = [
  { name: "Ada Okafor", role: "Head of Design", team: "Design", email: "ada@example.com", location: "Lagos", timezone: "Africa/Lagos" },
  { name: "Bruno Castell", role: "Frontend Engineer", team: "Engineering", email: "bruno@example.com", location: "Barcelona", timezone: "Europe/Madrid" },
  { name: "Grace Liu", role: "Design Engineer", team: "Engineering", photo: "/team/grace.jpg", timezone: "Asia/Taipei" },
];

export default function Team() {
  return <RolodexDirectory people={team} title="Meet the team" />;
}
`;

const FEATURES = [
  "A real 3D card wheel: upcoming cards fan out behind with their letter tabs peeking over, the front card falls forward as you spin.",
  "Drag with momentum, mouse wheel, up / down buttons or the arrow keys — the side knobs turn as it spins, and the wheel loops forever.",
  "A–Z letter tabs, type-ahead letters, team filter chips and a search that spins the shortest way round to the match.",
  "Flip a card for email (with Copy), phone, links, a note and the person's live local time with ☀ / ☾.",
  "Only the front card is interactive and announced (“3 of 16: Name, Role”); the rest are hidden from assistive tech.",
  "Container-query layout for any width, optional flick sounds, and reduced-motion support.",
];

export default async function RolodexTeamDirectoryPage() {
  const files = await loadComponentFiles(
    IMPORT_DIR,
    [{ name: "RolodexDirectory.tsx" }, { name: "rolodexSound.ts" }, { name: "index.ts" }],
    USAGE,
  );
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Drag the cards up or down, scroll, or use the arrow keys to spin. Click a card to flip it, jump with the letter tabs, filter by team or search for a name or city."
      codeDescription="Copy the three files into src/components/rolodex-directory — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/rolodex-directory and paste each file from the tabs below."],
        ["Load the font", "Special Elite (--font-typewriter) gives the cards their typed look."],
        ["Add your people", "Pass people with a timezone (IANA name) to show each person's local time."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="Only people is required — everything else is optional and typed."
      features={FEATURES}
    />
  );
}
