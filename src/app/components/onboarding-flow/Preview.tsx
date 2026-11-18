"use client";

import { useState } from "react";
import { PreviewFrame } from "@/components/site/PreviewFrame";
import { OnboardingDemo } from "./Demo";

export function Preview() {
  const [fail, setFail] = useState(false);
  return (
    <PreviewFrame
      note="try Continue with empty fields"
      tools={
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-muted transition hover:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
          <input type="checkbox" checked={fail} onChange={(e) => setFail(e.target.checked)} className="size-4 accent-brand" />
          Simulate submit error
        </label>
      }
    >
      {(key) => <OnboardingDemo key={key} fail={fail} />}
    </PreviewFrame>
  );
}
