"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { companySchema, COMPANY_SIZES, type CompanyInput } from "@/lib/validations/company";
import { partnerSchema, type PartnerInput } from "@/lib/validations/partner";
import { activitySchema, type ActivityInput } from "@/lib/validations/activity";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import { PROCESS_PRIORITIES } from "@/lib/validations/process";
import { createOpeningWizard } from "@/modules/processes/wizard-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ClientOption = { id: string; name: string; doc: string };

type FormValues = {
  clientMode: "existing" | "new";
  existingClientId: string;
  newClient: ClientInput;
  company: CompanyInput;
  partners: PartnerInput[];
  activities: ActivityInput[];
  address: AddressInput;
  state: string;
  municipality: string;
  priority: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
};

const STEP_LABELS = ["Cliente", "Empresa", "Sócios", "Atividades", "Endereço", "Revisão"];

export function OpeningWizard({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    getValues,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      clientMode: clients.length > 0 ? "existing" : "new",
      newClient: { type: "PJ", status: "ativo" },
      company: { status: "ativa" },
      partners: [],
      activities: [],
      priority: "MEDIA",
    },
  });

  const partnerFields = useFieldArray({ control, name: "partners" });
  const activityFields = useFieldArray({ control, name: "activities" });

  const clientMode = watch("clientMode");
  const partners = watch("partners");
  const activities = watch("activities");
  const totalParticipation = partners.reduce((sum, p) => sum + (Number(p?.participationPercentage) || 0), 0);

  function validateStep(): boolean {
    setStepError(null);
    const values = getValues();

    if (step === 0) {
      if (values.clientMode === "existing") {
        if (!values.existingClientId) {
          setStepError("Selecione um cliente.");
          return false;
        }
        return true;
      }
      const result = clientSchema.safeParse(values.newClient);
      if (!result.success) {
        setStepError(result.error.issues[0]?.message ?? "Dados do cliente inválidos.");
        return false;
      }
      return true;
    }

    if (step === 1) {
      const result = companySchema.safeParse(values.company);
      if (!result.success) {
        setStepError(result.error.issues[0]?.message ?? "Dados da empresa inválidos.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (values.partners.length === 0) {
        setStepError("Adicione pelo menos um sócio.");
        return false;
      }
      for (const p of values.partners) {
        const result = partnerSchema.safeParse(p);
        if (!result.success) {
          setStepError(result.error.issues[0]?.message ?? "Dados de sócio inválidos.");
          return false;
        }
      }
      const total = values.partners.reduce((sum, p) => sum + Number(p.participationPercentage || 0), 0);
      if (total > 100) {
        setStepError(`Participação dos sócios soma ${total.toFixed(2)}%, acima de 100%.`);
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (values.activities.length === 0) {
        setStepError("Adicione pelo menos uma atividade (CNAE).");
        return false;
      }
      for (const a of values.activities) {
        const result = activitySchema.safeParse(a);
        if (!result.success) {
          setStepError(result.error.issues[0]?.message ?? "Dados de CNAE inválidos.");
          return false;
        }
      }
      return true;
    }

    if (step === 4) {
      const result = addressSchema.safeParse(values.address);
      if (!result.success) {
        setStepError(result.error.issues[0]?.message ?? "Endereço inválido.");
        return false;
      }
      return true;
    }

    return true;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function back() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!validateStep()) return;
    const values = getValues();
    if (!values.state || values.state.length !== 2) {
      setStepError("Informe a UF do processo (2 letras).");
      return;
    }
    if (!values.municipality) {
      setStepError("Informe o município do processo.");
      return;
    }

    setServerError(null);
    setSubmitting(true);
    try {
      const result = await createOpeningWizard({
        existingClientId: values.clientMode === "existing" ? values.existingClientId : undefined,
        newClient: values.clientMode === "new" ? values.newClient : undefined,
        company: values.company,
        partners: values.partners,
        activities: values.activities,
        address: values.address,
        state: values.state,
        municipality: values.municipality,
        priority: values.priority,
      });
      router.push(`/processos/${result.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar o processo.");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            className={`rounded-full px-3 py-1 ${
              index === step
                ? "bg-accent text-bg font-semibold"
                : index < step
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-alt text-muted-soft"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-border bg-surface p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" value="existing" {...register("clientMode")} />
                Cliente existente
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="new" {...register("clientMode")} />
                Novo cliente
              </label>
            </div>

            {clientMode === "existing" ? (
              <div className="space-y-1.5">
                <Label htmlFor="existingClientId">Cliente</Label>
                <Select id="existingClientId" {...register("existingClientId")}>
                  <option value="">Selecione...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.doc})
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nc-name">Nome / Razão Social</Label>
                  <Input id="nc-name" {...register("newClient.name")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-fantasy">Nome Fantasia</Label>
                  <Input id="nc-fantasy" {...register("newClient.fantasyName")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-type">Tipo</Label>
                  <Select id="nc-type" {...register("newClient.type")}>
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="PF">Pessoa Física</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-doc">CPF / CNPJ</Label>
                  <Input id="nc-doc" {...register("newClient.doc")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-email">E-mail</Label>
                  <Input id="nc-email" type="email" {...register("newClient.email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nc-phone">Telefone</Label>
                  <Input id="nc-phone" {...register("newClient.phone")} />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="co-cnpj">CNPJ</Label>
              <Input id="co-cnpj" {...register("company.cnpj")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-legalName">Razão Social</Label>
              <Input id="co-legalName" {...register("company.legalName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-tradeName">Nome Fantasia</Label>
              <Input id="co-tradeName" {...register("company.tradeName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-legalNature">Natureza Jurídica</Label>
              <Input id="co-legalNature" placeholder="ex: Sociedade Empresária Limitada" {...register("company.legalNature")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-size">Porte</Label>
              <Select id="co-size" {...register("company.companySize")}>
                <option value="">Não informado</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-capital">Capital Social (R$)</Label>
              <Input id="co-capital" inputMode="decimal" placeholder="0,00" {...register("company.capital")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="co-purpose">Objeto Social</Label>
              <Textarea id="co-purpose" rows={3} {...register("company.businessPurpose")} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-ink">Sócios</h2>
              <Badge variant={totalParticipation === 100 ? "success" : "warning"}>
                {totalParticipation.toFixed(2)}% de 100% alocado
              </Badge>
            </div>
            <div className="space-y-4">
              {partnerFields.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <Label htmlFor={`p-name-${index}`}>Nome</Label>
                    <Input id={`p-name-${index}`} {...register(`partners.${index}.name`)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`p-cpf-${index}`}>CPF</Label>
                    <Input id={`p-cpf-${index}`} {...register(`partners.${index}.cpf`)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`p-qual-${index}`}>Qualificação</Label>
                    <Input id={`p-qual-${index}`} placeholder="Sócio Administrador" {...register(`partners.${index}.qualification`)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`p-pct-${index}`}>Participação (%)</Label>
                    <Input id={`p-pct-${index}`} inputMode="decimal" {...register(`partners.${index}.participationPercentage`)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id={`p-admin-${index}`} type="checkbox" {...register(`partners.${index}.administrator`)} className="h-4 w-4" />
                    <Label htmlFor={`p-admin-${index}`}>É administrador</Label>
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => partnerFields.remove(index)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => partnerFields.append({ name: "", cpf: "", qualification: "", participationPercentage: 0, administrator: false })}
            >
              + Adicionar Sócio
            </Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-ink">Atividades (CNAE)</h2>
            <div className="space-y-4">
              {activityFields.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <Label htmlFor={`a-cnae-${index}`}>Código CNAE</Label>
                    <Input id={`a-cnae-${index}`} placeholder="0000-0/00" {...register(`activities.${index}.cnae`)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`a-desc-${index}`}>Descrição</Label>
                    <Input id={`a-desc-${index}`} {...register(`activities.${index}.description`)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id={`a-primary-${index}`}
                      type="radio"
                      name="primary-activity"
                      checked={activities[index]?.isPrimary === true}
                      onChange={() => {
                        activityFields.fields.forEach((_, i) =>
                          setValue(`activities.${i}.isPrimary`, i === index)
                        );
                      }}
                    />
                    <Label htmlFor={`a-primary-${index}`}>Atividade principal</Label>
                  </div>
                  <div className="flex items-end justify-end">
                    <button type="button" onClick={() => activityFields.remove(index)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                // getValues() (não activityFields.fields.length) porque lê o
                // estado atual do form store — em cliques consecutivos sem
                // esperar re-render, fields.length ficaria desatualizado e
                // marcaria mais de um item como principal.
                activityFields.append({ cnae: "", description: "", isPrimary: getValues("activities").length === 0 })
              }
            >
              + Adicionar CNAE
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ad-cep">CEP</Label>
              <Input id="ad-cep" {...register("address.cep")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ad-street">Logradouro</Label>
              <Input id="ad-street" {...register("address.street")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-number">Número</Label>
              <Input id="ad-number" {...register("address.number")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-complement">Complemento</Label>
              <Input id="ad-complement" {...register("address.complement")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-neighborhood">Bairro</Label>
              <Input id="ad-neighborhood" {...register("address.neighborhood")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-city">Cidade</Label>
              <Input id="ad-city" {...register("address.city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ad-state">UF</Label>
              <Input id="ad-state" maxLength={2} {...register("address.state")} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="proc-state">UF do Processo</Label>
                <Input id="proc-state" maxLength={2} placeholder="MG" {...register("state")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proc-municipality">Município</Label>
                <Input id="proc-municipality" {...register("municipality")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proc-priority">Prioridade</Label>
                <Select id="proc-priority" {...register("priority")}>
                  {PROCESS_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface-alt p-4 text-sm">
              <p className="font-medium text-ink">
                {clientMode === "existing"
                  ? clients.find((c) => c.id === getValues("existingClientId"))?.name
                  : getValues("newClient.name")}
              </p>
              <p className="text-muted">{getValues("company.legalName")} — {getValues("company.cnpj")}</p>
              <p className="mt-2 text-muted-soft">
                {partners.length} sócio(s) · {activities.length} CNAE(s) · {getValues("address.city")}/{getValues("address.state")}
              </p>
            </div>
          </div>
        )}

        {stepError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {stepError}
          </p>
        )}
        {serverError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {serverError}
          </p>
        )}

        <div className="mt-6 flex justify-between">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
            ← Anterior
          </Button>
          {step < STEP_LABELS.length - 1 ? (
            <Button type="button" onClick={next}>
              Próximo →
            </Button>
          ) : (
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Criando..." : "Criar Processo de Abertura"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
