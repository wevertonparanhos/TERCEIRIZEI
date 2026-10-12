import { describe, expect, it } from "vitest";
import { cancellationOptions, type CancellationInput } from "./refund";

const start = new Date("2026-10-30T12:00:00Z");
const base: CancellationInput = {
  paidCents: 24_000, // profissional R$ 200 + taxa R$ 40
  creditAppliedCents: 0,
  alreadyRefundedCents: 0,
  commissionCents: 4_000,
  scheduledStart: start,
  paidAt: new Date("2026-10-01T12:00:00Z"),
  now: new Date("2026-10-28T12:00:00Z"),
  cancelledBy: "CUSTOMER",
  fullRefundMinHours: 24,
  withdrawalDays: 7,
};
const hoursBefore = (h: number) => new Date(start.getTime() - h * 3_600_000);
const kinds = (d: ReturnType<typeof cancellationOptions>) => (d.ok ? d.options.map((o) => o.kind) : []);

describe("cancelamento pelo cliente (regra das 24h)", () => {
  it("com 24h ou mais: reembolso integral", () => {
    const d = cancellationOptions({ ...base, now: hoursBefore(24) });
    expect(kinds(d)).toEqual(["REFUND_FULL"]);
    expect(d.ok && d.options[0]!.refundToPaymentCents).toBe(24_000);
  });

  it("com menos de 24h: escolha entre crédito integral ou estorno sem a taxa", () => {
    const d = cancellationOptions({ ...base, now: hoursBefore(23) });
    expect(kinds(d)).toEqual(["CREDIT", "REFUND_MINUS_FEE"]);
    if (!d.ok) throw new Error();
    const credit = d.options.find((o) => o.kind === "CREDIT")!;
    const refund = d.options.find((o) => o.kind === "REFUND_MINUS_FEE")!;
    expect([credit.creditCents, credit.refundToPaymentCents]).toEqual([24_000, 0]);
    expect([refund.refundToPaymentCents, refund.retainedFeeCents]).toEqual([20_000, 4_000]);
  });

  it("arrependimento do CDC (7 dias da contratação) garante reembolso integral mesmo em cima da hora", () => {
    const d = cancellationOptions({ ...base, paidAt: hoursBefore(48), now: hoursBefore(2) });
    expect(kinds(d)).toEqual(["REFUND_FULL"]);
  });

  it("profissional cancelando: sempre reembolso integral", () => {
    expect(kinds(cancellationOptions({ ...base, now: hoursBefore(1), cancelledBy: "PROVIDER" }))).toEqual(["REFUND_FULL"]);
  });

  it("depois do início não cancela; nada a fazer se já reembolsado", () => {
    expect(cancellationOptions({ ...base, now: new Date(start.getTime() + 1) }).ok).toBe(false);
    expect(cancellationOptions({ ...base, alreadyRefundedCents: 24_000 }).ok).toBe(false);
  });

  it("pedido pago parte com crédito: crédito volta como crédito; a taxa sai primeiro do pagamento", () => {
    const mixed = { ...base, paidCents: 14_000, creditAppliedCents: 10_000 };
    const full = cancellationOptions(mixed);
    expect(full.ok && [full.options[0]!.refundToPaymentCents, full.options[0]!.creditCents]).toEqual([14_000, 10_000]);

    const late = cancellationOptions({ ...mixed, now: hoursBefore(3) });
    if (!late.ok) throw new Error();
    const r = late.options.find((o) => o.kind === "REFUND_MINUS_FEE")!;
    expect([r.refundToPaymentCents, r.creditCents, r.retainedFeeCents]).toEqual([10_000, 10_000, 4_000]);
    const c = late.options.find((o) => o.kind === "CREDIT")!;
    expect(c.creditCents).toBe(24_000);
  });

  it("pago 100% com crédito e taxa retida: taxa sai do crédito", () => {
    const d = cancellationOptions({ ...base, paidCents: 0, creditAppliedCents: 24_000, now: hoursBefore(3) });
    if (!d.ok) throw new Error();
    const r = d.options.find((o) => o.kind === "REFUND_MINUS_FEE")!;
    expect([r.refundToPaymentCents, r.creditCents, r.retainedFeeCents]).toEqual([0, 20_000, 4_000]);
  });

  it("em todas as opções, devolvido + retido = valor do pedido", () => {
    for (const h of [100, 23, 1])
      for (const [paid, credit] of [[24_000, 0], [14_000, 10_000], [0, 24_000], [3_000, 21_000]] as const) {
        const d = cancellationOptions({ ...base, paidCents: paid, creditAppliedCents: credit, now: hoursBefore(h) });
        if (!d.ok) throw new Error();
        for (const o of d.options) expect(o.refundToPaymentCents + o.creditCents + o.retainedFeeCents).toBe(paid + credit);
      }
  });
});
