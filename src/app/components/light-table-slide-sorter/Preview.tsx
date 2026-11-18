"use client";

import { PreviewFrame } from "@/components/site/PreviewFrame";
import { LightTableDemo } from "./Demo";

export function Preview() {
  return <PreviewFrame note="drag the slides or use the keyboard">{(key) => <LightTableDemo key={key} />}</PreviewFrame>;
}
