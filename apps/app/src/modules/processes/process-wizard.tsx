"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal, Stepper } from "@/components/ui/modal";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import type { CreateProcessInput } from "@/lib/validations/process";

type Workspace = { id: string; name: string; stages: { id: string; label: string }[] };
type Client = { id: string; name: string };
type Company = { id: string; clientId: string; razaoSocial: string };
type ServiceType = {
  id: string;
  name: string;
  defaultPrice: string | null;
  defaultDeadlineDays: number | null;
  defaultPriority: string | null;
  checklist: string[];
};

const STEPS = ["Serviço", "Básico", "Detalhes", "Checklist", "Cronograma", "Pagamento"];

function inputDateFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-alt/50 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 flex-none rounded-full transition-colors ${checked ? "bg-accent" : "bg-border-strong"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function NewTaskWizard({
  workspaces,
  defaultWorkspaceId,
  clients,
  companies,
  serviceTypes,
  onSubmit,
  autoOpen = false,
}: {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  clients: Client[];
  companies: Company[];
  serviceTypes: ServiceType[];
  onSubmit: (data: CreateProcessInput) => Promise<{ id: string } | void>;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const initialWorkspace = workspaces.find((w) => w.id === defaultWorkspaceId) ?? workspaces[0];

  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspace?.id ?? "");
  const [stageId, setStageId] = useState("");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<CreateProcessInput["priority"]>("MEDIA");
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [hasDelivery, setHasDelivery] = useState(false);
  const [plannedStartAt, setPlannedStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [plannedDeliveryAt, setPlannedDeliveryAt] = useState("");
  const [hasPayment, setHasPayment] = useState(false);
  const [value, setValue] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const clientCompanies = useMemo(() => companies.filter((c) => c.clientId === clientId), [companies, clientId]);

  function reset() {
    setStep(1);
    setError(null);
    setTemplateId(null);
    setWorkspaceId(initialWorkspace?.id ?? "");
    setStageId("");
    setName("");
    setPriority("MEDIA");
    setClientId("");
    setCompanyId("");
    setServiceTypeId("");
    setNotes("");
    setChecklist([]);
    setNewItem("");
    setHasDelivery(false);
    setPlannedStartAt("");
    setDueAt("");
    setPlannedDeliveryAt("");
    setHasPayment(false);
    setValue("");
    setPaymentDueDate("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function pickTemplate(id: string | null) {
    setTemplateId(id);
    if (!id) {
      setServiceTypeId("");
      setChecklist([]);
      return;
    }
    const st = serviceTypes.find((s) => s.id === id);
    if (!st) return;
    setServiceTypeId(st.id);
    setChecklist(st.checklist);
    if (st.defaultPriority) setPriority(st.defaultPriority as CreateProcessInput["priority"]);
    if (st.defaultPrice) {
      setHasPayment(true);
      setValue(st.defaultPrice);
    }
    if (st.defaultDeadlineDays) setDueAt(inputDateFromNow(st.defaultDeadlineDays));
  }

  function stepError(): string | null {
    if (step === 2 && name.trim().length < 3) return "Informe o nome da tarefa.";
    if (step === 3 && !clientId) return "Selecione um cliente.";
    if (step === 3 && !serviceTypeId) return "Selecione o tipo de serviço.";
    if (step === 6 && hasPayment && Number(value) > 0 && !paymentDueDate) {
      return "Informe a data prevista de pagamento — sem ela o valor não aparece no Financeiro.";
    }
    return null;
  }

  function next() {
    const err = stepError();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length, s + 1));
  }

  async function submit() {
    const err = stepError();
    if (err) return setError(err);
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit({
        workspaceId,
        stageId,
        clientId,
        companyId,
        serviceTypeId,
        description: name.trim(),
        priority,
        notes,
        plannedStartAt,
        dueAt,
        plannedDeliveryAt: hasDelivery ? plannedDeliveryAt : "",
        value: hasPayment ? value : "",
        paymentDueDate: hasPayment ? paymentDueDate : "",
        checklist,
      });
      close();
      if (result?.id) router.push(`/processos/${result.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a tarefa.");
    } finally {
      setSubmitting(false);
    }
  }

  function addChecklistItem() {
    const label = newItem.trim();
    if (!label) return;
    setChecklist((c) => [...c, label]);
    setNewItem("");
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Nova Tarefa
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Nova Tarefa"
        description="Crie uma nova tarefa: escolha um serviço, defina informações básicas, detalhes, cronograma e pagamento."
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  Voltar
                </Button>
              )}
              {step < STEPS.length ? (
                <Button type="button" onClick={next}>
                  Próximo
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? "Criando..." : "Criar tarefa"}
                </Button>
              )}
            </div>
          </>
        }
      >
        <Stepper steps={STEPS} current={step} />

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Escolha um serviço para pré-preencher a tarefa, ou comece em branco.</p>
            <button
              type="button"
              onClick={() => pickTemplate(null)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                templateId === null ? "border-accent bg-accent-soft/60" : "border-border hover:bg-surface-alt"
              }`}
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-alt text-muted">
                <FileText className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Começar em branco</span>
                <span className="block text-xs text-muted">Preencha todos os dados manualmente.</span>
              </span>
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              {serviceTypes.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => pickTemplate(st.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    templateId === st.id ? "border-accent bg-accent-soft/60" : "border-border hover:bg-surface-alt"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{st.name}</span>
                    {templateId === st.id && <Check className="h-4 w-4 text-accent" />}
                  </span>
                  <span className="mt-1 flex gap-2 text-xs text-muted">
                    {st.defaultPrice && <span>R$ {Number(st.defaultPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                    {st.checklist.length > 0 && <span>{st.checklist.length} etapas</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wz-name">Nome *</Label>
              <Input id="wz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Abertura de empresa — Cliente X" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {workspaces.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="wz-ws">Área de trabalho</Label>
                  <Select
                    id="wz-ws"
                    value={workspaceId}
                    onChange={(e) => {
                      setWorkspaceId(e.target.value);
                      setStageId("");
                    }}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="wz-stage">Coluna</Label>
                <Select id="wz-stage" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  <option value="">{workspace?.stages[0]?.label ?? "Primeira coluna"} (padrão)</option>
                  {workspace?.stages.slice(1).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wz-priority">Prioridade</Label>
                <Select id="wz-priority" value={priority} onChange={(e) => setPriority(e.target.value as CreateProcessInput["priority"])}>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wz-client">Cliente *</Label>
                <Select
                  id="wz-client"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setCompanyId("");
                  }}
                >
                  <option value="">Selecione...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wz-company">Empresa relacionada</Label>
                <Select id="wz-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} disabled={clientCompanies.length === 0}>
                  <option value="">Nenhuma</option>
                  {clientCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wz-service">Categoria (tipo de serviço) *</Label>
              <Select id="wz-service" value={serviceTypeId} onChange={(e) => setServiceTypeId(e.target.value)}>
                <option value="">Selecione...</option>
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wz-notes">Observações</Label>
              <Textarea id="wz-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">Checklist da tarefa</p>
              <p className="text-xs text-muted">Liste as etapas ou itens a fazer. Você pode adicionar, editar ou remover — tudo é opcional.</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Novo item do checklist"
              />
              <Button type="button" variant="outline" onClick={addChecklistItem}>
                Adicionar
              </Button>
            </div>
            {checklist.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-soft">
                Nenhum item no checklist — você pode pular esta etapa ou adicionar itens conforme necessário.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {checklist.map((item, i) => (
                  <li key={`${item}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                    <span className="flex-1 text-sm text-ink">{item}</span>
                    <button
                      type="button"
                      onClick={() => setChecklist((c) => c.filter((_, idx) => idx !== i))}
                      aria-label="Remover item"
                      className="text-muted hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Toggle
              checked={hasDelivery}
              onChange={setHasDelivery}
              label="Esta tarefa tem entrega?"
              hint="Ative para tarefas com entregável (ex: logomarca). Deixe desativado para tarefas simples de execução."
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wz-start">Data prevista de início (opcional)</Label>
                <Input id="wz-start" type="date" value={plannedStartAt} onChange={(e) => setPlannedStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wz-due">Data prevista de conclusão (opcional)</Label>
                <Input id="wz-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                <p className="text-xs text-muted-soft">Quando o trabalho interno precisa estar finalizado.</p>
              </div>
              {hasDelivery && (
                <div className="space-y-1.5">
                  <Label htmlFor="wz-delivery">Data prevista de entrega (opcional)</Label>
                  <Input id="wz-delivery" type="date" value={plannedDeliveryAt} onChange={(e) => setPlannedDeliveryAt(e.target.value)} />
                </div>
              )}
            </div>
            {!hasDelivery && <p className="text-xs text-muted-soft">Basta definir início e conclusão — sem data de entrega para o cliente.</p>}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <Toggle
              checked={hasPayment}
              onChange={setHasPayment}
              label="Esta tarefa tem pagamento?"
              hint="Ative para tarefas remuneradas. Deixe desativado para tarefas internas ou sem cobrança."
            />
            {hasPayment ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wz-value">Valor (R$)</Label>
                  <Input id="wz-value" type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wz-pay-date">Data prevista de pagamento</Label>
                  <Input id="wz-pay-date" type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-soft">Sem pagamento — esta tarefa não entra no financeiro.</p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
