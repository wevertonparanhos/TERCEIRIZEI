"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { monthKeyLabel, shiftMonthKey, monthKeyFromDate } from "@/modules/calendar/month";

export function CalendarNav({ monthKey }: { monthKey: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(key: string) {
    router.push(`${pathname}?mes=${key}`);
  }

  const label = monthKeyLabel(monthKey);

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="outline" size="sm" onClick={() => goTo(shiftMonthKey(monthKey, -1))}>
        ← Anterior
      </Button>
      <h2 className="min-w-[180px] text-center text-base font-semibold capitalize text-ink">{label}</h2>
      <Button type="button" variant="outline" size="sm" onClick={() => goTo(shiftMonthKey(monthKey, 1))}>
        Próximo →
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => goTo(monthKeyFromDate(new Date()))}>
        Hoje
      </Button>
    </div>
  );
}
