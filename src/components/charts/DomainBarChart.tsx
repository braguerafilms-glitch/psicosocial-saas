"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { classify } from "@/lib/hse-scoring";

export type BarDatum = { label: string; score: number };

type Props = { data: BarDatum[] };

export function DomainBarChart({ data }: Props) {
  const enriched = data.map((d) => ({
    ...d,
    fill: classify(d.score).color,
  }));

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={enriched}
          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" />
          <XAxis type="number" domain={[0, 5]} stroke="#7a85a3" />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            stroke="#7a85a3"
            tick={{ fontSize: 11, fill: "#7a85a3" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(79,127,255,0.08)" }}
            contentStyle={{
              backgroundColor: "#1e2332",
              border: "1px solid #2a3050",
              borderRadius: 8,
              color: "#e8ecf4",
            }}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]}>
            {enriched.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
