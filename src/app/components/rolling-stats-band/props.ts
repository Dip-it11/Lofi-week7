import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "stats", type: "Stat[]", description: "Required. 1–4 stats: { label, value, prefix?, suffix?, decimals?, notation?, description?, delta?, deltaLabel?, lowerIsBetter?, trend?, trendLabels?, live? }. Change value and the digits roll to the new number." },
  { name: "eyebrow", type: "string", description: "Small label above the title." },
  { name: "title", type: "string", description: "Heading; also the section's accessible name." },
  { name: "description", type: "string", description: "Short paragraph beside the title." },
  { name: "variant", type: '"paper" | "ink"', default: '"paper"', description: "Warm light paper or deep ink (dark) styling." },
  { name: "locale", type: "string", default: '"en-US"', description: "Number formatting locale (separators, compact notation)." },
  { name: "duration", type: "number", default: "1700", description: "Roll duration in ms (each stat starts a little later than the one before)." },
  { name: "loading", type: "boolean", default: "false", description: "Show skeleton placeholders while the numbers load." },
  { name: "className", type: "string", description: "Extra classes for the section." },
];
