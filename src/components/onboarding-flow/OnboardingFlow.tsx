"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type FieldValue = string | string[] | number | boolean;
export type FormValues = Record<string, FieldValue>;
export type Option = { value: string; label: string; description?: string };

type Base = {
  /** Key in the submitted values. */
  name: string;
  label: string;
  /** Helper text under the field. */
  hint?: string;
  required?: boolean;
  /** Return an error message, or null when valid. Can be async (e.g. "is this email taken?"). */
  validate?: (value: FieldValue, values: FormValues) => string | null | Promise<string | null>;
};

export type OnboardingField =
  | (Base & { type: "text" | "email" | "url" | "tel"; placeholder?: string; autoComplete?: string; prefix?: string })
  | (Base & { type: "textarea"; placeholder?: string; maxLength?: number })
  | (Base & { type: "choice"; options: Option[] })
  | (Base & { type: "multi"; options: Option[]; min?: number; max?: number })
  | (Base & { type: "range"; min: number; max: number; step?: number; format?: (v: number) => string })
  | (Base & { type: "toggle"; description?: string });

export type OnboardingStep = {
  id: string;
  /** Short name in the progress rail. */
  title: string;
  /** Big heading on the step (defaults to title). */
  heading?: string;
  description?: string;
  fields: OnboardingField[];
};

