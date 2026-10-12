"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton, Textarea, type FormState } from "@/components/ui/form";
import { updateProviderProfileAction } from "../actions";

type Values = {
  displayName: string;
  bio: string;
  phone: string;
  whatsapp: string;
  baseCity: string;
  baseState: string;
  experienceYears: string;
  qualifications: string;
};

export function ProviderProfileForm({ values }: { values: Values }) {
  const [state, action] = useActionState(updateProviderProfileAction, {} as FormState);
  const e = state.errors ?? {};
  // Após erro, mantém o que foi digitado; senão, os valores salvos.
  const v = { ...values, ...(state.ok ? {} : state.values) } as Values;

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-ink">Perfil público</legend>
        <Field label="Nome profissional" name="displayName" error={e.displayName} className="sm:col-span-2">
          <Input id="displayName" name="displayName" defaultValue={v.displayName} required />
        </Field>
        <Field label="Apresentação" name="bio" error={e.bio} className="sm:col-span-2" hint="Conte sua experiência e como você trabalha.">
          <Textarea id="bio" name="bio" defaultValue={v.bio} maxLength={800} rows={4} />
        </Field>
        <Field label="Cidade base" name="baseCity" error={e.baseCity}>
          <Input id="baseCity" name="baseCity" defaultValue={v.baseCity} required />
        </Field>
        <Field label="UF" name="baseState" error={e.baseState}>
          <Input id="baseState" name="baseState" defaultValue={v.baseState} maxLength={2} className="uppercase" required />
        </Field>
        <Field label="Anos de experiência" name="experienceYears" error={e.experienceYears}>
          <Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} defaultValue={v.experienceYears} />
        </Field>
        <Field label="Qualificações e cursos" name="qualifications" error={e.qualifications} className="sm:col-span-2">
          <Textarea id="qualifications" name="qualifications" defaultValue={v.qualifications} maxLength={800} rows={3} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold text-ink">Contato (privado)</legend>
        <p className="text-xs text-muted sm:col-span-2">
          Só é mostrado ao cliente depois que o pagamento de um pedido seu for confirmado.
        </p>
        <Field label="Telefone" name="phone" error={e.phone}>
          <Input id="phone" name="phone" type="tel" defaultValue={v.phone} required />
        </Field>
        <Field label="WhatsApp (opcional)" name="whatsapp" error={e.whatsapp}>
          <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={v.whatsapp} />
        </Field>
      </fieldset>

      <SubmitButton>Salvar perfil</SubmitButton>
    </form>
  );
}
