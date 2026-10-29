"use client";

import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashflowPoint } from "@/modules/finance/dashboard";

const GOOD = "rgb(var(--color-good))";
const PENDING = "#F5A23C";
const ACCUM = "rgb(var(--color-accent))";
const GRID = "rgb(var(--color-border))";
const AXIS = "rgb(var(--color-muted-soft))";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1, style: "currency", currency: "BRL" });

type TooltipProps = { active?: boolean; label?: string; payload?: { name?: string; value?: number; color?: string }[] };

function FlowTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-4 text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold text-ink">{brl.format(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

/** Fluxo de caixa do período: recebido e pendente por dia (ou mês) e o acumulado. */
export function CashflowChart({ data, todayLabel }: { data: CashflowPoint[]; todayLabel?: string }) {
  const uid = useId().replace(/:/g, "");
  if (data.length === 0 || data.every((p) => p.acumulado === 0)) {
    return <p className="py-16 text-center text-sm text-muted-soft">Nenhum pagamento neste período.</p>;
  }
  // Muitos rótulos no eixo viram borrão: mostra mais ou menos 8.
  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`${uid}-good`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOOD} stopOpacity={0.35} />
              <stop offset="100%" stopColor={GOOD} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${uid}-pend`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PENDING} stopOpacity={0.35} />
              <stop offset="100%" stopColor={PENDING} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" interval={interval} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v: number) => compact.format(v)} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={64} />
          <Tooltip content={<FlowTooltip />} cursor={{ stroke: GRID }} />
          <Area isAnimationActive={false} type="monotone" dataKey="recebido" name="Recebido" stroke={GOOD} strokeWidth={2} fill={`url(#${uid}-good)`} />
          <Area isAnimationActive={false} type="monotone" dataKey="pendente" name="Pendente" stroke={PENDING} strokeWidth={2} fill={`url(#${uid}-pend)`} />
          <Line isAnimationActive={false} type="monotone" dataKey="acumulado" name="Acumulado" stroke={ACCUM} strokeWidth={2} strokeDasharray="2 3" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {todayLabel && <span className="sr-only">Hoje: {todayLabel}</span>}
    </div>
  );
}
