"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellPlus, Check, ExternalLink, Loader2, MessageSquare, Send, X } from "lucide-react";
import { loadTaskPeek, type TaskPeek } from "@/modules/processes/peek";
import { addChecklistItem, addProcessComment, markInstallmentPaid, toggleChecklistItem, updateProcessStage } from "@/modules/processes/actions";
import { completeReminder, createReminder, snoozeReminder } from "@/modules/reminders/actions";
import { SNOOZE_LABELS, SNOOZE_OPTIONS } from "@/modules/reminders/logic";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function tomorrowIso(): string {
  const br = new Date(Date.now() - 3 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  return br.toISOString().slice(0, 10);
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold text-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Painel que abre ao lado do quadro quando se clica num cartão: o essencial da tarefa sem sair do Kanban. */
export function TaskDrawer({
  taskId,
  preview,
  onClose,
}: {
  taskId: string;
  /** o que o cartão já sabe, mostrado na hora enquanto o resto carrega */
  preview?: { number: number; title: string; clientName: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const [task, setTask] = useState<TaskPeek | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [comment, setComment] = useState("");
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState(tomorrowIso);
  const [reminderNote, setReminderNote] = useState("");
  const seq = useRef(0);
  const panelRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const id = ++seq.current;
    const result = await loadTaskPeek(taskId);
    if (id !== seq.current) return;
    if (result.ok) {
      setTask(result.task);
      setLoadError(null);
    } else {
      setLoadError(result.error);
    }
  }, [taskId]);

  // Trocar de cartão: limpa o painel e carrega a outra tarefa.
  useEffect(() => {
    setTask(null);
    setLoadError(null);
    setError(null);
    setReminderOpen(false);
    setComment("");
    setNewItem("");
    void load();
    panelRef.current?.scrollTo({ top: 0 });
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && (target as HTMLInputElement).value) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Roda uma ação, recarrega o painel e atualiza o quadro por trás. */
  async function run(key: string, action: () => Promise<unknown>, after?: () => void) {
    setBusy(key);
    setError(null);
    try {
      const result = await action();
      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        setError(String((result as { error?: string }).error ?? "Não foi possível concluir."));
        return;
      }
      after?.();
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Não foi possível concluir. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  const doneCount = task?.checklist.filter((c) => c.done).length ?? 0;
  const stage = task?.stages.find((s) => s.id === task.stageId);

  return (
    <aside
      ref={panelRef}
      aria-label="Tarefa aberta"
      className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col overflow-y-auto border-l border-border bg-surface shadow-[-16px_0_40px_rgba(27,37,88,0.12)] sm:left-auto sm:w-[440px]"
    >
      <div className="sticky top-0 z-10 space-y-2.5 border-b border-border bg-surface px-5 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs text-muted">
            {task ? `#${task.number} · ${task.workspaceName}` : preview ? `#${preview.number} · carregando…` : "Carregando…"}
          </span>
          <Link
            href={`/processos/${taskId}`}
            className="inline-flex flex-none items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-accent hover:bg-accent-soft"
          >
            Abrir página inteira <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            aria-label="Fechar painel"
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-surface-alt text-muted transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!task && preview && (
          <>
            <h2 className="font-display text-xl font-extrabold leading-tight text-ink">{preview.title}</h2>
            <p className="text-xs text-muted">{preview.clientName}</p>
          </>
        )}
        {task && (
          <>
            <h2 className="font-display text-xl font-extrabold leading-tight text-ink">{task.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="relative inline-flex items-center">
                <span className="pointer-events-none absolute left-2.5 h-2 w-2 rounded-full" style={{ backgroundColor: stage?.color }} />
                <select
                  value={task.stageId}
                  disabled={!task.canWrite || busy !== null}
                  aria-label="Etapa"
                  onChange={(e) => {
                    const to = e.target.value;
                    void run("etapa", () => updateProcessStage(task.id, to));
                  }}
                  className="h-8 rounded-lg border border-border bg-surface pl-6 pr-7 text-xs font-semibold text-ink hover:border-border-strong disabled:opacity-80"
                >
                  {task.stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </span>
              <Link href={`/clientes/${task.clientId}`} className="truncate text-xs text-muted hover:text-ink hover:underline">
                {task.clientName}
                {task.companyName && ` · ${task.companyName}`}
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">{task.tags}</span>
              {task.dueOn && (
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    task.isOverdue ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" : "bg-surface-alt text-muted"
                  }`}
                >
                  {task.isOverdue ? "Atrasada · " : "Entrega "}
                  {dateBr(task.dueOn)}
                </span>
              )}
              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-muted">Prioridade {task.priority.toLowerCase()}</span>
              {task.assigneeNames.length > 0 && <span className="rounded-full bg-surface-alt px-2 py-0.5 text-muted">{task.assigneeNames.join(", ")}</span>}
              {task.presenceNames.length > 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  {task.presenceNames.join(", ")} aqui agora
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 space-y-6 px-5 py-5">
        {!task && !loadError && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Abrindo a tarefa…
          </div>
        )}
        {loadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{loadError}</p>}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {task && (
          <>
            {task.openImpediments.length > 0 && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  <b>Impedimento:</b> {task.openImpediments.join("; ")}
                </span>
              </div>
            )}

            <Section
              title="Lembretes"
              aside={
                task.canWrite && !reminderOpen ? (
                  <button type="button" onClick={() => setReminderOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    <BellPlus className="h-3.5 w-3.5" /> Novo lembrete
                  </button>
                ) : undefined
              }
            >
              {task.reminders.length === 0 && !reminderOpen && <p className="text-[13px] text-muted-soft">Nenhum lembrete nesta tarefa.</p>}
              {task.reminders.map((r) => (
                <div
                  key={r.id}
                  className={`space-y-2 rounded-xl border px-3 py-2.5 ${
                    r.timing === "atrasado"
                      ? "border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10"
                      : r.timing === "hoje"
                        ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                        : "border-border"
                  }`}
                >
                  <p className="text-xs font-semibold text-ink">
                    {r.timing === "atrasado" ? "Atrasado" : r.timing === "hoje" ? "Hoje" : "Agendado"} · {dateBr(r.remindOn)}
                  </p>
                  {r.note && <p className="text-[13px] text-ink">{r.note}</p>}
                  {task.canWrite && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => run(`feito:${r.id}`, () => completeReminder(r.id))}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Feito
                      </button>
                      <select
                        value=""
                        disabled={busy !== null}
                        aria-label="Adiar lembrete"
                        onChange={(e) => {
                          const option = e.target.value;
                          if (option) void run(`adiar:${r.id}`, () => snoozeReminder(r.id, option));
                        }}
                        className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-muted"
                      >
                        <option value="">Adiar…</option>
                        {SNOOZE_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {SNOOZE_LABELS[o]}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              {reminderOpen && (
                <form
                  className="space-y-2 rounded-xl border border-border p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run("lembrete", () => createReminder(task.id, reminderDate, reminderNote), () => {
                      setReminderOpen(false);
                      setReminderNote("");
                      setReminderDate(tomorrowIso());
                    });
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      aria-label="Data do lembrete"
                      className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink"
                    />
                    <input
                      value={reminderNote}
                      onChange={(e) => setReminderNote(e.target.value)}
                      placeholder="O que verificar?"
                      aria-label="Nota do lembrete"
                      maxLength={300}
                      className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-xs text-ink placeholder:text-muted-soft"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setReminderOpen(false)} className="h-7 rounded-md px-2.5 text-xs text-muted hover:text-ink">
                      Cancelar
                    </button>
                    <button type="submit" disabled={busy !== null} className="h-7 rounded-md bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50">
                      Salvar lembrete
                    </button>
                  </div>
                </form>
              )}
            </Section>

            <Section
              title={`Checklist${task.checklist.length > 0 ? ` · ${doneCount} de ${task.checklist.length}` : ""}`}
            >
              {task.checklist.length > 0 && (
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${(doneCount / task.checklist.length) * 100}%` }} />
                </div>
              )}
              <ul className="space-y-1">
                {task.checklist.map((item) => (
                  <li key={item.id}>
                    <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 text-[13px] hover:bg-surface-alt/60 ${item.done ? "text-muted-soft line-through" : "text-ink"}`}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        disabled={!task.canWrite || busy !== null}
                        onChange={(e) => {
                          const done = e.target.checked;
                          setTask((t) => (t ? { ...t, checklist: t.checklist.map((c) => (c.id === item.id ? { ...c, done } : c)) } : t));
                          void run(`check:${item.id}`, () => toggleChecklistItem(task.id, item.id, done));
                        }}
                        className="mt-0.5 h-4 w-4 flex-none accent-[#14528D]"
                      />
                      {item.label}
                    </label>
                  </li>
                ))}
              </ul>
              {task.checklist.length === 0 && <p className="text-[13px] text-muted-soft">Sem itens no checklist.</p>}
              {task.canWrite && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const label = newItem.trim();
                    if (!label) return;
                    void run("novo-item", () => addChecklistItem(task.id, label), () => setNewItem(""));
                  }}
                >
                  <input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Adicionar item e apertar Enter"
                    aria-label="Novo item do checklist"
                    className="h-8 w-full rounded-lg border border-dashed border-border bg-transparent px-2.5 text-[13px] text-ink placeholder:text-muted-soft focus:border-solid focus:border-accent focus:outline-none"
                  />
                </form>
              )}
            </Section>

            <Section
              title="Pagamentos"
              aside={
                task.paymentTotal > 0 ? (
                  <span className="text-xs tabular-nums text-muted">
                    {money.format(task.paidTotal)} de {money.format(task.paymentTotal)}
                  </span>
                ) : undefined
              }
            >
              {task.payments.length === 0 ? (
                <p className="text-[13px] text-muted-soft">Sem pagamento cadastrado.</p>
              ) : (
                <ul className="space-y-1.5">
                  {task.payments.map((p) => (
                    <li
                      key={p.id}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] ${p.paid ? "bg-emerald-50 dark:bg-emerald-500/10" : "border border-border"}`}
                    >
                      <button
                        type="button"
                        disabled={!task.canWrite || busy !== null}
                        aria-label={p.paid ? `Marcar ${p.label} como pendente` : `Marcar ${p.label} como pago`}
                        title={p.paid ? "Pago — clique para voltar a pendente" : "Marcar como pago"}
                        onClick={() => run(`pg:${p.id}`, () => markInstallmentPaid(task.id, p.id, !p.paid))}
                        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition-colors disabled:cursor-default ${
                          p.paid ? "border-emerald-600 bg-emerald-600 text-white" : "border-border-strong hover:border-emerald-600"
                        }`}
                      >
                        {p.paid && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </button>
                      <span className="min-w-0 flex-1 truncate text-ink">
                        {p.label}
                        <span className="text-muted"> · {p.paid ? "pago" : p.dueOn ? `vence ${dayMonth(p.dueOn)}` : "sem data"}</span>
                      </span>
                      <b className={`flex-none tabular-nums ${p.paid ? "text-emerald-700 dark:text-emerald-400" : "text-ink"}`}>{money.format(p.value)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {task.notes.trim() && (
              <Section title="Observações">
                <p className="line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-muted">{task.notes}</p>
              </Section>
            )}

            <Section
              title="Conversa"
              aside={
                task.commentCount > task.comments.length ? (
                  <Link href={`/processos/${task.id}?tab=atividade`} className="text-xs font-semibold text-accent hover:underline">
                    Ver todos ({task.commentCount})
                  </Link>
                ) : undefined
              }
            >
              {task.comments.length === 0 && <p className="text-[13px] text-muted-soft">Nenhum comentário ainda.</p>}
              <ul className="space-y-3">
                {task.comments.map((c) => (
                  <li key={c.id} className="text-[13px]">
                    <p className="text-xs text-muted">
                      <b className="text-ink">{c.authorName}</b>
                      {c.fromClient && <span className="ml-1 rounded bg-brand-orange/15 px-1 text-[10px] font-semibold text-brand-orange">cliente</span>} · {timeAgo(c.createdAt)}
                    </p>
                    <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-ink">{c.body}</p>
                  </li>
                ))}
              </ul>
              {task.canComment && (
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const body = comment.trim();
                    if (!body) return;
                    void run("comentario", () => addProcessComment(task.id, body), () => setComment(""));
                  }}
                >
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
                    }}
                    rows={2}
                    placeholder="Escrever um comentário interno…"
                    aria-label="Novo comentário"
                    className="min-h-[40px] flex-1 resize-y rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy !== null || !comment.trim()}
                    aria-label="Enviar comentário"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-brand-blue text-white disabled:opacity-40"
                  >
                    {busy === "comentario" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </form>
              )}
              <p className="flex items-center gap-1 text-[11px] text-muted-soft">
                <MessageSquare className="h-3 w-3" /> Para mencionar alguém ou mostrar ao cliente, use a página inteira.
              </p>
            </Section>
          </>
        )}
      </div>
    </aside>
  );
}
