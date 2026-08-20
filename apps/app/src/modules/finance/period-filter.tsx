"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERIOD_KEYS, PERIOD_LABELS, type PeriodKey } from "@/modules/finance/period";

export function PeriodFilter({ current, start, end }: { current: PeriodKey; start: string; end: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(key: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setCustomRange(field: "inicio" | "fim", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", "personalizado");
    params.set(field, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {PERIOD_KEYS.filter((k) => k !== "personalizado").map((key) => (
        <Button
          key={key}
          type="button"
          size="sm"
          variant={current === key ? "default" : "outline"}
          onClick={() => setPeriod(key)}
        >
          {PERIOD_LABELS[key]}
        </Button>
      ))}
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <Input
          type="date"
          value={start}
          onChange={(e) => setCustomRange("inicio", e.target.value)}
          className="h-9 w-[150px]"
        />
        <span>até</span>
        <Input
          type="date"
          value={end}
          onChange={(e) => setCustomRange("fim", e.target.value)}
          className="h-9 w-[150px]"
        />
      </div>
    </div>
  );
}
