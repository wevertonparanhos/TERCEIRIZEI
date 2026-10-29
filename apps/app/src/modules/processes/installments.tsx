"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getPaymentStatus } from "@/modules/processes/labels";
import type { InstallmentInput, InstallmentResult } from "@/modules/processes/actions";

type Installment = {
  id: string;
  position: number;
  value: number;
  title: string | null;
  notes: string | null;
  paymentDueDate: string | null;
  paidAt: string | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10-30..." -> "30 out 2026" (data-only em UTC, como no resto do sistema). */
function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type Draft = { id: string | null; title: string; value: string; due: string; notes: string; paid: string };

const emptyDraft: Draft = { id: null, title: "", value: "", due: "", notes: "", paid: "" };

export function Installments({
  processId,
  installments,
  canWrite,
  addInstallment,
  markInstallmentPaid,
  deleteInstallment,
  updateInstallment,
}: {
  processId: string;
  installments: Installment[];
  canWrite: boolean;
  addInstallment: (processId: string, input: InstallmentInput) => Promise<InstallmentResult>;
  markInstallmentPaid: (processId: string, installmentId: string, paid: boolean) => Promise<void>;
  deleteInstallment: (processId: string, installmentId: string) => Promise<void>;
  updateInstallment?: (processId: string, installmentId: string, input: InstallmentInput) => Promise<InstallmentResult>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setFormError(null);
    setDraft({ ...emptyDraft });
  }

  function openEdit(item: Installment) {
    setFormError(null);
    setDraft({
      id: item.id,
      title: item.title ?? "",
      value: item.value.toFixed(2).replace(".", ","),
      due: item.paymentDueDate ? item.paymentDueDate.slice(0, 10) : "",
      notes: item.notes ?? "",
      paid: item.paidAt ? item.paidAt.slice(0, 10) : "",
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setFormError(null);
    try {
      const input: InstallmentInput = { title: draft.title, value: draft.value, paymentDueDate: draft.due, notes: draft.notes, paidAt: draft.paid || undefined };
      const result = draft.id ? await updateInstallment!(processId, draft.id, input) : await addInstallment(processId, input);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar o pagamento.");
    } finally {
      setSaving(false);
    }
  }

  async function run(id: string, fn: () => Promise<void>, fallback: string) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {installments.length === 0 && <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-soft">Nenhum pagamento registrado.</p>}

      {installments.length > 0 && (
        <ul className="space-y-2">
          {installments.map((item) => {
            const status = getPaymentStatus(item.value, item.paymentDueDate ? new Date(item.paymentDueDate) : null, item.paidAt ? new Date(item.paidAt) : null);
            const paid = status === "PAGO";
            const overdue = status === "ATRASADO";
            const label = item.title?.trim() || (installments.length > 1 ? `Parcela ${item.position}` : "Pagamento único");
            return (
              <li
                key={item.id}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                  overdue ? "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10" : paid ? "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5" : "border-border bg-surface hover:border-border-strong"
                }`}
              >
                {canWrite ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => run(item.id, () => markInstallmentPaid(processId, item.id, !paid), "Não foi possível atualizar o pagamento.")}
                    title={paid ? "Desmarcar como pago" : "Marcar como pago"}
                    aria-label={paid ? "Desmarcar como pago" : "Marcar como pago"}
                    aria-pressed={paid}
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50 ${
                      paid ? "border-emerald-500 bg-emerald-500 text-white" : "border-border-strong bg-transparent text-transparent hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                ) : (
                  <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 ${paid ? "border-emerald-500 bg-emerald-500 text-white" : "border-border-strong text-transparent"}`}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{label}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className={`font-mono text-xs font-semibold ${paid ? "text-emerald-600" : "text-ink"}`}>{currencyFormatter.format(item.value)}</span>
                    {item.paymentDueDate && <span className="text-[11px] text-muted">{dateLabel(item.paymentDueDate)}</span>}
                    {paid && item.paidAt && <span className="text-[11px] font-medium text-emerald-600">pago em {dateLabel(item.paidAt)}</span>}
                    {overdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-500/15 dark:text-red-400">Atrasado</span>}
                    {!paid && !overdue && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Pendente</span>}
                  </div>
                  {item.notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{item.notes}</p>}
                </div>

                {canWrite &&
                  (confirmDelete === item.id ? (
                    <div className="flex flex-none items-center gap-1.5 text-xs">
                      <span className="text-muted">Excluir?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => {
                          setConfirmDelete(null);
                          run(item.id, () => deleteInstallment(processId, item.id), "Não foi possível remover o pagamento.");
                        }}
                      >
                        Sim
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Não
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-none items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      {updateInstallment && (
                        <button type="button" onClick={() => openEdit(item)} aria-label="Editar pagamento" title="Editar" className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-ink">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete(item.id);
                          setError(null);
                        }}
                        aria-label="Remover pagamento"
                        title="Remover"
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      {canWrite && (
        <Button type="button" variant="outline" className="w-full" onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar pagamento
        </Button>
      )}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Editando pagamento" : "Novo pagamento"}
        description={draft?.id ? undefined : "Registre uma parcela ou recebimento"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Salvando..." : draft?.id ? "Salvar" : "Adicionar pagamento"}
            </Button>
          </>
        }
      >
        {draft && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="pay-title">Título</Label>
              <Input id="pay-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: 1ª parcela, Sinal, Entrada..." maxLength={80} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay-value">Valor (R$)</Label>
                <Input id="pay-value" inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-due">Data</Label>
                <Input id="pay-due" type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
              </div>
            </div>
            {draft.id && draft.paid && (
              <div className="space-y-1.5">
                <Label htmlFor="pay-paid">Pago em</Label>
                <Input id="pay-paid" type="date" value={draft.paid} onChange={(e) => setDraft({ ...draft, paid: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pay-notes">Descrição (opcional)</Label>
              <Textarea id="pay-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Observações sobre este pagamento..." maxLength={1000} />
            </div>
            {formError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                {formError}
              </p>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