export type OnboardingFlowProps = {
  steps: OnboardingStep[];
  /** Called with all answers from the review step. Return a promise — a rejection shows the error and keeps the answers. */
  onSubmit: (values: FormValues) => Promise<void> | void;
  initialValues?: FormValues;
  /** Save a draft in localStorage under this key and restore it next time. */
  storageKey?: string;
  /** Small label above every step. */
  eyebrow?: string;
  submitLabel?: string;
  successTitle?: string;
  successMessage?: string;
  /** Called when the visible step changes (index; steps.length = review). */
  onStepChange?: (index: number) => void;
  className?: string;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URLISH = /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/i;

function defaults(steps: OnboardingStep[], initial?: FormValues): FormValues {
  const v: FormValues = {};
  for (const s of steps)
    for (const f of s.fields) v[f.name] = f.type === "multi" ? [] : f.type === "range" ? f.min : f.type === "toggle" ? false : "";
  return { ...v, ...initial };
}

const isEmpty = (v: FieldValue | undefined) => v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

function display(f: OnboardingField, v: FieldValue): string {
  if (f.type === "choice") return f.options.find((o) => o.value === v)?.label ?? "—";
  if (f.type === "multi") return (v as string[]).map((x) => f.options.find((o) => o.value === x)?.label ?? x).join(", ") || "—";
  if (f.type === "range") return f.format ? f.format(v as number) : String(v);
  if (f.type === "toggle") return v ? "Yes" : "No";
  if (f.type === "text" && f.prefix && v) return `${f.prefix}${v}`;
  return (v as string) || "—";
}

async function validateField(f: OnboardingField, values: FormValues): Promise<string | null> {
  const v = values[f.name];
  if (f.required && isEmpty(v)) return f.type === "choice" ? "Choose one option." : f.type === "multi" ? "Pick at least one." : "This field is required.";
  if (!isEmpty(v)) {
    if (f.type === "email" && !EMAIL.test(String(v).trim())) return "Enter a valid email address, like name@company.com.";
    if (f.type === "url" && !URLISH.test(String(v).trim())) return "Enter a valid web address.";
    if (f.type === "multi") {
      const n = (v as string[]).length;
      if (f.min && n < f.min) return `Pick at least ${f.min}.`;
      if (f.max && n > f.max) return `Pick up to ${f.max}.`;
    }
  }
  return f.validate ? await f.validate(v, values) : null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

const Spinner = () => <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none" />;

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

type FieldProps = { field: OnboardingField; value: FieldValue; error?: string; uid: string; onChange: (v: FieldValue) => void };

function Field({ field: f, value, error, uid, onChange }: FieldProps) {
  const id = `${uid}-${f.name}`;
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [f.hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  const label = (
    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-[var(--ob-ink)]">
      <span>
        {f.label}
        {f.required ? <span aria-hidden="true" className="text-[var(--ob-accent)]"> *</span> : <span className="ml-1.5 text-xs font-normal opacity-50">optional</span>}
      </span>
      {f.type === "multi" && f.max && (
        <span className="text-xs font-normal opacity-60" style={{ fontFamily: MONO }}>
          {(value as string[]).length}/{f.max}
        </span>
      )}
    </span>
  );
  const foot = (
    <>
      {f.hint && (
        <p id={hintId} className="mt-1.5 text-xs opacity-60">
          {f.hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-700">
          <svg viewBox="0 0 24 24" className="mt-px size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 16.5v.5" />
          </svg>
          {error}
        </p>
      )}
    </>
  );
  const inputBase = `w-full rounded-xl border bg-white px-3.5 text-[15px] text-[var(--ob-ink)] shadow-[0_1px_0_rgba(29,20,48,.04)] transition placeholder:text-[var(--ob-ink)]/35 focus-visible:outline-none focus-visible:ring-4 ${
    error ? "border-rose-500 focus-visible:ring-rose-500/20" : "border-[var(--ob-rule)] hover:border-[var(--ob-ink)]/30 focus-visible:border-[var(--ob-accent)] focus-visible:ring-[var(--ob-accent)]/15"
  }`;

  if (f.type === "text" || f.type === "email" || f.type === "url" || f.type === "tel") {
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <div className="flex items-stretch">
          {f.prefix && (
            <span className="flex items-center rounded-l-xl border border-r-0 border-[var(--ob-rule)] bg-[var(--ob-paper)] px-3 text-sm opacity-70" style={{ fontFamily: MONO }}>
              {f.prefix}
            </span>
          )}
          <input
            id={id}
            name={f.name}
            type={f.type}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.placeholder}
            autoComplete={f.autoComplete ?? "off"}
            aria-invalid={!!error || undefined}
            aria-required={f.required || undefined}
            aria-describedby={describedBy}
            data-ob-field={f.name}
            className={`${inputBase} h-11 min-w-0 ${f.prefix ? "rounded-l-none" : ""}`}
          />
        </div>
        {foot}
      </div>
    );
  }

  if (f.type === "textarea") {
    const len = (value as string).length;
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <textarea
          id={id}
          name={f.name}
          rows={3}
          value={value as string}
          maxLength={f.maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          data-ob-field={f.name}
          className={`${inputBase} resize-y py-2.5 leading-relaxed`}
        />
        {f.maxLength && (
          <p className="mt-1 text-right text-[11px] opacity-50" style={{ fontFamily: MONO }}>
            {len}/{f.maxLength}
          </p>
        )}
        {foot}
      </div>
    );
  }

  if (f.type === "choice") {
    return (
      <fieldset aria-describedby={describedBy} aria-invalid={!!error || undefined}>
        <legend className="w-full">{label}</legend>
        <div role="radiogroup" className="grid gap-2.5 @lg:grid-cols-2">
          {f.options.map((o, i) => {
            const on = value === o.value;
            return (
              <label
                key={o.value}
                className={`group relative flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ob-accent)]/20 ${
                  on ? "border-[var(--ob-accent)] bg-[var(--ob-accent)]/[.06] shadow-[inset_0_0_0_1px_var(--ob-accent)]" : error ? "border-rose-400 bg-white" : "border-[var(--ob-rule)] bg-white hover:border-[var(--ob-ink)]/30"
                }`}
              >
                <input type="radio" name={f.name} value={o.value} checked={on} onChange={() => onChange(o.value)} data-ob-field={i === 0 ? f.name : undefined} className="peer sr-only" />
                <span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-[var(--ob-accent)]" : "border-[var(--ob-ink)]/25"}`}>
                  <span className={`size-2.5 rounded-full bg-[var(--ob-accent)] transition ${on ? "scale-100" : "scale-0"}`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--ob-ink)]">{o.label}</span>
                  {o.description && <span className="mt-0.5 block text-xs leading-snug opacity-60">{o.description}</span>}
                </span>
              </label>
            );
          })}
        </div>
        {foot}
      </fieldset>
    );
  }

  if (f.type === "multi") {
    const list = value as string[];
    const full = !!f.max && list.length >= f.max;
    return (
      <fieldset aria-describedby={describedBy} aria-invalid={!!error || undefined}>
        <legend className="w-full">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {f.options.map((o, i) => {
            const on = list.includes(o.value);
            const disabled = !on && full;
            return (
              <label
                key={o.value}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ob-accent)]/20 ${
                  on
                    ? "border-[var(--ob-accent)] bg-[var(--ob-accent)] text-white"
                    : disabled
                      ? "cursor-not-allowed border-[var(--ob-rule)] bg-white opacity-45"
                      : "border-[var(--ob-rule)] bg-white text-[var(--ob-ink)] hover:border-[var(--ob-ink)]/30"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={disabled}
                  data-ob-field={i === 0 ? f.name : undefined}
                  onChange={() => onChange(on ? list.filter((x) => x !== o.value) : [...list, o.value])}
                />
                <span aria-hidden="true" className="text-xs">
                  {on ? "✓" : "+"}
                </span>
                {o.label}
              </label>
            );
          })}
        </div>
        {foot}
      </fieldset>
    );
  }

  if (f.type === "range") {
    const v = value as number;
    const pct = ((v - f.min) / (f.max - f.min)) * 100;
    const text = f.format ? f.format(v) : String(v);
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <div className="relative pt-9">
          <span
            aria-hidden="true"
            className="absolute top-0 -translate-x-1/2 rounded-lg bg-[var(--ob-ink)] px-2 py-1 text-xs font-semibold whitespace-nowrap text-white tabular-nums"
            style={{ left: `calc(${pct}% + ${(50 - pct) * 0.2}px)` }}
          >
            {text}
          </span>
          <input
            id={id}
            type="range"
            min={f.min}
            max={f.max}
            step={f.step ?? 1}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-valuetext={text}
            aria-describedby={describedBy}
            data-ob-field={f.name}
            className="ob-range w-full"
            style={{ "--ob-pct": `${pct}%` } as CSSProperties}
          />
          <div className="mt-1 flex justify-between text-[11px] opacity-50" style={{ fontFamily: MONO }}>
            <span>{f.format ? f.format(f.min) : f.min}</span>
            <span>{f.format ? f.format(f.max) : f.max}</span>
          </div>
        </div>
        {foot}
      </div>
    );
  }

  // toggle
  const on = value as boolean;
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--ob-rule)] bg-white p-3.5">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-semibold text-[var(--ob-ink)]">
          {f.label}
        </p>
        {"description" in f && f.description && <p className="mt-0.5 text-xs opacity-60">{f.description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        data-ob-field={f.name}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:ring-4 focus-visible:ring-[var(--ob-accent)]/20 focus-visible:outline-none ${on ? "bg-[var(--ob-accent)]" : "bg-[var(--ob-ink)]/20"}`}
      >
        <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */

/** A multi-step onboarding form: progress rail, per-step (and async) validation, review with edit, draft saving and submit states. */
export function OnboardingFlow({
  steps,
  onSubmit,
  initialValues,
  storageKey,
  eyebrow = "Set up your workspace",
  submitLabel = "Create workspace",
  successTitle = "You're all set.",
  successMessage = "Your workspace is ready. We've sent a confirmation to your inbox.",
  onStepChange,
  className = "",
}: OnboardingFlowProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const reduced = usePrefersReducedMotion();
  const total = steps.length + 1; // + review
  const REVIEW = steps.length;

  const [values, setValues] = useState<FormValues>(() => defaults(steps, initialValues));
  const [index, setIndex] = useState(0);
  const [reached, setReached] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);
  const [backToReview, setBackToReview] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [submitError, setSubmitError] = useState("");
  const [restored, setRestored] = useState(false);
  const [announce, setAnnounce] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  /* ---------- Draft: restore once, then save as you go ---------- */
  useEffect(() => {
    if (!storageKey) return;
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const d = JSON.parse(raw) as { values?: FormValues; index?: number; reached?: number };
        if (!d.values) return;
        setValues((v) => ({ ...v, ...d.values }));
        const i = Math.min(Math.max(0, d.index ?? 0), REVIEW);
        setIndex(i);
        setReached(Math.min(Math.max(i, d.reached ?? i), REVIEW));
        setRestored(true);
      } catch {
        /* storage unavailable — start fresh */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [storageKey, REVIEW]);

  useEffect(() => {
    if (!storageKey || status === "success") return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ values, index, reached }));
      } catch {
        /* ignore */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [storageKey, values, index, reached, status]);

  /* ---------- Move focus to the new step's heading ---------- */
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [index, status]);

  const goto = (i: number, d: 1 | -1) => {
    setDir(d);
    setIndex(i);
    setReached((r) => Math.max(r, i));
    setErrors({});
    onStepChange?.(i);
    setAnnounce(i === REVIEW ? "Review your answers." : `Step ${i + 1} of ${total}: ${steps[i].title}.`);
  };

  const setValue = (name: string, v: FieldValue) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    if (errors[name]) setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== name)));
  };

  const next = async () => {
    if (index >= REVIEW || checking) return;
    setChecking(true);
    const found: Record<string, string> = {};
    for (const f of steps[index].fields) {
      const msg = await validateField(f, values);
      if (msg) found[f.name] = msg;
    }
    setChecking(false);
    if (Object.keys(found).length) {
      setErrors(found);
      const n = Object.keys(found).length;
      setAnnounce(`${n} field${n === 1 ? " needs" : "s need"} attention.`);
      const first = steps[index].fields.find((f) => found[f.name]);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-ob-field="${first?.name}"]`)?.focus());
      return;
    }
    if (backToReview) {
      setBackToReview(false);
      goto(REVIEW, 1);
    } else goto(index + 1, 1);
  };

  const back = () => index > 0 && goto(index - 1, -1);

  const submit = async () => {
    setStatus("submitting");
    setSubmitError("");
    setAnnounce("Submitting…");
    try {
      await onSubmit(values);
      setStatus("success");
      setAnnounce(successTitle);
      if (storageKey)
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
    } catch (e) {
      setStatus("error");
      const msg = e instanceof Error && e.message ? e.message : "Something went wrong.";
      setSubmitError(msg);
      setAnnounce(`Couldn't submit: ${msg}`);
    }
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (index === REVIEW) void submit();
    else void next();
  };

  const startOver = () => {
    if (storageKey)
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    setValues(defaults(steps, initialValues));
    setReached(0);
    setRestored(false);
    setStatus("idle");
    setBackToReview(false);
    goto(0, -1);
  };

  const progress = index / (total - 1);
  const step = index < REVIEW ? steps[index] : null;
  const anim = reduced ? "" : dir > 0 ? "ob-in-next" : "ob-in-prev";

  const railItem = (title: string, i: number, sub?: string) => {
    const done = i < index || (status === "success" && i <= REVIEW);
    const current = i === index && status !== "success";
    const can = i <= reached && status !== "success" && status !== "submitting";
    return (
      <li key={i} className="relative">
        <button
          type="button"
          disabled={!can || current}
          onClick={() => goto(i, i < index ? -1 : 1)}
          aria-current={current ? "step" : undefined}
          className="group flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition enabled:hover:bg-[var(--ob-ink)]/[.04] focus-visible:outline-2 focus-visible:outline-[var(--ob-accent)] disabled:cursor-default"
        >
          <span
            className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors ${
              current ? "border-[var(--ob-accent)] bg-[var(--ob-accent)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--ob-accent)_15%,transparent)]" : done ? "border-[var(--ob-accent)] bg-[var(--ob-paper)] text-[var(--ob-accent)]" : "border-[var(--ob-rule)] bg-[var(--ob-paper)] opacity-60"
            }`}
            style={{ fontFamily: MONO }}
          >
            {done ? "✓" : String(i + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 pt-0.5">
            <span className={`block text-sm font-semibold ${current ? "text-[var(--ob-ink)]" : "opacity-70"}`}>{title}</span>
            {sub && <span className="block truncate text-xs opacity-50">{sub}</span>}
            <span className="sr-only">{done ? "(completed)" : current ? "(current step)" : ""}</span>
          </span>
        </button>
      </li>
    );
  };

  const style = {
    "--ob-ink": "#1d1430",
    "--ob-paper": "#fbf8f1",
    "--ob-accent": "#351367",
    "--ob-rule": "rgba(29,20,48,.14)",
  } as CSSProperties;

  return (
    <section style={style} className={`ob @container w-full text-[var(--ob-ink)] ${className}`} aria-label={eyebrow}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      <div className="grid overflow-hidden rounded-[1.75rem] border border-[var(--ob-rule)] bg-white shadow-[0_30px_60px_-40px_rgba(29,20,48,.45)] @3xl:grid-cols-[16rem_1fr]">
        {/* ================= progress rail (wide) ================= */}
        <aside className="relative hidden border-r border-[var(--ob-rule)] bg-[var(--ob-paper)] p-5 @3xl:block">
          <p className="px-2 text-[11px] font-semibold tracking-[0.22em] uppercase opacity-60" style={{ fontFamily: MONO }}>
            Progress
          </p>
          <div className="relative mt-4">
            <span aria-hidden="true" className="absolute top-5 bottom-5 left-[1.4rem] w-px bg-[var(--ob-rule)]" />
            <span
              aria-hidden="true"
              className="absolute top-5 left-[1.4rem] w-px origin-top bg-[var(--ob-accent)] transition-[height] duration-500 ease-out motion-reduce:transition-none"
              style={{ height: `calc((100% - 2.5rem) * ${status === "success" ? 1 : progress})` }}
            />
            <ol className="relative flex flex-col gap-1">
              {steps.map((s, i) => railItem(s.title, i, s.description))}
              {railItem("Review", REVIEW, "Check and submit")}
            </ol>
          </div>
          <p className="mt-6 px-2 text-xs leading-relaxed opacity-50">{storageKey ? "Your answers are saved as you go." : "You can go back to any finished step."}</p>
        </aside>

        {/* ================= main ================= */}
        <div className="flex min-w-0 flex-col p-5 @xl:p-8">
          {/* compact progress (narrow) */}
          <div className="mb-6 @3xl:hidden">
            <div className="flex items-center justify-between text-xs" style={{ fontFamily: MONO }}>
              <span className="font-semibold">{status === "success" ? "Done" : `Step ${index + 1} of ${total}`}</span>
              <span className="opacity-60">{status === "success" ? "" : index === REVIEW ? "Review" : steps[index].title}</span>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--ob-ink)]/10">
                  <span className="block h-full rounded-full bg-[var(--ob-accent)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: status === "success" || i < index ? "100%" : i === index ? "50%" : "0%" }} />
                </span>
              ))}
            </div>
          </div>

          {restored && status !== "success" && (
            <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--ob-accent)]/20 bg-[var(--ob-accent)]/[.05] px-3.5 py-2.5 text-sm">
              <span>Welcome back — we restored your progress.</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => setRestored(false)} className="rounded-md px-2 py-1 text-xs font-semibold opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--ob-accent)]">
                  Dismiss
                </button>
                <button type="button" onClick={startOver} className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--ob-accent)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ob-accent)]">
                  Start over
                </button>
              </span>
            </div>
          )}

          {status === "success" ? (
            <div className={`flex flex-1 flex-col items-start py-6 ${anim}`}>
              <svg viewBox="0 0 52 52" className="size-14" aria-hidden="true">
                <circle cx="26" cy="26" r="24" fill="none" stroke="var(--ob-accent)" strokeWidth="2.5" className="ob-draw" style={{ strokeDasharray: 151, "--len": 151 } as CSSProperties} />
                <path d="M15 27l7 7 15-16" fill="none" stroke="var(--ob-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ob-draw ob-draw-late" style={{ strokeDasharray: 40, "--len": 40 } as CSSProperties} />
              </svg>
              <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-3xl font-semibold tracking-[-0.03em] outline-none @xl:text-4xl">
                {successTitle}
              </h2>
              <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed opacity-70">{successMessage}</p>
              <button type="button" onClick={startOver} className="mt-6 h-11 rounded-xl border border-[var(--ob-rule)] px-4 text-sm font-semibold transition hover:border-[var(--ob-ink)]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ob-accent)]">
                Start over
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onFormSubmit} noValidate className="flex flex-1 flex-col">
              <div key={index} className={anim}>
                <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-60" style={{ fontFamily: MONO }}>
                  {eyebrow}
                </p>
                <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl leading-tight font-semibold tracking-[-0.025em] text-balance outline-none @xl:text-[2rem]">
                  {step ? (step.heading ?? step.title) : "Check your answers"}
                </h2>
                {(step?.description || !step) && (
                  <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed opacity-65">{step ? step.description : "Everything look right? You can edit any section before you submit."}</p>
                )}

                {step ? (
                  <div className="mt-7 flex flex-col gap-6">
                    {step.fields.map((f) => (
                      <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} uid={uid} onChange={(v) => setValue(f.name, v)} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-7 flex flex-col gap-3">
                    {steps.map((s, i) => (
                      <div key={s.id} className="rounded-2xl border border-[var(--ob-rule)] bg-[var(--ob-paper)]/60 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">
                            <span className="mr-2 opacity-50" style={{ fontFamily: MONO }}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {s.title}
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setBackToReview(true);
                              goto(i, -1);
                            }}
                            disabled={status === "submitting"}
                            aria-label={`Edit ${s.title}`}
                            className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--ob-accent)] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ob-accent)] disabled:opacity-40"
                          >
                            Edit
                          </button>
                        </div>
                        <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm @lg:grid-cols-[minmax(0,12rem)_1fr]">
                          {s.fields.map((f) => (
                            <div key={f.name} className="contents">
                              <dt className="opacity-55">{f.label}</dt>
                              <dd className="min-w-0 font-medium break-words">{display(f, values[f.name])}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}
                    {status === "error" && (
                      <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                        <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v6M12 16.5v.5" />
                        </svg>
                        <span>
                          <strong className="font-semibold">Couldn&apos;t submit.</strong> {submitError} Your answers are saved — try again.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* actions */}
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={back}
                    disabled={status === "submitting" || checking}
                    className="h-11 rounded-xl px-4 text-sm font-semibold opacity-70 transition hover:bg-[var(--ob-ink)]/[.05] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ob-accent)] disabled:opacity-30"
                  >
                    ← Back
                  </button>
                )}
                <span className="ml-auto hidden text-xs opacity-45 @lg:inline" style={{ fontFamily: MONO }}>
                  {index < REVIEW ? "Press Enter ↵" : ""}
                </span>
                <button
                  type="submit"
                  disabled={checking || status === "submitting"}
                  aria-busy={checking || status === "submitting" || undefined}
                  className="inline-flex h-11 min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-[var(--ob-accent)] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_-10px_var(--ob-accent)] transition hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ob-accent)] active:scale-[.98] disabled:cursor-progress disabled:opacity-80"
                >
                  {checking ? (
                    <>
                      <Spinner /> Checking…
                    </>
                  ) : status === "submitting" ? (
                    <>
                      <Spinner /> Submitting…
                    </>
                  ) : index === REVIEW ? (
                    status === "error" ? "Try again" : submitLabel
                  ) : backToReview ? (
                    "Save & review"
                  ) : index === REVIEW - 1 ? (
                    "Review answers →"
                  ) : (
                    "Continue →"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes ob-in-next { from { opacity: 0; transform: translateX(18px) } to { opacity: 1; transform: none } }
        @keyframes ob-in-prev { from { opacity: 0; transform: translateX(-18px) } to { opacity: 1; transform: none } }
        .ob .ob-in-next { animation: ob-in-next .38s cubic-bezier(.2,.8,.2,1) both; }
        .ob .ob-in-prev { animation: ob-in-prev .38s cubic-bezier(.2,.8,.2,1) both; }
        .ob .ob-draw { animation: ob-dash .7s ease-out both; }
        .ob .ob-draw-late { animation-delay: .45s; }
        @keyframes ob-dash { from { stroke-dashoffset: var(--len) } to { stroke-dashoffset: 0 } }
        .ob .ob-range { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, var(--ob-accent) var(--ob-pct), rgba(29,20,48,.12) var(--ob-pct)); }
        .ob .ob-range::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2px solid var(--ob-accent); box-shadow: 0 2px 6px rgba(29,20,48,.25); cursor: grab; }
        .ob .ob-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid var(--ob-accent); cursor: grab; }
        .ob .ob-range:focus-visible { outline: none; box-shadow: 0 0 0 4px color-mix(in srgb, var(--ob-accent) 18%, transparent); }
        @media (prefers-reduced-motion: reduce) { .ob .ob-in-next, .ob .ob-in-prev, .ob .ob-draw { animation: none } }
      `}</style>
    </section>
  );
}

export default OnboardingFlow;

