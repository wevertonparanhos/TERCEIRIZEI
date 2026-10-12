"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { saveAddressAction } from "@/app/conta/actions";
import { Field, FormMessage, Input, SubmitButton, Textarea, type FormState } from "./ui/form";

export type AddressValues = {
  id?: string;
  label: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
  isDefault: boolean;
};

const EMPTY: AddressValues = { label: "Casa", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", notes: "", isDefault: false };

/** Formulário de endereço com preenchimento automático pelo CEP. */
export function AddressForm({ initial, onSaved }: { initial?: AddressValues; onSaved?: () => void }) {
  const [state, action] = useActionState(saveAddressAction, {} as FormState);
  const [v, setV] = useState<AddressValues>(initial ?? EMPTY);
  const [lookup, setLookup] = useState<{ loading: boolean; message?: string; served?: boolean }>({ loading: false });
  const numberRef = useRef<HTMLInputElement>(null);
  const e = state.errors ?? {};

  // Avisa o pai uma única vez por salvamento (o callback muda a cada render).
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  useEffect(() => {
    if (state.ok) onSavedRef.current?.();
  }, [state]);

  async function onCep(raw: string) {
    const masked = raw.replace(/\D/g, "").slice(0, 8);
    setV((x) => ({ ...x, cep: masked.length > 5 ? `${masked.slice(0, 5)}-${masked.slice(5)}` : masked }));
    if (masked.length !== 8) return setLookup({ loading: false });
    setLookup({ loading: true });
    try {
      const res = await fetch(`/api/cep/${masked}`);
      const data = await res.json();
      if (!res.ok) return setLookup({ loading: false, message: data.error });
      setV((x) => ({ ...x, street: data.street || x.street, neighborhood: data.neighborhood || x.neighborhood, city: data.city, state: data.state }));
      setLookup({ loading: false, served: data.served, message: data.served ? undefined : `Ainda não atendemos ${data.city}/${data.state}. Você pode salvar o endereço mesmo assim.` });
      numberRef.current?.focus();
    } catch {
      setLookup({ loading: false, message: "Não foi possível consultar o CEP. Preencha manualmente." });
    }
  }

  const set = (k: keyof AddressValues) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: ev.target.value }));

  return (
    <form action={action} className="space-y-4" noValidate>
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-6">
        <Field label="CEP" name="cep" error={e.cep} className="sm:col-span-2">
          <div className="relative">
            <Input id="cep" name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={v.cep} onChange={(ev) => onCep(ev.target.value)} required />
            {lookup.loading ? <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="Buscando CEP" /> : null}
          </div>
        </Field>
        <Field label="Identificação" name="label" error={e.label} className="sm:col-span-4">
          <Input id="label" name="label" value={v.label} onChange={set("label")} placeholder="Casa, Trabalho…" required />
        </Field>
        {lookup.message ? <p className="text-xs font-medium text-warning sm:col-span-6" role="status">{lookup.message}</p> : null}
        <Field label="Rua" name="street" error={e.street} className="sm:col-span-4">
          <Input id="street" name="street" autoComplete="address-line1" value={v.street} onChange={set("street")} required />
        </Field>
        <Field label="Número" name="number" error={e.number} className="sm:col-span-2">
          <Input id="number" ref={numberRef} name="number" value={v.number} onChange={set("number")} required />
        </Field>
        <Field label="Complemento" name="complement" className="sm:col-span-3">
          <Input id="complement" name="complement" autoComplete="address-line2" value={v.complement} onChange={set("complement")} placeholder="Apto, bloco…" />
        </Field>
        <Field label="Bairro" name="neighborhood" error={e.neighborhood} className="sm:col-span-3">
          <Input id="neighborhood" name="neighborhood" value={v.neighborhood} onChange={set("neighborhood")} required />
        </Field>
        <Field label="Cidade" name="city" error={e.city} className="sm:col-span-4">
          <Input id="city" name="city" autoComplete="address-level2" value={v.city} onChange={set("city")} required />
        </Field>
        <Field label="UF" name="state" error={e.state} className="sm:col-span-2">
          <Input id="state" name="state" maxLength={2} className="uppercase" value={v.state} onChange={set("state")} required />
        </Field>
        <Field label="Observações para o profissional (opcional)" name="notes" className="sm:col-span-6" hint="Ex.: portaria, como estacionar. Só é compartilhado após o pagamento.">
          <Textarea id="notes" name="notes" rows={2} maxLength={300} value={v.notes} onChange={set("notes")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isDefault" defaultChecked={v.isDefault} className="size-4 accent-[var(--color-brand)]" /> Usar como endereço principal
      </label>
      <SubmitButton>Salvar endereço</SubmitButton>
    </form>
  );
}
