"use client";

import { useEffect, useState } from "react";
import { RollingStats, type Stat } from "@/components/rolling-stats";

const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`);

export function StatsDemo({ variant = "paper", loading = false }: { variant?: "paper" | "ink"; loading?: boolean }) {
  const [live, setLive] = useState(1284);
  const [history, setHistory] = useState([1040, 1120, 1090, 1180, 1230, 1205, 1260, 1240, 1310, 1275, 1290, 1284]);

  useEffect(() => {
    const id = setInterval(() => {
      setLive((v) => {
        const next = Math.max(900, v + Math.round((Math.random() - 0.42) * 60));
        setHistory((h) => [...h.slice(1), next]);
        return next;
      });
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const stats: Stat[] = [
    {
      label: "Developers",
      value: 48210,
      suffix: "+",
      delta: 18.2,
      deltaLabel: "vs last quarter",
      description: "Copied a Lofistack component into a real project.",
      trend: [21040, 23300, 26120, 25480, 29010, 31250, 34400, 36120, 39050, 42300, 45180, 48210],
      trendLabels: WEEKS,
    },
    {
      label: "Active right now",
      value: live,
      live: true,
      delta: 6.4,
      deltaLabel: "vs this time yesterday",
      description: "Browsing the library at this moment.",
      trend: history,
    },
    {
      label: "Revenue (ARR)",
      value: 2.84,
      prefix: "$",
      suffix: "M",
      decimals: 2,
      delta: 31,
      deltaLabel: "year over year",
      trend: [1.2, 1.35, 1.5, 1.62, 1.8, 1.92, 2.05, 2.2, 2.38, 2.51, 2.7, 2.84],
      trendLabels: WEEKS,
    },
    {
      label: "Median load time",
      value: 182,
      suffix: " ms",
      delta: -12,
      deltaLabel: "faster than v1",
      lowerIsBetter: true,
      description: "Per component, on a mid-range phone.",
      trend: [260, 251, 240, 236, 224, 219, 210, 204, 199, 191, 186, 182],
    },
  ];

  return (
    <RollingStats
      variant={variant}
      loading={loading}
      eyebrow="Lofistack in numbers"
      title="Small components, big numbers."
      description="Updated every few seconds. Scroll this band into view and the counters roll into place — hover a trend line to read a week."
      stats={stats}
    />
  );
}
