"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const SERIES_PLAN = "rgb(var(--color-accent))";
const SERIES_GOOD = "rgb(var(--color-good))";
const GRID_COLOR = "rgb(var(--color-border))";
const AXIS_COLOR = "rgb(var(--color-muted-soft))";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const currencyCompact = new Intl.NumberFormat("pt-BR", { notation: "compact", compactDisplay: "short", currency: "BRL", style: "currency" });

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="mt-1 flex items-center gap-1.5 text-muted">
          <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: item.color }} />
          {item.name}: <span className="font-medium text-ink">{formatter(item.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: { month: string; previsto: number; recebido: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap={16} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis
          tick={{ fill: AXIS_COLOR, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => currencyCompact.format(v)}
        />
        <Tooltip content={<ChartTooltip formatter={(v) => currencyFormatter.format(v)} />} cursor={{ fill: "rgb(var(--color-surface-alt))" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
        <Bar dataKey="previsto" name="Previsto" fill={SERIES_PLAN} radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="recebido" name="Recebido" fill={SERIES_GOOD} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProcessesTrendChart({ data }: { data: { month: string; criados: number; concluidos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} stroke={GRID_COLOR} />
        <XAxis dataKey="month" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
        <YAxis tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<ChartTooltip formatter={(v) => String(v)} />} cursor={{ stroke: GRID_COLOR }} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
        <Line type="monotone" dataKey="criados" name="Criados" stroke={SERIES_PLAN} strokeWidth={2} dot={{ r: 4, fill: SERIES_PLAN }} />
        <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke={SERIES_GOOD} strokeWidth={2} dot={{ r: 4, fill: SERIES_GOOD }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ServiceTypeBarChart({ data }: { data: { label: string; count: number }[] }) {
  const height = Math.max(160, data.length * 36 + 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
        <XAxis type="number" tick={{ fill: AXIS_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: AXIS_COLOR, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip content={<ChartTooltip formatter={(v) => String(v)} />} cursor={{ fill: "rgb(var(--color-surface-alt))" }} />
        <Bar dataKey="count" name="Processos ativos" fill={SERIES_PLAN} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
