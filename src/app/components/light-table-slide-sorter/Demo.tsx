"use client";

import { LightTableSorter, type Slide } from "@/components/light-table-sorter";
import { DEMO_FRAMES } from "../film-projector-lightbox/demoFrames";

const SLIDES: Slide[] = DEMO_FRAMES.map((f, i) => ({ id: `slide-${i + 1}`, src: f.src, alt: f.alt, caption: f.caption }));

export function LightTableDemo() {
  return (
    <LightTableSorter
      items={SLIDES}
      title="Summer trip — pick the order"
      defaultStarred={["slide-3"]}
      onSave={() => new Promise<void>((resolve) => setTimeout(resolve, 1200))}
    />
  );
}
