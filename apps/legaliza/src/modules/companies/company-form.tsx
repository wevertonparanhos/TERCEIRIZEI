"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySchema, COMPANY_SIZES, type CompanyInput } from "@/lib/validations/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CompanyForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<CompanyInput>;
  onSubmit: (data: CompanyInput) => Promise<{ id: string } | void>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { status: "ativa", ...defaultValues },
  });

  async function submit(data: CompanyInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result?.id) {
        router.push(`/empresas/${result.id}`);
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
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" {...register("cnpj")} />
          {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalName">Razão Social</Label>
          <Input id="legalName" {...register("legalName")} />
          {errors.legalName && <p className="text-xs text-red-600">{errors.legalName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tradeName">Nome Fantasia</Label>
          <Input id="tradeName" {...register("tradeName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalNature">Natureza Jurídica</Label>
          <Input id="legalNature" placeholder="ex: Sociedade Empresária Limitada" {...register("legalNature")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companySize">Porte</Label>
          <Select id="companySize" {...register("companySize")}>
            <option value="">Não informado</option>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="capital">Capital Social (R$)</Label>
          <Input id="capital" inputMode="decimal" placeholder="0,00" {...register("capital")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
          <Input id="stateRegistration" {...register("stateRegistration")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="municipalRegistration">Inscrição Municipal</Label>
          <Input id="municipalRegistration" {...register("municipalRegistration")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...register("status")}>
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </Select>
        </div>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Alterações salvas.
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
