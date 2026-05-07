"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { name: "Seg", value: 18 },
  { name: "Ter", value: 24 },
  { name: "Qua", value: 31 },
  { name: "Qui", value: 28 },
  { name: "Sex", value: 42 },
  { name: "Sab", value: 36 },
];

export function AdminChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={data} margin={{ bottom: 0, left: 0, right: 0, top: 10 }}>
          <defs>
            <linearGradient id="sales" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#c8102e" stopOpacity={0.32} />
              <stop offset="95%" stopColor="#c8102e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6e8ec" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: "#667085", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              border: "1px solid #e6e8ec",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(17, 24, 39, 0.08)",
            }}
          />
          <Area
            dataKey="value"
            fill="url(#sales)"
            stroke="#c8102e"
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
