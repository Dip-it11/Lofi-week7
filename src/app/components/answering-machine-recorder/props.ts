import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "greeting", type: "string", default: '"Hi, you\'ve reached Lofistack…"', description: "The outgoing message printed on the machine." },
  { name: "speakGreeting", type: "boolean", default: "false", description: "Read the greeting aloud with the browser's speech voice before the beep." },
  { name: "maxDuration", type: "number", default: "60", description: "Longest message in seconds — the tape runs out (TAPE FULL) after this." },
  { name: "defaultSound", type: "boolean", default: "true", description: "Start with the beep, key clunks and rewind squeal on (users can toggle them)." },
  { name: "initialMessages", type: "VoiceMessage[]", description: "Messages already on the tape: { id, url, duration, createdAt, blob?, mimeType? }." },
  { name: "onRecord", type: "(message: VoiceMessage) => void", description: "Called when a recording is saved — message.blob is a WAV you can upload." },
  { name: "onSend", type: "(message: VoiceMessage) => Promise<void> | void", description: "Adds a Send button to each message. Pending shows “Sending…”, a rejection shows Retry." },
  { name: "onDelete", type: "(message: VoiceMessage) => void", description: "Called when a message is deleted." },
  { name: "brand", type: "string", default: '"LOFISTACK"', description: "Name on the machine's badge." },
  { name: "palette", type: "Partial<AnsweringMachinePalette>", default: "Lofistack purple", description: "{ body, keys, led, display }." },
  { name: "className", type: "string", description: "Extra classes for the section." },
];
