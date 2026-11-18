"use client";

import { useEffect, useState } from "react";
import { AnsweringMachine, encodeWav, type VoiceMessage } from "@/components/answering-machine";

/** Render a short lofi jingle into a WAV so the preview has a message to play without a microphone. */
async function makeDemoTape(): Promise<VoiceMessage | null> {
  if (typeof OfflineAudioContext === "undefined") return null;
  const rate = 24000;
  const seconds = 6.5;
  const ctx = new OfflineAudioContext(1, rate * seconds, rate);
  const master = ctx.createGain();
  master.gain.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2600;
  master.connect(lp).connect(ctx.destination);

  const note = (freq: number, at: number, len: number, vol = 0.18) => {
    for (const [mult, v] of [
      [1, vol],
      [2, vol * 0.25],
    ]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(v, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g).connect(master);
      o.start(at);
      o.stop(at + len + 0.05);
    }
  };
  // Dmaj7 → Bm7 → Em7 → A7, with a little melody on top
  const chords = [
    [293.7, 370, 440, 554.4],
    [246.9, 293.7, 370, 440],
    [329.6, 392, 493.9, 587.3],
    [220, 277.2, 329.6, 392],
  ];
  chords.forEach((c, i) => c.forEach((f) => note(f, 0.2 + i * 1.5, 1.6, 0.06)));
  [740, 659.3, 587.3, 554.4, 587.3, 659.3, 740, 880].forEach((f, i) => note(f, 0.35 + i * 0.75, 0.6, 0.12));
  // tape hiss
  const noise = ctx.createBuffer(1, rate * seconds, rate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.012;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.connect(ctx.destination);
  src.start();

  const blob = await encodeWav(await ctx.startRendering(), rate);
  return { id: "demo-tape", url: URL.createObjectURL(blob), blob, duration: seconds, createdAt: Date.now() - 1000 * 60 * 42, mimeType: "audio/wav" };
}

export function AnsweringMachineDemo() {
  const [tape, setTape] = useState<VoiceMessage | null>(null);

  useEffect(() => {
    let alive = true;
    let url = "";
    void makeDemoTape().then((m) => {
      if (!m) return;
      url = m.url;
      if (alive) setTape(m);
      else URL.revokeObjectURL(url);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <AnsweringMachine
      key={tape ? "with-tape" : "empty"}
      initialMessages={tape ? [tape] : []}
      onSend={() => new Promise<void>((resolve) => setTimeout(resolve, 1200))}
    />
  );
}
