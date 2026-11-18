"use client";

import { OnboardingFlow } from "@/components/onboarding-flow";
import { DEMO_STEPS } from "./demoSteps";

export function OnboardingDemo({ fail = false, storageKey = "lofistack-onboarding-demo" }: { fail?: boolean; storageKey?: string }) {
  return (
    <OnboardingFlow
      steps={DEMO_STEPS}
      storageKey={storageKey}
      initialValues={{ team: 4, digest: true }}
      onSubmit={() =>
        new Promise<void>((resolve, reject) => setTimeout(() => (fail ? reject(new Error("The server took too long to respond.")) : resolve()), 1400))
      }
    />
  );
}
