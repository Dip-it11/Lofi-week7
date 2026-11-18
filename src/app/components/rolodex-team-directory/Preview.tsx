"use client";

import { PreviewFrame } from "@/components/site/PreviewFrame";
import { RolodexDemo } from "./Demo";

export function Preview() {
  return <PreviewFrame note="drag, scroll or use the arrow keys to spin">{(key) => <RolodexDemo key={key} />}</PreviewFrame>;
}
