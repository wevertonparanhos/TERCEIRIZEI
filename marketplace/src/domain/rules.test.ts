import { describe, expect, it } from "vitest";
import {
  assertTransition,
  BOOKING_STATUSES,
  canSeeCounterpartyContact,
  canTransition,
  InvalidTransitionError,
  isTerminal,
  providerResponseDeadline,
} from "./booking-state";
import { resolveCommission, type CommissionRuleLike } from "./commission";
import { can, ROLES } from "./permissions";

describe("máquina de estados do pedido", () => {
  it("somente o SISTEMA confirma o pagamento (cliente não consegue se autoconfirmar)", () => {
    expect(canTransition("AWAITING_PAYMENT", "CONFIRMED", "SYSTEM")).toBe(true);
    for (const actor of ["CUSTOMER", "PROVIDER", "ADMIN", "SUPPORT"] as const) {
      expect(canTransition("AWAITING_PAYMENT", "CONFIRMED", actor)).toBe(false);
      expect(canTransition("PAYMENT_PROCESSING", "CONFIRMED", actor)).toBe(false);
    }
  });

  it("bloqueia saltos inválidos", () => {
    expect(() => assertTransition("DRAFT", "COMPLETED", "ADMIN")).toThrow(InvalidTransitionError);
    expect(() => assertTransition("AWAITING_PAYMENT", "IN_PROGRESS", "PROVIDER")).toThrow();
    expect(() => assertTransition("CONFIRMED", "COMPLETED", "PROVIDER")).toThrow();
    expect(() => assertTransition("CANCELLED", "CONFIRMED", "SYSTEM")).toThrow();
  });

  it("segue o fluxo feliz completo", () => {
    const path = [
      ["DRAFT", "AWAITING_PROVIDER", "CUSTOMER"],
      ["AWAITING_PROVIDER", "AWAITING_PAYMENT", "PROVIDER"],
      ["AWAITING_PAYMENT", "CONFIRMED", "SYSTEM"],
      ["CONFIRMED", "IN_PROGRESS", "PROVIDER"],
      ["IN_PROGRESS", "COMPLETION_PENDING", "PROVIDER"],
      ["COMPLETION_PENDING", "COMPLETED", "CUSTOMER"],
    ] as const;
    for (const [from, to, actor] of path) expect(() => assertTransition(from, to, actor)).not.toThrow();
  });

  it("pagamento recusado volta a aguardar pagamento; reserva vencida expira", () => {
    expect(canTransition("PAYMENT_PROCESSING", "AWAITING_PAYMENT", "SYSTEM")).toBe(true);
    expect(canTransition("AWAITING_PAYMENT", "EXPIRED", "SYSTEM")).toBe(true);
  });

  it("estados finais não têm saída", () => {
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("REFUNDED")).toBe(true);
    expect(isTerminal("EXPIRED")).toBe(true);
    expect(isTerminal("COMPLETED")).toBe(false); // ainda pode ser contestado
  });

  it("todo estado tem regra definida", () => {
    for (const s of BOOKING_STATUSES) expect(() => isTerminal(s)).not.toThrow();
  });
});

describe("aceite do profissional", () => {
  it("só o profissional (ou admin) aceita ou recusa; cliente não se autoaceita", () => {
    expect(canTransition("AWAITING_PROVIDER", "AWAITING_PAYMENT", "PROVIDER")).toBe(true);
    expect(canTransition("AWAITING_PROVIDER", "DECLINED", "PROVIDER")).toBe(true);
    expect(canTransition("AWAITING_PROVIDER", "AWAITING_PAYMENT", "CUSTOMER")).toBe(false);
    expect(canTransition("AWAITING_PROVIDER", "CONFIRMED", "SYSTEM")).toBe(false); // não paga sem aceite
    expect(canTransition("AWAITING_PROVIDER", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("AWAITING_PROVIDER", "EXPIRED", "SYSTEM")).toBe(true);
    expect(isTerminal("DECLINED")).toBe(true);
  });

  it("prazo de resposta: 12h, mas termina 3h antes do serviço e nunca em menos de 30 min", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(providerResponseDeadline(now, new Date("2026-10-20T12:00:00Z"), 12).toISOString()).toBe("2026-10-13T00:00:00.000Z");
    expect(providerResponseDeadline(now, new Date("2026-10-13T02:00:00Z"), 12).toISOString()).toBe("2026-10-12T23:00:00.000Z");
    expect(providerResponseDeadline(now, new Date("2026-10-12T13:00:00Z"), 12).toISOString()).toBe("2026-10-12T12:30:00.000Z");
  });
});

