import type { PropDoc } from "@/components/site/ComponentPage";

export const PROPS: PropDoc[] = [
  { name: "defaultName", type: "string", default: '"Lofistack"', description: "Name the generator starts with." },
  { name: "onChange", type: "(config) => void", description: "Called with { name, symmetry, palette, style, twist, shape } whenever the avatar changes — store it to redraw the same avatar later." },
  { name: "onExport", type: "(file: Blob, format: \"svg\" | \"png\") => void", description: "Called after each download with the exported file (e.g. to upload it as a profile picture)." },
  { name: "pngSize", type: "number", default: "512", description: "Width and height of the PNG (and SVG) export in px." },
  { name: "defaultSound", type: "boolean", default: "false", description: "Start with glass-bead tumbling sounds on." },
  { name: "className", type: "string", description: "Extra classes for the section." },
  { name: "<KaleidoAvatar />", type: "{ name, size?, symmetry?, palette?, style?, twist?, shape?, label? }", description: "The avatar on its own — drop it anywhere as a default profile picture. Same props → same picture, every time." },
];
