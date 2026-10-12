"use client";

import { useActionState, useState } from "react";
import { FormMessage, Input, SubmitButton, type FormState } from "@/components/ui/form";
import { formatBRL, parseBRLToCents } from "@/domain/money";
import { customerPrice, type CommissionMode } from "@/domain/pricing";
import { saveServiceOffersAction } from "../actions";

export type OfferItem = {
  id: string;
  kind: "PACKAGE" | "ADDON" | "RULE";
  name: string;
  detail?: string;
  unitLabel?: string | null;
  price: string;
  base?: string;
  min?: string;
};

export function OfferForm({
  serviceId,
  items,
  commissionRateBps,
  commissionMode,
}: {
  serviceId: string;
  items: OfferItem[];
  commissionRateBps: number;
  commissionMode: CommissionMode;
}) {
  const [state, action] = useActionState(saveServiceOffersAction, {} as FormState);
  const [prices, setPrices] = useState<Record<string, string>>(Object.fromEntries(items.map((i) => [i.id, i.price])));

  const preview = (value: string) => {
    const cents = parseBRLToCents(value);
    return cents ? formatBRL(customerPrice(cents, commissionRateBps, commissionMode)) : "—";
  };

  const groups = [
    { kind: "PACKAGE", title: "Pacotes" },
    { kind: "RULE", title: "Preço por unidade" },
    { kind: "ADDON", title: "Adicionais (opcionais)" },
  ] as const;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="serviceId" value={serviceId} />
      <FormMessage state={state} />

      {groups.map((g) => {
        const list = items.filter((i) => i.kind === g.kind);
        if (list.length === 0) return null;
        return (
          <div key={g.kind}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {list.map((item) => {
                const err = state.errors?.[`price_${item.id}`]?.[0];
                return (
                  <li key={item.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_9rem_9rem] sm:items-center">
                    <div className="text-sm">
                      <label htmlFor={`price_${item.id}`} className="font-medium">{item.name}</label>
                      {item.detail ? <p className="text-xs text-muted">{item.detail}</p> : null}
                    </div>
                    <div>
                      <span className="mb-1 block text-xs text-muted sm:hidden">Seu preço</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>
                        <Input
                          id={`price_${item.id}`}
                          name={`price_${item.id}`}
                          inputMode="decimal"
                          placeholder="não ofereço"
                          value={prices[item.id] ?? ""}
                          onChange={(e) => setPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                          aria-invalid={!!err}
                          className="pl-9"
                        />
                      </div>
                      {err ? <p className="mt-1 text-xs text-danger">{err}</p> : null}
                    </div>
                    <div className="text-sm sm:text-right">
                      <span className="block text-xs text-muted">Cliente paga{item.unitLabel ? ` / ${item.unitLabel}` : ""}</span>
                      <span className="font-semibold">{preview(prices[item.id] ?? "")}</span>
                    </div>
                    {item.kind === "RULE" ? (
                      <div className="grid grid-cols-2 gap-3 sm:col-span-3">
                        <label className="text-xs text-muted">
                          Taxa fixa (opcional)
                          <Input name={`base_${item.id}`} inputMode="decimal" defaultValue={item.base} placeholder="0,00" className="mt-1" />
                        </label>
                        <label className="text-xs text-muted">
                          Valor mínimo (opcional)
                          <Input name={`min_${item.id}`} inputMode="decimal" defaultValue={item.min} placeholder="0,00" className="mt-1" />
                        </label>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Deixe em branco os itens que você não oferece. Alterações valem só para novos pedidos.</p>
        <SubmitButton>Salvar preços</SubmitButton>
      </div>
    </form>
  );
}
