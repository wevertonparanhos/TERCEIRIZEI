"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, Input, SubmitButton, type FormState } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { addTimeOffAction, saveAvailabilityAction, saveServiceAreasAction } from "../actions";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type DayValue = { on: boolean; start: string; end: string };

export function AvailabilityForm({ days, bufferMinutes }: { days: DayValue[]; bufferMinutes: number }) {
  const [state, action] = useActionState(saveAvailabilityAction, {} as FormState);
  const [on, setOn] = useState(days.map((d) => d.on));

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {days.map((d, i) => (
          <li key={WEEKDAYS[i]} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex w-32 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name={`day_${i}_on`}
                checked={on[i]}
                onChange={(e) => setOn((v) => v.map((x, j) => (j === i ? e.target.checked : x)))}
                className="size-4 accent-[var(--color-brand)]"
              />
              {WEEKDAYS[i]}
            </label>
            <div className={cn("flex items-center gap-2 text-sm", !on[i] && "opacity-40")}>
              <Input type="time" name={`day_${i}_start`} defaultValue={d.start} disabled={!on[i]} className="h-9 w-28" aria-label={`${WEEKDAYS[i]}: início`} />
              <span className="text-muted">até</span>
              <Input type="time" name={`day_${i}_end`} defaultValue={d.end} disabled={!on[i]} className="h-9 w-28" aria-label={`${WEEKDAYS[i]}: fim`} />
            </div>
            {state.errors?.[`day_${i}`] ? <p className="w-full text-xs text-danger">{state.errors[`day_${i}`]?.[0]}</p> : null}
          </li>
        ))}
      </ul>
      <Field label="Intervalo entre serviços (minutos)" name="bufferMinutes" error={state.errors?.bufferMinutes} hint="Tempo de deslocamento/descanso reservado depois de cada atendimento.">
        <Input id="bufferMinutes" name="bufferMinutes" type="number" min={0} max={240} step={5} defaultValue={bufferMinutes} className="w-32" />
      </Field>
      <SubmitButton>Salvar agenda</SubmitButton>
    </form>
  );
}

export function TimeOffForm({ today }: { today: string }) {
  const [state, action] = useActionState(addTimeOffAction, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr]">
        <Field label="De" name="from" error={state.errors?.from}>
          <Input id="from" name="from" type="date" min={today} defaultValue={state.ok ? undefined : state.values?.from} required />
        </Field>
        <Field label="Até" name="to" error={state.errors?.to}>
          <Input id="to" name="to" type="date" min={today} defaultValue={state.ok ? undefined : state.values?.to} required />
        </Field>
        <Field label="Motivo (opcional)" name="reason">
          <Input id="reason" name="reason" maxLength={120} placeholder="Férias, consulta…" />
        </Field>
      </div>
      <SubmitButton variant="secondary">Bloquear período</SubmitButton>
    </form>
  );
}

export type CityArea = { id: string; name: string; state: string; selected: boolean; neighborhoods: string };

export function ServiceAreasForm({ cities }: { cities: CityArea[] }) {
  const [state, action] = useActionState(saveServiceAreasAction, {} as FormState);
  const [selected, setSelected] = useState(Object.fromEntries(cities.map((c) => [c.id, c.selected])));

  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {cities.map((c) => (
          <li key={c.id} className="space-y-2 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name={`city_${c.id}`}
                checked={selected[c.id]}
                onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                className="size-4 accent-[var(--color-brand)]"
              />
              {c.name}/{c.state}
            </label>
            {selected[c.id] ? (
              <Input
                name={`hoods_${c.id}`}
                defaultValue={c.neighborhoods}
                placeholder="Todos os bairros (ou liste separando por vírgula: Centro, Savassi…)"
                aria-label={`Bairros atendidos em ${c.name}`}
                className="h-9 text-sm"
              />
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Seu endereço residencial nunca é exibido. Os clientes veem só as cidades que você atende.</p>
      <SubmitButton>Salvar regiões</SubmitButton>
    </form>
  );
}
