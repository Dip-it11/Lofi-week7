import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("onboarding-flow")!;
const IMPORT_DIR = "src/components/onboarding-flow";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { OnboardingFlow, type OnboardingStep } from "@/components/onboarding-flow";

const steps: OnboardingStep[] = [
  {
    id: "account",
    title: "Account",
    fields: [
      { type: "text", name: "name", label: "Full name", required: true },
      {
        type: "email",
        name: "email",
        label: "Work email",
        required: true,
        validate: async (v) => ((await emailTaken(String(v))) ? "That email already has a workspace." : null),
      },
    ],
  },
  {
    id: "role",
    title: "About you",
    fields: [
      { type: "choice", name: "role", label: "I'm a…", required: true, options: [
        { value: "freelancer", label: "Freelancer" },
        { value: "agency", label: "Agency" },
      ] },
    ],
  },
];

export default function Signup() {
  return (
    <OnboardingFlow
      steps={steps}
      storageKey="signup-draft"
      onSubmit={async (values) => {
        const res = await fetch("/api/workspaces", { method: "POST", body: JSON.stringify(values) });
        if (!res.ok) throw new Error("We couldn't create your workspace."); // shows Try again
      }}
    />
  );
}
`;

const FEATURES = [
  "Configure the whole flow with a list of steps — seven field types including option cards, limited chips, a range with a value bubble and switches.",
  "Per-step validation with server checks (“Checking…”), errors linked to fields, focus on the first problem and spoken summaries.",
  "A progress rail you can click back through, collapsing to a segmented bar on phones.",
  "An automatic review page with Edit links — edits return straight to the review.",
  "Drafts saved as people type and restored next visit, with Start over.",
  "Submitting, error with Try again (answers kept) and an animated success screen; Enter to continue, reduced-motion support.",
];

export default async function OnboardingFlowPage() {
  const files = await loadComponentFiles(IMPORT_DIR, [{ name: "OnboardingFlow.tsx" }, { name: "index.ts" }], USAGE);
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Press Continue with empty fields to see validation, use taken@lofistack.dev for the server check, then review, edit and submit. Reload halfway — your progress comes back. Tick “Simulate submit error” to see the failure state."
      codeDescription="Copy the two files into src/components/onboarding-flow — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/onboarding-flow and paste each file from the tabs below."],
        ["Describe your steps", "Pass steps with their fields; add validate for custom or server checks."],
        ["Handle submit", "onSubmit receives every answer — throw to show the error and Try again."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="steps and onSubmit are required — everything else is optional and typed."
      features={FEATURES}
    />
  );
}
