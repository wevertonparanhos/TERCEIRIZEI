"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarkPaidForm({
  invoiceId,
  markPaid,
}: {
  invoiceId: string;
  markPaid: (invoiceId: string, data: { paidAt: string; paymentMethod: string; notes?: string }) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const paidAt = (formData.get("paidAt") as string) ?? "";
    const paymentMethod = (formData.get("paymentMethod") as string) ?? "";
    const notes = (formData.get("notes") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await markPaid(invoiceId, { paidAt, paymentMethod, notes: notes || undefined });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o pagamento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted">Data do pagamento</label>
        <Input name="paidAt" type="date" required className="w-40" />
      </div>
      <div>
        <label className="text-xs text-muted">Forma de pagamento</label>
        <Input name="paymentMethod" placeholder="Pix, boleto, transferência..." required className="w-56" />
      </div>
      <div className="flex-1 min-w-[180px]">
        <label className="text-xs text-muted">Observação (opcional)</label>
        <Input name="notes" placeholder="Comprovante, referência..." />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Registrando..." : "Marcar como paga"}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

export function CancelInvoiceButton({
  invoiceId,
  cancel,
}: {
  invoiceId: string;
  cancel: (invoiceId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await cancel(invoiceId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cancelar.");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Cancelar esta fatura?</span>
        <Button variant="outline" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Cancelando..." : "Sim, cancelar"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
          Voltar
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Cancelar fatura
      </Button>
    </div>
  );
}
