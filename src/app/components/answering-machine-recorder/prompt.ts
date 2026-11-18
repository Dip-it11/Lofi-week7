/** The prompt that rebuilds this component — shown (and copyable) on the component page. */
export const PROMPT = `Build a reusable React voice recorder called <AnsweringMachine /> that looks and works like an 80s tape answering machine and records real audio from the microphone.

## Stack
- Next.js (App Router) + React + TypeScript, styled with Tailwind CSS v4 (container queries).
- Client component ("use client"). MediaRecorder + Web Audio API only — no audio, UI or animation libraries, no audio files.

## Look
- A purple plastic machine (#3b1f66): a "LOFISTACK · PHONE-MATE" badge, a red NEW lamp that blinks while there are unplayed messages, and a sound toggle.
- A smoked cassette window (SVG) with two tape reels: white hubs with teeth and three holes that spin, brown tape packs whose radius moves from the left reel to the right as the tape runs (keep the tape area constant: r = √(rMin² + (rMax² − rMin²)·fraction)), the tape running past a head block, and an "INCOMING · SIDE A" label.
- A cream paper label with the outgoing message (OGM) in a typewriter font.
- A dark display: a red two-digit seven-segment message counter (SVG segments with glow), amber status text ("READY", "● REC", "▶ PLAY", "◀◀ REWIND", "MIC BLOCKED", "TAPE FULL"…), a time readout (00:12 / 01:00), and a 10-bar LED level meter (green → amber → red).
- A "Tape" range slider for the current message, then four chunky piano keys: REW, PLAY/PAUSE, STOP and a red REC. Keys press down on click; PLAY and REC latch down while active.
- A cream "Tape log" card beside the machine (stacked below on narrow widths) listing messages: #01, NEW badge, length and time, a progress tint while playing, and Play/Pause, Send, Download and Delete buttons. Empty state: "The tape is empty."

## Recording
- REC: getUserMedia({ audio }) → (optionally speak the greeting with speechSynthesis) → play a 1 kHz "beep" (0.45 s) → start MediaRecorder with the best supported mime type (webm/opus, mp4 or ogg).
- While recording: an AnalyserNode drives the level meter (RMS of the time-domain data), a requestAnimationFrame loop drives the timer, and recording stops automatically at maxDuration with a TAPE FULL notice.
- STOP: stop the recorder, release the mic, then decode the recording and re-encode it as a 24 kHz mono 16-bit WAV (OfflineAudioContext + DataView) so it has an exact duration, seeks properly and downloads in a format that plays everywhere. Reject takes under 0.4 s ("TOO SHORT").
- Errors: NotAllowedError → MIC BLOCKED with help text, NotFoundError → NO MIC FOUND, no MediaRecorder → NOT SUPPORTED. STOP during the mic prompt, greeting or beep cancels cleanly.

## Playback
- One shared HTMLAudioElement. PLAY plays the selected message (or the first unplayed one), PAUSE pauses, STOP stops and rewinds, the slider seeks.
- REW: a rewind animation — reels spin fast in reverse and the position runs back to 0 with a tape squeal sound — then resumes if it was playing.
- Playing a message clears its NEW badge.
- Optional sounds (on by default): the beep, plastic key clunks and the rewind squeal.

## Tape log
- onRecord(message) fires with { id, url, blob (WAV), duration, createdAt, mimeType }. onSend(message) adds a Send button with Sending… / ✓ Sent / Retry states. onDelete(message) fires on delete. Revoke object URLs you created on delete and unmount, and stop the mic on unmount.

## Accessibility
- All keys are real buttons with labels ("Record a message", "Play new message"…); PLAY and REC use aria-pressed. The slider has aria-valuetext ("4 seconds of 14 seconds").
- A polite live region announces what happened ("Recording. Press stop when you're done.", "Message saved, 14 seconds."); errors use role="alert".
- prefers-reduced-motion: reels don't spin, lamps don't blink and rewinding is instant.

## Props (typed)
greeting, speakGreeting = false, maxDuration = 60, defaultSound = true, initialMessages, onRecord, onDelete, onSend, brand = "LOFISTACK", palette { body, keys, led, display }, className.

## Files
- src/components/answering-machine/AnsweringMachine.tsx
- src/components/answering-machine/tapeAudio.ts (mime type, WAV encoder, beep / clunk / squeal)
- src/components/answering-machine/index.ts`;
