"use client";

import { useState } from "react";
import { PreviewFrame } from "@/components/site/PreviewFrame";
import { StatsDemo } from "./Demo";

const TOGGLE =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-medium text-muted transition hover:text-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand";

export function Preview() {
  const [ink, setInk] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <PreviewFrame
      note="press Reset to roll the numbers again"
      tools={
        <>
          <label className={TOGGLE}>
            <input type="checkbox" checked={ink} onChange={(e) => setInk(e.target.checked)} className="size-4 accent-brand" />
            Dark
          </label>
          <label className={TOGGLE}>
            <input type="checkbox" checked={loading} onChange={(e) => setLoading(e.target.checked)} className="size-4 accent-brand" />
            Loading
          </label>
        </>
      }
    >
      {(key) => <StatsDemo key={key} variant={ink ? "ink" : "paper"} loading={loading} />}
    </PreviewFrame>
  );
}
