"use client";

import { PreviewFrame } from "@/components/site/PreviewFrame";
import { KaleidoscopeDemo } from "./Demo";

export function Preview() {
  return <PreviewFrame note="type a name and twist the ring">{(key) => <KaleidoscopeDemo key={key} />}</PreviewFrame>;
}
