import { assertBps, type Bps } from "./money";

export type CommissionRuleLike = {
  id: string;
  scope: "GLOBAL" | "CATEGORY" | "SERVICE" | "CAMPAIGN";
  categoryId: string | null;
  serviceId: string | null;
  couponId: string | null;
  rateBps: number;
  active: boolean;
  validFrom: Date;
  validTo: Date | null;
};

export type CommissionContext = {
  categoryId: string;
  serviceId: string;
  couponId?: string | null;
  at: Date;
};

const PRIORITY: Record<CommissionRuleLike["scope"], number> = {
  CAMPAIGN: 0,
  SERVICE: 1,
  CATEGORY: 2,
  GLOBAL: 3,
};

/**
 * Escolhe a comissão aplicável: campanha (cupom) > serviço > categoria > global.
 * Entre regras do mesmo escopo, vale a de vigência mais recente.
 */
export function resolveCommission(rules: CommissionRuleLike[], ctx: CommissionContext): { ruleId: string; rateBps: Bps } {
  const applicable = rules.filter((r) => {
    if (!r.active) return false;
    if (r.validFrom > ctx.at) return false;
    if (r.validTo && r.validTo <= ctx.at) return false;
    switch (r.scope) {
      case "GLOBAL":
        return true;
      case "CATEGORY":
        return r.categoryId === ctx.categoryId;
      case "SERVICE":
        return r.serviceId === ctx.serviceId;
      case "CAMPAIGN":
        return !!ctx.couponId && r.couponId === ctx.couponId;
    }
  });

  applicable.sort(
    (a, b) => PRIORITY[a.scope] - PRIORITY[b.scope] || b.validFrom.getTime() - a.validFrom.getTime(),
  );

  const chosen = applicable[0];
  if (!chosen) throw new Error("Nenhuma regra de comissão vigente. Configure a comissão global.");
  assertBps(chosen.rateBps, "comissão");
  return { ruleId: chosen.id, rateBps: chosen.rateBps };
}
