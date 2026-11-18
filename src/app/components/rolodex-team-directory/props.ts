import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "people", type: "RolodexPerson[]", description: "Required. { id?, name, role, team?, email?, phone?, location?, timezone?, photo?, links?, note? } — sorted A–Z by name." },
  { name: "title", type: "string", default: '"Team directory"', description: "Accessible name of the directory." },
  { name: "searchable", type: "boolean", default: "true", description: "Show the search box (name, role, team or city)." },
  { name: "defaultSound", type: "boolean", default: "false", description: "Start with card flick and flip sounds on." },
  { name: "onSelect", type: "(person: RolodexPerson) => void", description: "Called whenever the wheel settles on a person." },
  { name: "palette", type: "Partial<RolodexPalette>", default: "Lofistack purple + cream", description: "{ base, card, ink, accent }." },
  { name: "className", type: "string", description: "Extra classes for the section." },
];
