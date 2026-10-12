"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, CreditCard, FlaskConical, QrCode } from "lucide-react";
import { FormMessage, SubmitButton, type FormState } from "@/components/ui/form";
import { formatBRL } from "@/domain/money";
import { cn } from "@/lib/utils";
import { simulatePaymentAction, startPaymentAction } from "../../../actions";

type Payment = { id: string; method: "PIX" | "CARD"; pixCopyPaste: string | null; isSimulated: boolean } | null;

export function PaymentPanel({ bookingId, payment, simulated, creditBalanceCents, remainingCents }: { bookingId: string; payment: Payment; simulated: boolean; creditBalanceCents: number; remainingCents: number }) {
  const router = useRouter();
  const [startState, start] = useActionState(startPaymentAction, {} as FormState);
  const [simState, simulate] = useActionState(simulatePaymentAction, {} as FormState);
  const [method, setMethod] = useState<"PIX" | "CARD">(payment?.method ?? "PIX");
  const [copied, setCopied] = useState(false);

  // Enquanto há cobrança pendente, consulta o servidor (a confirmação vem pelo webhook do provedor).
  useEffect(() => {
    if (!payment) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [payment, router]);

  useEffect(() => {
    if (simState.ok) router.refresh();
  }, [simState, router]);

  return (
    <div className="space-y-5">
      <form action={start} className="space-y-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <input type="hidden" name="method" value={method} />
        <FormMessage state={startState} />
        {creditBalanceCents > 0 ? (
          <label className="flex items-start gap-3 rounded-2xl border border-brand/40 bg-brand-soft/50 p-4 text-sm">
            <input type="checkbox" name="useCredit" defaultChecked className="mt-0.5 size-4 accent-[var(--color-brand)]" />
            <span>
              <span className="block font-semibold">Usar meu crédito ({formatBRL(creditBalanceCents)})</span>
              <span className="text-muted">
                {creditBalanceCents >= remainingCents ? "Cobre o valor total: o pedido é confirmado na hora." : `Abate do total; o restante (${formatBRL(remainingCents - creditBalanceCents)}) é pago por ${method === "PIX" ? "PIX" : "cartão"}.`}
              </span>
            </span>
          </label>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { v: "PIX", label: "PIX", hint: "Aprovação na hora", icon: QrCode },
            { v: "CARD", label: "Cartão de crédito", hint: "Dados digitados no ambiente do provedor", icon: CreditCard },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setMethod(o.v)}
              aria-pressed={method === o.v}
              className={cn("flex items-center gap-3 rounded-2xl border p-4 text-left transition", method === o.v ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line hover:border-brand/40")}
            >
              <o.icon className="size-6 text-brand" aria-hidden />
              <span>
                <span className="block font-semibold">{o.label}</span>
                <span className="text-xs text-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
        {!payment || payment.method !== method || creditBalanceCents > 0 ? (
          <SubmitButton className="w-full" pendingText="Gerando cobrança…">{method === "PIX" ? "Gerar código PIX" : "Pagar com cartão"}</SubmitButton>
        ) : null}
      </form>

      {payment && payment.method === "PIX" && payment.pixCopyPaste ? (
        <div className="rounded-2xl border border-line p-4">
          <p className="text-sm font-semibold">PIX copia e cola</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 truncate rounded-xl bg-canvas px-3 py-2.5 text-xs">{payment.pixCopyPaste}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(payment.pixCopyPaste!);
                setCopied(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3 text-sm font-medium"
            >
              <Copy className="size-4" aria-hidden /> {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Esta página se atualiza sozinha quando o pagamento é confirmado.</p>
        </div>
      ) : null}

      {payment && payment.method === "CARD" && !payment.isSimulated ? (
        <p className="text-sm text-muted">Você será direcionado ao ambiente seguro do provedor para digitar os dados do cartão.</p>
      ) : null}

      {payment && simulated ? (
        <div className="rounded-2xl border-2 border-dashed border-warning/60 bg-warning-soft p-4">
          <p className="flex items-center gap-2 font-semibold text-warning">
            <FlaskConical className="size-5" aria-hidden /> SIMULAÇÃO — ambiente de testes
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Nenhum dinheiro é cobrado. Os botões abaixo fazem o papel do banco/provedor e enviam um aviso assinado para a plataforma, pelo mesmo
            caminho de um pagamento real.
          </p>
          <FormMessage state={simState} />
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={simulate}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="outcome" value="RECEIVED" />
              <SubmitButton pendingText="Simulando…">Simular pagamento aprovado</SubmitButton>
            </form>
            <form action={simulate}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="outcome" value="DECLINED" />
              <SubmitButton variant="secondary" pendingText="Simulando…">Simular recusa</SubmitButton>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
