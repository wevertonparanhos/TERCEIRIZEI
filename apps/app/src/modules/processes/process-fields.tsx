"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, CalendarClock, CreditCard, Globe, Link2, Signal, Tag, User, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import type { ProcessInput } from "@/lib/validations/process";

type Fields = Omit<ProcessInput, "dueAt" | "plannedStartAt" | "actualStartAt" | "actualCompletionAt" | "plannedDeliveryAt" | "actualDeliveryAt" | "notes"> & {
  dueAt: string;
  plannedStartAt: string;
  actualStartAt: string;
  actualCompletionAt: string;
  plannedDeliveryAt: string;
  actualDeliveryAt: string;
  notes: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type Ctx = {
  fields: Fields;
  stageId: string;
  readOnly: boolean;
  saveState: SaveState;
  error: string | null;
  save: (patch: Partial<Fields>) => void;
  changeStage: (stageId: string) => void;
};

const FieldsContext = createContext<Ctx | null>(null);

function useFields(): Ctx {
  const ctx = useContext(FieldsContext);
  if (!ctx) throw new Error("ProcessFieldsProvider ausente");
  return ctx;
}

/** Estado único dos campos editáveis da tarefa: cada alteração (prioridade,
 * responsáveis, datas, portal) é salva na hora, como no FreelaPRO; só as
 * observações têm botão "Salvar". A tela é montada em vários cartões (abas,
 * coluna lateral, cabeçalho) que compartilham este estado. */
export function ProcessFieldsProvider({
  processId,
  initial,
  initialStageId,
  readOnly,
  updateProcess,
  updateStage,
  children,
}: {
  processId: string;
  initial: Fields;
  initialStageId: string;
  readOnly: boolean;
  updateProcess: (processId: string, input: ProcessInput) => Promise<void>;
  updateStage: (processId: string, stageId: string) => Promise<void>;
  children: ReactNode;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(initial);
  const [stageId, setStageId] = useState(initialStageId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(fields);
  latest.current = fields;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaveState("idle"), 2500);
  }

  function save(patch: Partial<Fields>) {
    if (readOnly) return;
    const previous = latest.current;
    const next = { ...previous, ...patch };
    latest.current = next;
    setFields(next);
    setSaveState("saving");
    setError(null);
    updateProcess(processId, next)
      .then(() => {
        setSaveState("saved");
        flash();
        router.refresh();
      })
      .catch((err) => {
        latest.current = previous;
        setFields(previous);
        setSaveState("error");
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      });
  }

  function changeStage(next: string) {
    if (readOnly || next === stageId) return;
    const previous = stageId;
    setStageId(next);
    setSaveState("saving");
    setError(null);
    updateStage(processId, next)
      .then(() => {
        setSaveState("saved");
        flash();
        router.refresh();
      })
      .catch((err) => {
        setStageId(previous);
        setSaveState("error");
        setError(err instanceof Error ? err.message : "Não foi possível mover a tarefa.");
      });
  }

  return (
    <FieldsContext.Provider value={{ fields, stageId, readOnly, saveState, error, save, changeStage }}>
      {children}
    </FieldsContext.Provider>
  );
}

export function SaveIndicator() {
  const { saveState, error } = useFields();
  if (saveState === "idle") return null;
  const text = saveState === "saving" ? "Salvando..." : saveState === "saved" ? "Salvo" : (error ?? "Erro ao salvar");
  return (
    <span
      role={saveState === "error" ? "alert" : "status"}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        saveState === "error" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-surface-alt text-muted"
      )}
    >
      {text}
    </span>
  );
}

export function PortalToggleButton() {
  const { fields, save, readOnly } = useFields();
  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={() => save({ visibleInPortal: !fields.visibleInPortal })}
      title={fields.visibleInPortal ? "O cliente vê título, status e comentários no portal" : "Oculta do portal do cliente"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
        fields.visibleInPortal ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface text-muted hover:text-ink"
      )}
    >
      <Globe className="h-3.5 w-3.5" />
      {fields.visibleInPortal ? "Visível no portal" : "Oculta no portal"}
    </button>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof User; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[2.25rem] items-center gap-3 text-sm">
      <span className="flex w-40 flex-none items-center gap-2 text-muted">
        <Icon className="h-4 w-4 text-muted-soft" />
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{title}</p>
      {children}
    </div>
  );
}

const selectClass =
  "w-full max-w-xs rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-ink hover:border-border focus:border-accent focus:outline-none disabled:cursor-not-allowed";

