"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";

type Installment = {
  id: string;
  position: number;
  value: number;
  paymentDueDate: string | null;
  paidAt: string | null;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Installments({
  processId,
  installments,
  canWrite,
  addInstallment,
  markInstallmentPaid,
  deleteInstallment,
}: {
  processId: string;
  installments: Installment[];
  canWrite: boolean;
  addInstallment: (processId: string, value: string, paymentDueDate: string) => Promise<void>;
  markInstallmentPaid: (processId: string, installmentId: string, paid: boolean) => Promise<void>;
  deleteInstallment: (processId: string, installmentId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalValue = installments.reduce((sum, i) => sum + i.value, 0);

  async function action(formData: FormData) {
    const value = (formData.get("value") as string) ?? "";
    const paymentDueDate = (formData.get("paymentDueDate") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await addInstallment(processId, value, paymentDueDate);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar a parcela.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePaid(installmentId: string, paid: boolean) {
    setBusyId(installmentId);
    try {
      await markInstallmentPaid(processId, installmentId, paid);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o pagamento.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(installmentId: string) {
    setBusyId(installmentId);
    try {
      await deleteInstallment(processId, installmentId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover a parcela.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {installments.length === 0 && <p className="text-sm text-muted-soft">Nenhuma parcela registrada.</p>}

      {installments.length > 0 && (
        <>
          <p className="mb-3 text-sm text-muted">
            Total: <span className="font-mono font-semibold text-ink">{currencyFormatter.format(totalValue)}</span>
            {" · "}
            {installments.length} parcela(s)
          </p>
          <ul className="space-y-2">
            {installments.map((item) => {
              const status = getPaymentStatus(item.value, item.paymentDueDate ? new Date(item.paymentDueDate) : null, item.paidAt ? new Date(item.paidAt) : null);
              const paid = status === "PAGO";
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-muted-soft">Parcela {item.position}</span>
                    <span className="font-mono text-sm font-semibold text-ink">
                      {currencyFormatter.format(item.value)}
                    </span>
                    {item.paymentDueDate && (
                      <span className="text-xs text-muted-soft">
                        vence {new Date(item.paymentDueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </span>
                    )}
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
                  </div>
                  {canWrite && (
                    <div className="flex flex-none items-center gap-3">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleTogglePaid(item.id, !paid)}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        {busyId === item.id ? "Salvando..." : paid ? "Marcar como pendente" : "Marcar como pago"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {canWrite && (
        <form action={action} className="mt-4 flex items-end gap-2 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="value">Valor (R$)</Label>
            <Input id="value" name="value" type="number" step="0.01" min="0" required className="w-32" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentDueDate">Vencimento</Label>
            <Input id="paymentDueDate" name="paymentDueDate" type="date" />
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Adicionando..." : "Adicionar parcela"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
