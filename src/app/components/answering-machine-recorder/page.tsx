import type { Metadata } from "next";
import { ComponentPage } from "@/components/site/ComponentPage";
import { loadComponentFiles } from "@/lib/loadComponentFiles";
import { componentLabel, getComponent } from "@/lib/registry";
import { Preview } from "./Preview";
import { PROMPT } from "./prompt";
import { PROPS } from "./props";

const entry = getComponent("answering-machine-recorder")!;
const IMPORT_DIR = "src/components/answering-machine";

export const metadata: Metadata = {
  title: `${entry.name} — ${componentLabel(entry)}`,
  description: entry.summary,
};

const USAGE = `import { AnsweringMachine } from "@/components/answering-machine";

export default function VoiceFeedback() {
  return (
    <AnsweringMachine
      greeting="Hi, you've reached Lofistack. Leave your feedback after the beep."
      maxDuration={90}
      onSend={async (message) => {
        const body = new FormData();
        body.append("audio", message.blob!, "message.wav");
        const res = await fetch("/api/voice-notes", { method: "POST", body });
        if (!res.ok) throw new Error("Upload failed"); // shows Retry
      }}
    />
  );
}
`;

const FEATURES = [
  "Records real audio from the microphone after the classic beep, with a live LED level meter and a 1-minute tape limit.",
  "Every take is re-encoded as a small mono WAV — exact length, seekable, and downloadable in a format that plays everywhere.",
  "Tape reels spin and the brown tape pack moves from one reel to the other as the message records or plays.",
  "Play, pause, stop, a rewind with tape squeal, and a seek slider; a blinking seven-segment counter shows unplayed messages.",
  "Tape log with NEW badges, Send (Sending… / ✓ Sent / Retry), Download and Delete; onRecord / onSend / onDelete hooks.",
  "Handles mic blocked, no mic, unsupported browser, too-short takes and tape full — all announced to screen readers.",
];

export default async function AnsweringMachineRecorderPage() {
  const files = await loadComponentFiles(
    IMPORT_DIR,
    [{ name: "AnsweringMachine.tsx" }, { name: "tapeAudio.ts" }, { name: "index.ts" }],
    USAGE,
  );
  return (
    <ComponentPage
      entry={entry}
      files={files}
      importDir={IMPORT_DIR}
      preview={<Preview />}
      previewDescription="Press REC, allow the microphone, wait for the beep and talk — then STOP and play it back. A sample message is already on the tape, so you can try Play, Rew, Send and Download without a mic."
      codeDescription="Copy the three files into src/components/answering-machine — no extra packages needed beyond React and Tailwind CSS."
      setup={[
        ["Copy the files", "Create src/components/answering-machine and paste each file from the tabs below."],
        ["Serve over HTTPS", "Browsers only allow the microphone on https:// pages (or localhost)."],
        ["Send the audio", "Use onSend or onRecord — message.blob is a WAV ready to upload."],
      ]}
      prompt={PROMPT}
      props={PROPS}
      propsDescription="Every prop is optional and typed — wire up onSend to upload voice messages."
      features={FEATURES}
    />
  );
}
