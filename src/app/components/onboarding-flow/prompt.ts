/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable, schema-driven multi-step onboarding form called <OnboardingFlow /> in React.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Client component ("use client"). No form, validation or animation libraries.

## API
- steps: { id, title, heading?, description?, fields }[]. Field types: text / email / url / tel (optional prefix like "lofistack.app/"), textarea (maxLength counter), choice (radio cards with descriptions), multi (chips with min / max — disable the rest when full and show "3/3"), range (format(v) for the value bubble and ends), toggle (role="switch"). Every field: name, label, hint?, required?, validate?(value, values) → message | null | Promise.
- onSubmit(values) → Promise; initialValues; storageKey (draft); eyebrow; submitLabel; successTitle; successMessage; onStepChange(index).
- A Review step is added automatically after the last step.

## Look (editorial)
- One card: a warm paper (#fbf8f1) progress rail on the left (wide) and a white main panel. Rail: mono "PROGRESS", numbered circles (01, 02… → ✓ when done, filled purple when current with a soft halo) with title and a one-line description, joined by a vertical line whose purple fill grows with progress. Finished steps are clickable.
- Narrow: the rail hides; show "Step 2 of 5 · Goals" and a segmented bar.
- Main: mono eyebrow, big tight heading, description, fields with 44px inputs, rounded-xl borders, purple focus ring, "optional" marks, hints and error lines with an icon. Actions: ← Back, "Press Enter ↵", and a purple primary button that reads Continue →, Review answers →, Save & review, Create workspace or Try again.
- Steps slide in from the right going forward and from the left going back (reduced motion: no slide).

## Behaviour
- Continue validates the step: required (wording per type), email / url format, multi min / max, then custom validate (await async — button shows a spinner and "Checking…"). On errors: aria-invalid + aria-describedby, focus the first invalid field, announce "2 fields need attention".
- Enter submits the step (form onSubmit), not inside textareas. After each step change, move focus to the new heading.
- Review: every step as a card with an Edit button and a dt/dd list of answers (choice labels, joined chips, formatted range, Yes/No, "—" for empty). Edit → the step's button becomes "Save & review" and returns to the review.
- Submit: Submitting… with spinner (aria-busy) → success screen (circle + tick that draw themselves, title, message, Start over) or a role="alert" error that keeps the answers and offers Try again.
- Draft: with storageKey, save { values, index, reached } to localStorage (debounced, try/catch); restore on load after mount and show "Welcome back — we restored your progress" with Dismiss / Start over; clear on success.
- A polite live region announces step changes, errors and results.

## Files
- src/components/onboarding-flow/OnboardingFlow.tsx
- src/components/onboarding-flow/index.ts`;
