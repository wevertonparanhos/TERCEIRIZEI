"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySchema, type CompanyInput } from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Company = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  regimeTributario: string | null;
  status: string;
};

export function CompanyList({
  clientId,
  companies,
  canWrite,
  addCompany,
  deleteCompany,
}: {
  clientId: string;
  companies: Company[];
  canWrite: boolean;
  addCompany: (clientId: string, input: CompanyInput) => Promise<void>;
  deleteCompany: (clientId: string, companyId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyInput>({ resolver: zodResolver(companySchema), defaultValues: { status: "ativa" } });

  async function submit(data: CompanyInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await addCompany(clientId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(companyId: string) {
    await deleteCompany(clientId, companyId);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-navy">Empresas</h2>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Empresa"}
          </Button>
        )}
      </div>

      {companies.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-slate-400">Nenhuma empresa vinculada.</p>
      )}

      {companies.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {companies.map((company) => (
            <li key={company.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-brand-navy">{company.razaoSocial}</p>
                <p className="text-xs text-slate-400">
                  {company.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")}
                  {company.regimeTributario ? ` · ${company.regimeTributario}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={company.status === "ativa" ? "success" : "neutral"}>
                  {company.status === "ativa" ? "Ativa" : "Inativa"}
                </Badge>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleDelete(company.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="mt-4 space-y-3 border-t border-slate-100 pt-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" {...register("cnpj")} />
              {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input id="razaoSocial" {...register("razaoSocial")} />
              {errors.razaoSocial && <p className="text-xs text-red-600">{errors.razaoSocial.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
              <Input id="nomeFantasia" {...register("nomeFantasia")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="regimeTributario">Regime Tributário</Label>
              <Input id="regimeTributario" placeholder="Simples Nacional, MEI..." {...register("regimeTributario")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnae">CNAE</Label>
              <Input id="cnae" {...register("cnae")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="naturezaJuridica">Natureza Jurídica</Label>
              <Input id="naturezaJuridica" {...register("naturezaJuridica")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
              <Input id="inscricaoEstadual" {...register("inscricaoEstadual")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inscricaoMunicipal">Inscrição Municipal</Label>
              <Input id="inscricaoMunicipal" {...register("inscricaoMunicipal")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="state">Estado</Label>
              <Input id="state" maxLength={2} placeholder="UF" {...register("state")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="openedAt">Data de abertura</Label>
              <Input id="openedAt" type="date" {...register("openedAt")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyStatus">Situação cadastral</Label>
              <Select id="companyStatus" {...register("status")}>
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </Select>
            </div>
          </div>

          {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>}

          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar empresa"}
          </Button>
        </form>
      )}
    </div>
  );
}
