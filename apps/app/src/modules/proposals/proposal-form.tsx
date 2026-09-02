"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { proposalSchema, type ProposalInput } from "@/lib/validations/proposal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Client = { id: string; name: string };

export function ProposalForm({
  clients,
  defaultValues,
  submitLabel = "Criar proposta",
  onSubmit,
}: {
  clients: Client[];
  defaultValues?: Partial<ProposalInput>;
  submitLabel?: string;
  onSubmit: (data: ProposalInput) => Promise<string | void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProposalInput>({ resolver: zodResolver(proposalSchema), defaultValues });

  async function submit(data: ProposalInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const id = await onSubmit(data);
      if (id) router.push(`/propostas/${id}`);
      else router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Cliente</Label>
          <Select id="clientId" {...register("clientId")}>
            <option value="">Selecione...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="validUntil">Válida até</Label>
          <Input id="validUntil" type="date" {...register("validUntil")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" placeholder="Ex.: Consultoria tributária — 3 meses" {...register("title")} />
        {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
