"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, SubmitButton, type FormState } from "@/components/ui/form";
import { savePixKeyAction } from "../actions";

const TYPES = [
  { v: "CPF", label: "CPF" },
  { v: "CNPJ", label: "CNPJ" },
  { v: "EMAIL", label: "E-mail" },
  { v: "PHONE", label: "Celular" },
  { v: "EVP", label: "Chave aleatória" },
];

export function PixKeyForm({ current }: { current: { type: string; masked: string } | null }) {
  const [state, action] = useActionState(savePixKeyAction, {} as FormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {current ? <p className="text-sm">Chave atual: <span className="font-semibold">{current.type} · {current.masked}</span></p> : null}
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Tipo" name="pixKeyType" error={state.errors?.pixKeyType}>
          <Select id="pixKeyType" name="pixKeyType" defaultValue={state.values?.pixKeyType ?? current?.type ?? "CPF"}>
            {TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Chave PIX" name="pixKey" error={state.errors?.pixKey} hint="A chave deve estar no seu nome.">
          <Input id="pixKey" name="pixKey" autoComplete="off" defaultValue={state.values?.pixKey} required />
        </Field>
      </div>
      <SubmitButton>{current ? "Alterar chave PIX" : "Salvar chave PIX"}</SubmitButton>
    </form>
  );
}
