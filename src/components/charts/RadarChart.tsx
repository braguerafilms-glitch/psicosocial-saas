"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as ReRadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { HseDomainKey } from "@/lib/hse-questions";

export type RadarDatum = { domain: HseDomainKey; label: string; score: number };

type Props = { data: RadarDatum[] };

export function RadarChart({ data }: Props) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data}>
          <PolarGrid stroke="#2a3050" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#7a85a3", fontSize: 11 }}
          />
          <Radar
            name="Média"
            dataKey="score"
            stroke="#4f7fff"
            fill="#4f7fff"
            fillOpacity={0.35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e2332",
              border: "1px solid #2a3050",
              borderRadius: 8,
              color: "#e8ecf4",
            }}
          />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
