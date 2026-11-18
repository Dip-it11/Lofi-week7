"use client";

import { KaleidoAvatar, KaleidoscopeAvatarGenerator } from "@/components/kaleidoscope-avatar";

const TEAM = ["Ada Okafor", "Bruno Castell", "Chloé Martin", "Dev Patel", "Elif Yilmaz", "Kenji Sato", "Maya Cohen", "Zara Ahmed"];

export function KaleidoscopeDemo() {
  return (
    <div>
      <KaleidoscopeAvatarGenerator defaultName="Lofistack" />
      <div className="mt-8 border-t border-dashed border-[#351367]/15 pt-5">
        <p className="mb-3 text-[11px] font-bold tracking-[0.18em] text-[#5d5275] uppercase">Same component, used as default avatars</p>
        <ul role="list" className="flex flex-wrap gap-3">
          {TEAM.map((n) => (
            <li key={n} className="flex items-center gap-2 rounded-full border border-[#351367]/10 bg-white py-1 pr-3 pl-1">
              <KaleidoAvatar name={n} size={30} label="" />
              <span className="text-xs font-medium text-[#1d1430]">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
