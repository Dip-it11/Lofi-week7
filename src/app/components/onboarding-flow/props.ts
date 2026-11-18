import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "steps", type: "OnboardingStep[]", description: "Required. { id, title, heading?, description?, fields } — fields are text / email / url / tel (with prefix), textarea, choice, multi (min / max), range (format) or toggle." },
  { name: "onSubmit", type: "(values) => Promise<void> | void", description: "Required. Called from the review step with every answer. A rejection shows the error, keeps the answers and offers Try again." },
  { name: "field.validate", type: "(value, values) => string | null | Promise", description: "Per-field custom check — return a message to block the step. Async works (shows “Checking…”)." },
  { name: "initialValues", type: "FormValues", description: "Starting answers, keyed by field name." },
  { name: "storageKey", type: "string", description: "Save a draft in localStorage as people type and restore it next visit (with Dismiss / Start over)." },
  { name: "eyebrow", type: "string", default: '"Set up your workspace"', description: "Small label above every step heading." },
  { name: "submitLabel", type: "string", default: '"Create workspace"', description: "Text on the final submit button." },
  { name: "successTitle", type: "string", default: '"You\'re all set."', description: "Heading on the success screen." },
  { name: "successMessage", type: "string", description: "Paragraph on the success screen." },
  { name: "onStepChange", type: "(index: number) => void", description: "Called when the visible step changes (steps.length = review) — handy for analytics." },
  { name: "className", type: "string", description: "Extra classes for the section." },
];
