"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT, getPaymentStatus } from "@/modules/processes/labels";
import type { ProcessInput } from "@/lib/validations/process";

type StaffUser = { id: string; name: string };

export function ProcessForm({
  processId,
  defaultValues,
  staff,
  readOnly,
  updateProcess,
  setProcessPaid,
}: {
  processId: string;
  defaultValues: {
    assignedUserId: string;
    priority: string;
    value: string;
    paymentDueDate: string;
    dueAt: string;
    notes: string;
    paidAt: string | null;
  };
  staff: StaffUser[];
  readOnly: boolean;
  updateProcess: (processId: string, input: ProcessInput) => Promise<void>;
  setProcessPaid: (processId: string, paid: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasPayment, setHasPayment] = useState(Boolean(defaultValues.value));
  const [markingPaid, setMarkingPaid] = useState(false);

  const paymentStatus = getPaymentStatus(
    defaultValues.value ? Number(defaultValues.value) : null,
    defaultValues.paymentDueDate ? new Date(defaultValues.paymentDueDate) : null,
    defaultValues.paidAt ? new Date(defaultValues.paidAt) : null
  );

  async function action(formData: FormData) {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await updateProcess(processId, {
        assignedUserId: (formData.get("assignedUserId") as string) ?? "",
        priority: formData.get("priority") as ProcessInput["priority"],
        value: hasPayment ? ((formData.get("value") as string) ?? "") : "",
        paymentDueDate: hasPayment ? ((formData.get("paymentDueDate") as string) ?? "") : "",
        dueAt: (formData.get("dueAt") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePaid() {
    setMarkingPaid(true);
    try {
      await setProcessPaid(processId, paymentStatus !== "PAGO");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o pagamento.");
    } finally {
      setMarkingPaid(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="assignedUserId">Responsável</Label>
          <Select id="assignedUserId" name="assignedUserId" defaultValue={defaultValues.assignedUserId}>
            <option value="">Sem responsável</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" name="priority" defaultValue={defaultValues.priority}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Prazo previsto de conclusão</Label>
          <Input id="dueAt" name="dueAt" type="date" defaultValue={defaultValues.dueAt} />
        </div>
      </fieldset>

      <fieldset disabled={readOnly} className="rounded-lg border border-border bg-surface-alt p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={hasPayment}
            onChange={(e) => setHasPayment(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong"
          />
          Esta demanda tem pagamento
        </label>

        {hasPayment && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" defaultValue={defaultValues.value} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDueDate">Data prevista de pagamento</Label>
              <Input id="paymentDueDate" name="paymentDueDate" type="date" defaultValue={defaultValues.paymentDueDate} />
            </div>
          </div>
        )}

        {hasPayment && (
          <div className="mt-3 flex items-center gap-3">
            <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[paymentStatus]}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>
            {!readOnly && paymentStatus !== "SEM_PAGAMENTO" && (
              <Button type="button" variant="outline" size="sm" disabled={markingPaid} onClick={togglePaid}>
                {markingPaid ? "Salvando..." : paymentStatus === "PAGO" ? "Marcar como pendente" : "Marcar como pago"}
              </Button>
            )}
          </div>
        )}
      </fieldset>

      <fieldset disabled={readOnly} className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues.notes} />
      </fieldset>

      {error && <p className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
      {saved && <p className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">Alterações salvas.</p>}

      {!readOnly && (
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      )}
    </form>
  );
}