export function PropertiesCard({
  stages,
  staff,
  client,
  categoryName,
  valueText,
  paymentLabel,
  nextPaymentText,
}: {
  stages: { id: string; label: string; color: string }[];
  staff: { id: string; name: string }[];
  client: { id: string; name: string };
  categoryName: string;
  valueText: string;
  paymentLabel: string;
  nextPaymentText: string;
}) {
  const { fields, stageId, save, changeStage, readOnly } = useFields();
  const stageColor = stages.find((s) => s.id === stageId)?.color;

  return (
    <div className="space-y-5 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Propriedades</h2>

      <Group title="Estado">
        <Row icon={Signal} label="Status">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: stageColor }} />
            <select value={stageId} disabled={readOnly} onChange={(e) => changeStage(e.target.value)} className={selectClass}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </span>
        </Row>
        <Row icon={Signal} label="Prioridade">
          <select
            value={fields.priority}
            disabled={readOnly}
            onChange={(e) => save({ priority: e.target.value as Fields["priority"] })}
            className={selectClass}
          >
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Row>
      </Group>

      <Group title="Vínculos">
        <Row icon={User} label="Cliente">
          <Link
            href={`/clientes/${client.id}`}
            className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent hover:underline"
          >
            {client.name}
          </Link>
        </Row>
        <Row icon={Tag} label="Categorias">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            <Briefcase className="h-3 w-3" />
            {categoryName}
          </span>
        </Row>
      </Group>

      <Group title="Pessoas">
        <Row icon={Users} label="Responsáveis">
          {staff.length === 0 ? (
            <span className="text-muted-soft">Nenhum membro disponível</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {staff.map((member) => {
                const on = fields.assigneeIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      save({ assigneeIds: on ? fields.assigneeIds.filter((id) => id !== member.id) : [...fields.assigneeIds, member.id] })
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed",
                      on ? "border-accent bg-accent-soft font-semibold text-accent" : "border-border bg-surface text-muted hover:text-ink"
                    )}
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          )}
        </Row>
      </Group>

      <Group title="Financeiro">
        <Row icon={Wallet} label="Valor">
          <span className="font-semibold text-ink">{valueText}</span>
        </Row>
        <Row icon={CreditCard} label="Pagamento">
          <span className="font-semibold text-ink">{paymentLabel}</span>
        </Row>
        <Row icon={CalendarClock} label="Próximo pgto.">
          <span className="text-muted">{nextPaymentText}</span>
        </Row>
      </Group>
    </div>
  );
}

const MAX_NOTES = 10000;

export function NotesCard() {
  const { fields, save, readOnly } = useFields();
  const [text, setText] = useState(fields.notes);
  const dirty = text !== fields.notes;
  const ref = useRef<HTMLTextAreaElement>(null);

  // A caixa acompanha o tamanho do texto: sem rolagem interna, cresce e encolhe.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Observações</h2>
      <Textarea
        ref={ref}
        value={text}
        disabled={readOnly}
        maxLength={MAX_NOTES}
        rows={3}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anotações e observações sobre a tarefa"
        className="min-h-[5rem] resize-none overflow-hidden"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-soft">
          {text.length}/{MAX_NOTES.toLocaleString("pt-BR")}
        </span>
        {!readOnly && (
          <Button type="button" size="sm" disabled={!dirty} onClick={() => save({ notes: text })}>
            Salvar
          </Button>
        )}
      </div>
    </div>
  );
}

function DateCell({
  value,
  onChange,
  disabled,
  late = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  late?: boolean;
}) {
  return (
    <input
      type="date"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-1 py-1 text-xs hover:border-border focus:border-accent focus:outline-none disabled:cursor-not-allowed",
        late ? "font-semibold text-red-600" : "text-ink"
      )}
    />
  );
}

/** Cronograma Previsto × Real. O "real" fica vermelho quando passa do previsto. */
export function ScheduleCard() {
  const { fields, save, readOnly } = useFields();
  const late = (planned: string, actual: string) => !!planned && !!actual && actual > planned;
  const rows: { label: string; plannedKey: keyof Fields; actualKey: keyof Fields }[] = [
    { label: "Início", plannedKey: "plannedStartAt", actualKey: "actualStartAt" },
    { label: "Conclusão", plannedKey: "dueAt", actualKey: "actualCompletionAt" },
    { label: "Entrega", plannedKey: "plannedDeliveryAt", actualKey: "actualDeliveryAt" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <CalendarClock className="h-4 w-4 text-muted-soft" />
        Cronograma
      </p>
      <div className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-x-2 gap-y-1 text-xs">
        <span />
        <span className="px-1 text-muted-soft">Previsto</span>
        <span className="px-1 text-muted-soft">Real</span>
        {rows.map((r) => (
          <FragmentRow
            key={r.label}
            label={r.label}
            planned={fields[r.plannedKey] as string}
            actual={fields[r.actualKey] as string}
            disabled={readOnly}
            late={late(fields[r.plannedKey] as string, fields[r.actualKey] as string)}
            onPlanned={(v) => save({ [r.plannedKey]: v } as Partial<Fields>)}
            onActual={(v) => save({ [r.actualKey]: v } as Partial<Fields>)}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  label,
  planned,
  actual,
  disabled,
  late,
  onPlanned,
  onActual,
}: {
  label: string;
  planned: string;
  actual: string;
  disabled: boolean;
  late: boolean;
  onPlanned: (v: string) => void;
  onActual: (v: string) => void;
}) {
  return (
    <>
      <span className="text-muted">{label}</span>
      <DateCell value={planned} onChange={onPlanned} disabled={disabled} />
      <DateCell value={actual} onChange={onActual} disabled={disabled} late={late} />
    </>
  );
}

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard
          ?.writeText(window.location.href)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {});
      }}
    >
      <Link2 className="mr-1.5 h-4 w-4" />
      {copied ? "Link copiado" : "Copiar link"}
    </Button>
  );
}
