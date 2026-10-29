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
/** Tipo de solicitação: só uma etiqueta que identifica o serviço. */
type ServiceType = { id: string; name: string };

/** Modelo de tarefa: tarefa genérica pré-pronta (valor, prazo, prioridade, anotações e checklist). */
type TaskTemplate = {
  id: string;
  name: string;
  defaultPrice: string | null;
  defaultDeadlineDays: number | null;
  defaultPriority: string | null;
  defaultNotes: string;
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
  templates,
  serviceTypes,
  onSubmit,
  createCategory,
  autoOpen = false,
}: {
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  clients: Client[];
  companies: Company[];
  templates: TaskTemplate[];
  serviceTypes: ServiceType[];
  onSubmit: (data: CreateProcessInput) => Promise<{ id: string } | void>;
  createCategory?: (name: string) => Promise<{ id: string; name: string }>;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const initialWorkspace = workspaces.find((w) => w.id === defaultWorkspaceId) ?? workspaces[0];

  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extraCategories, setExtraCategories] = useState<ServiceType[]>([]);
  const allServiceTypes = useMemo(() => [...serviceTypes, ...extraCategories], [serviceTypes, extraCategories]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState(initialWorkspace?.id ?? "");
  const [stageId, setStageId] = useState("");
  const [name, setName] = useState("");
  const [priority, setPriority] = useState<CreateProcessInput["priority"]>("MEDIA");
  const [clientId, setClientId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>([]);
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
    setServiceTypeIds([]);
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
      setChecklist([]);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setChecklist(tpl.checklist);
    if (tpl.defaultPriority) setPriority(tpl.defaultPriority as CreateProcessInput["priority"]);
    if (tpl.defaultPrice) {
      setHasPayment(true);
      setValue(tpl.defaultPrice);
    }
    if (tpl.defaultDeadlineDays) setDueAt(inputDateFromNow(tpl.defaultDeadlineDays));
    if (tpl.defaultNotes) setNotes(tpl.defaultNotes);
  }

  function toggleServiceType(id: string) {
    setServiceTypeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function stepError(): string | null {
    if (step === 2 && name.trim().length < 3) return "Informe o nome da tarefa.";
    if (step === 3 && !clientId) return "Selecione um cliente.";
    if (step === 3 && serviceTypeIds.length === 0) return "Selecione ao menos um tipo de solicitação.";
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
        serviceTypeIds,
        templateId: templateId ?? "",
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
        description="Crie uma nova tarefa: escolha um modelo (ou comece em branco), defina informações básicas, tipos de solicitação, cronograma e pagamento."
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">Escolha um modelo de tarefa para pré-preencher valor, prazo e checklist, ou comece em branco.</p>
              <a href="/processos/modelos" className="text-xs font-medium text-accent hover:underline">
                Editar modelos
              </a>
              {templates.length === 0 && <span className="w-full text-xs text-muted-soft">Nenhum modelo cadastrado — comece em branco ou crie um em Editar modelos.</span>}
            </div>
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
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => pickTemplate(tpl.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    templateId === tpl.id ? "border-accent bg-accent-soft/60" : "border-border hover:bg-surface-alt"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{tpl.name}</span>
                    {templateId === tpl.id && <Check className="h-4 w-4 text-accent" />}
                  </span>
                  <span className="mt-1 flex gap-2 text-xs text-muted">
                    {tpl.defaultPrice && <span>R$ {Number(tpl.defaultPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                    {tpl.checklist.length > 0 && <span>{tpl.checklist.length} etapas</span>}
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
              <Label>Tipos de solicitação *</Label>
              <p className="text-xs text-muted">Etiquetas que identificam o serviço. Marque um ou mais.</p>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-border bg-surface-alt/40 p-2">
                {allServiceTypes.map((s) => {
                  const selected = serviceTypeIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleServiceType(s.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected ? "border-accent bg-accent text-white" : "border-border bg-surface text-ink hover:bg-surface-alt"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {s.name}
                    </button>
                  );
                })}
                {allServiceTypes.length === 0 && <span className="px-1 py-0.5 text-xs text-muted-soft">Nenhum tipo cadastrado ainda — crie o primeiro abaixo.</span>}
              </div>
              {createCategory && (
                <button
                  type="button"
                  className="text-xs font-medium text-accent hover:underline"
                  onClick={async () => {
                    const typed = window.prompt("Nome do novo tipo de solicitação:");
                    if (!typed || !typed.trim()) return;
                    try {
                      const created = await createCategory(typed);
                      setExtraCategories((prev) =>
                        allServiceTypes.some((s) => s.id === created.id)
                          ? prev
                          : [...prev, { id: created.id, name: created.name }]
                      );
                      setServiceTypeIds((ids) => (ids.includes(created.id) ? ids : [...ids, created.id]));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Não foi possível criar o tipo.");
                    }
                  }}
                >
                  + Novo tipo de solicitação
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wz-notes">Anotações</Label>
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
            {!hasDelivery && <p className="text-xs text-muted-soft">O início é a data em que a tarefa é criada. Basta definir a conclusão — sem data de entrega para o cliente.</p>}
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
