"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { partnerSchema, type PartnerInput } from "@/lib/validations/partner";
import { addPartner, deletePartner } from "@/modules/companies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Partner = {
  id: string;
  name: string;
  cpf: string;
  qualification: string;
  participationPercentage: number | string;
  administrator: boolean;
};

export function PartnerList({ companyId, partners }: { companyId: string; partners: Partner[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartnerInput>({ resolver: zodResolver(partnerSchema), defaultValues: { administrator: false } });

  const totalAllocated = partners.reduce((sum, p) => sum + Number(p.participationPercentage), 0);

  async function submit(data: PartnerInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await addPartner(companyId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível adicionar o sócio.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(partnerId: string) {
    await deletePartner(companyId, partnerId);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Sócios</h2>
        <Badge variant={totalAllocated === 100 ? "success" : "warning"}>
          {totalAllocated.toFixed(2)}% de 100% alocado
        </Badge>
      </div>

      {partners.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">CPF</th>
                <th className="px-3 py-2 font-medium">Qualificação</th>
                <th className="px-3 py-2 font-medium">Participação</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">
                    {partner.name} {partner.administrator && <Badge variant="info" className="ml-1">Admin</Badge>}
                  </td>
                  <td className="px-3 py-2 text-muted">{partner.cpf}</td>
                  <td className="px-3 py-2 text-muted">{partner.qualification}</td>
                  <td className="px-3 py-2 text-muted">{Number(partner.participationPercentage).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => remove(partner.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Adicionar Sócio
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="partner-name">Nome</Label>
              <Input id="partner-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="partner-cpf">CPF</Label>
              <Input id="partner-cpf" {...register("cpf")} />
              {errors.cpf && <p className="text-xs text-red-600">{errors.cpf.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="partner-qualification">Qualificação</Label>
              <Input id="partner-qualification" placeholder="Sócio Administrador" {...register("qualification")} />
              {errors.qualification && <p className="text-xs text-red-600">{errors.qualification.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="partner-percentage">Participação (%)</Label>
              <Input id="partner-percentage" inputMode="decimal" {...register("participationPercentage")} />
              {errors.participationPercentage && (
                <p className="text-xs text-red-600">{errors.participationPercentage.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="partner-admin" type="checkbox" {...register("administrator")} className="h-4 w-4" />
              <Label htmlFor="partner-admin">É administrador</Label>
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
