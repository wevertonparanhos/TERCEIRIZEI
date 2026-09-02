"use client";

import { useState } from "react";
import Link from "next/link";
import { getMonthGrid, WEEKDAY_LABELS, dayKeyFromDate } from "@/modules/calendar/month";
import { EVENT_TYPE_LABELS, EVENT_TYPE_DOT, type CalendarEvent } from "@/modules/calendar/events";

const MAX_VISIBLE_PER_DAY = 3;

export function CalendarGrid({ monthKey, eventsByDay }: { monthKey: string; eventsByDay: Record<string, CalendarEvent[]> }) {
  const days = getMonthGrid(monthKey);
  const todayKey = days.find((d) => d.isToday)?.dayKey ?? null;
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-surface-alt text-xs font-medium uppercase tracking-wide text-muted">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="px-2 py-2 text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const events = eventsByDay[day.dayKey] ?? [];
            const visible = events.slice(0, MAX_VISIBLE_PER_DAY);
            const overflow = events.length - visible.length;
            const isSelected = selectedDay === day.dayKey;
            return (
              <button
                key={day.dayKey}
                type="button"
                onClick={() => setSelectedDay(day.dayKey)}
                className={`min-h-[92px] border-b border-r border-border p-1.5 text-left align-top last:border-r-0 hover:bg-surface-alt ${
                  !day.inMonth ? "bg-surface-alt/40 text-muted-soft" : ""
                } ${isSelected ? "ring-2 ring-inset ring-accent" : ""}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    day.isToday ? "bg-accent font-semibold text-white" : day.inMonth ? "text-ink" : "text-muted-soft"
                  }`}
                >
                  {day.date.getUTCDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {visible.map((event) => (
                    <div key={event.id} className="flex items-center gap-1 truncate text-[11px] text-muted">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${EVENT_TYPE_DOT[event.type]}`} />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  {overflow > 0 && <p className="text-[11px] text-muted-soft">+{overflow} mais</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">
          {selectedDay ? formatSelectedDay(selectedDay) : "Selecione um dia"}
        </h3>
        {selectedDay && selectedEvents.length === 0 && (
          <p className="mt-3 text-sm text-muted-soft">Nada agendado neste dia.</p>
        )}
        <ul className="mt-3 space-y-3">
          {selectedEvents.map((event) => (
            <li key={event.id} className="text-sm">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 flex-none rounded-full ${EVENT_TYPE_DOT[event.type]}`} />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-soft">
                  {EVENT_TYPE_LABELS[event.type]}
                </span>
                {event.overdue && <span className="text-xs font-medium text-red-600">Atrasado</span>}
              </div>
              <Link href={event.href} className="mt-0.5 block font-medium text-ink hover:underline">
                {event.title}
              </Link>
              {event.clientName && <p className="text-xs text-muted">{event.clientName}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatSelectedDay(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" });
}
