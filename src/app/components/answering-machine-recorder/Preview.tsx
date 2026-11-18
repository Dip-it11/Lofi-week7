"use client";

import { PreviewFrame } from "@/components/site/PreviewFrame";
import { AnsweringMachineDemo } from "./Demo";

export function Preview() {
  return <PreviewFrame note="press REC and allow the microphone">{(key) => <AnsweringMachineDemo key={key} />}</PreviewFrame>;
}
