import type { OnboardingStep } from "@/components/onboarding-flow";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A workspace sign-up flow used in the preview. */
export const DEMO_STEPS: OnboardingStep[] = [
  {
    id: "account",
    title: "Account",
    heading: "First, who's setting this up?",
    description: "We'll use this to create your login.",
    fields: [
      { type: "text", name: "name", label: "Full name", required: true, autoComplete: "name", placeholder: "Ada Okafor" },
      {
        type: "email",
        name: "email",
        label: "Work email",
        required: true,
        autoComplete: "email",
        placeholder: "ada@company.com",
        hint: "Try taken@lofistack.dev to see the server check.",
        validate: async (v) => {
          await wait(700); // pretend to ask the server
          return String(v).trim().toLowerCase() === "taken@lofistack.dev" ? "That email already has a workspace. Log in instead, or use another email." : null;
        },
      },
      { type: "text", name: "company", label: "Company", placeholder: "Lofistack Studio", autoComplete: "organization" },
    ],
  },
  {
    id: "role",
    title: "About you",
    heading: "Which best describes you?",
    description: "We'll tailor templates and examples to fit.",
    fields: [
      {
        type: "choice",
        name: "role",
        label: "I'm a…",
        required: true,
        options: [
          { value: "freelancer", label: "Freelancer", description: "I build sites and apps for clients." },
          { value: "agency", label: "Agency", description: "A team shipping work for many clients." },
          { value: "startup", label: "Startup", description: "We're building our own product." },
          { value: "inhouse", label: "In-house team", description: "Design or engineering at a larger company." },
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Goals",
    heading: "What are you building first?",
    description: "Pick up to three — you can change this later.",
    fields: [
      {
        type: "multi",
        name: "goals",
        label: "Projects",
        required: true,
        max: 3,
        options: [
          { value: "landing", label: "Landing pages" },
          { value: "dashboard", label: "Dashboards" },
          { value: "ecommerce", label: "E-commerce" },
          { value: "saas", label: "SaaS app" },
          { value: "portfolio", label: "Portfolio" },
          { value: "docs", label: "Docs site" },
          { value: "internal", label: "Internal tools" },
        ],
      },
      { type: "range", name: "team", label: "Team size", min: 1, max: 50, format: (v) => (v >= 50 ? "50+ people" : v === 1 ? "Just me" : `${v} people`) },
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    heading: "Name your workspace",
    description: "This is the address your team will use.",
    fields: [
      {
        type: "text",
        name: "slug",
        label: "Workspace address",
        required: true,
        prefix: "lofistack.app/",
        placeholder: "your-team",
        hint: "Lowercase letters, numbers and hyphens, 3–30 characters.",
        validate: (v) => (/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/.test(String(v)) ? null : "Use 3–30 lowercase letters, numbers or hyphens (no spaces, no hyphen at the ends)."),
      },
      { type: "toggle", name: "digest", label: "Weekly digest", description: "New components and tips, every Friday. No spam." },
      { type: "textarea", name: "notes", label: "Anything we should know?", maxLength: 240, placeholder: "e.g. we're migrating from another library…" },
    ],
  },
];
