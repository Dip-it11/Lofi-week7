"use client";

import { RolodexDirectory } from "@/components/rolodex-directory";
import { DEMO_PEOPLE } from "./demoPeople";

export function RolodexDemo() {
  return (
    <div className="mx-auto max-w-3xl">
      <RolodexDirectory people={DEMO_PEOPLE} title="Lofistack team" />
    </div>
  );
}