describe("liberação de contato", () => {
  const released = new Date();
  it("não libera antes do pagamento confirmado, mesmo com tela de pagamento aberta", () => {
    expect(canSeeCounterpartyContact("AWAITING_PAYMENT", null)).toBe(false);
    expect(canSeeCounterpartyContact("PAYMENT_PROCESSING", null)).toBe(false);
    // estado forjado sem carimbo de liberação também não libera
    expect(canSeeCounterpartyContact("CONFIRMED", null)).toBe(false);
  });
  it("libera após confirmação confiável e deixa de liberar após cancelamento/reembolso", () => {
    expect(canSeeCounterpartyContact("CONFIRMED", released)).toBe(true);
    expect(canSeeCounterpartyContact("COMPLETED", released)).toBe(true);
    expect(canSeeCounterpartyContact("CANCELLED", released)).toBe(false);
    expect(canSeeCounterpartyContact("REFUNDED", released)).toBe(false);
  });
});

describe("resolução de comissão", () => {
  const at = new Date("2026-10-12T12:00:00Z");
  const rule = (r: Partial<CommissionRuleLike>): CommissionRuleLike => ({
    id: Math.random().toString(36),
    scope: "GLOBAL",
    categoryId: null,
    serviceId: null,
    couponId: null,
    rateBps: 2000,
    active: true,
    validFrom: new Date("2026-01-01"),
    validTo: null,
    ...r,
  });

  it("usa 20% global por padrão", () => {
    expect(resolveCommission([rule({})], { categoryId: "c", serviceId: "s", at }).rateBps).toBe(2000);
  });

  it("prioriza campanha > serviço > categoria > global", () => {
    const rules = [
      rule({}),
      rule({ scope: "CATEGORY", categoryId: "c", rateBps: 1800 }),
      rule({ scope: "SERVICE", serviceId: "s", rateBps: 1500 }),
      rule({ scope: "CAMPAIGN", couponId: "k", rateBps: 1000 }),
    ];
    expect(resolveCommission(rules, { categoryId: "c", serviceId: "s", couponId: "k", at }).rateBps).toBe(1000);
    expect(resolveCommission(rules, { categoryId: "c", serviceId: "s", at }).rateBps).toBe(1500);
    expect(resolveCommission(rules, { categoryId: "c", serviceId: "x", at }).rateBps).toBe(1800);
    expect(resolveCommission(rules, { categoryId: "z", serviceId: "x", at }).rateBps).toBe(2000);
  });

  it("ignora regras inativas ou fora da vigência", () => {
    const rules = [
      rule({}),
      rule({ scope: "CATEGORY", categoryId: "c", rateBps: 1, active: false }),
      rule({ scope: "CATEGORY", categoryId: "c", rateBps: 2, validFrom: new Date("2027-01-01") }),
      rule({ scope: "CATEGORY", categoryId: "c", rateBps: 3, validTo: new Date("2026-06-01") }),
    ];
    expect(resolveCommission(rules, { categoryId: "c", serviceId: "s", at }).rateBps).toBe(2000);
  });

  it("falha explicitamente se não houver regra", () => {
    expect(() => resolveCommission([], { categoryId: "c", serviceId: "s", at })).toThrow();
  });
});

describe("RBAC", () => {
  it("cliente e prestador não acessam funções administrativas", () => {
    for (const role of ["CUSTOMER", "PROVIDER"] as const) {
      expect(can(role, "admin:dashboard:read")).toBe(false);
      expect(can(role, "admin:catalog:manage")).toBe(false);
      expect(can(role, "admin:commission:manage")).toBe(false);
    }
  });

  it("suporte não acessa finanças, documentos nem configurações críticas", () => {
    expect(can("SUPPORT", "support:tickets:manage")).toBe(true);
    expect(can("SUPPORT", "admin:finance:read")).toBe(false);
    expect(can("SUPPORT", "admin:providers:documents:read")).toBe(false);
    expect(can("SUPPORT", "admin:settings:manage")).toBe(false);
    expect(can("SUPPORT", "admin:commission:manage")).toBe(false);
  });

  it("administrador tem todas as permissões e cada papel tem uma matriz", () => {
    expect(can("ADMIN", "admin:commission:manage")).toBe(true);
    for (const role of ROLES) expect(typeof can(role, "booking:create")).toBe("boolean");
  });
});
