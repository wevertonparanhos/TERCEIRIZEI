"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Owner = { id: string; name: string };

export function ClientForm({
  defaultValues,
  owners,
  onSubmit,
  submitLabel,
  readOnly = false,
}: {
  defaultValues?: Partial<ClientInput>;
  owners: Owner[];
  onSubmit: (data: ClientInput) => Promise<{ id: string } | void>;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      type: "PJ",
      status: "ativo",
      ...defaultValues,
    },
  });

  async function submit(data: ClientInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result?.id) {
        router.push(`/clientes/${result.id}`);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-6" noValidate>
      <fieldset disabled={readOnly} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome / Razão Social</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fantasyName">Nome Fantasia</Label>
          <Input id="fantasyName" {...register("fantasyName")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" {...register("type")}>
            <option value="PJ">Pessoa Jurídica</option>
            <option value="PF">Pessoa Física</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="doc">CPF / CNPJ</Label>
          <Input id="doc" {...register("doc")} />
          {errors.doc && <p className="text-xs text-red-600">{errors.doc.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" {...register("whatsapp")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="zipCode">CEP</Label>
          <Input id="zipCode" {...register("zipCode")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" {...register("address")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" maxLength={2} placeholder="UF" {...register("state")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ownerUserId">Responsável pelo atendimento</Label>
          <Select id="ownerUserId" {...register("ownerUserId")}>
            <option value="">Sem responsável definido</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>
      </fieldset>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Alterações salvas.</p>
      )}

      {!readOnly && (
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      )}
    </form>
  );
}
