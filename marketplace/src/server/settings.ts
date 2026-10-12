import "server-only";
import { cache } from "react";
import type { CommissionMode, CostBearer, FeeConfig } from "@/domain/pricing";
import { db } from "./db";

export type PlatformSettings = {
  commissionMode: CommissionMode;
  discountBearer: CostBearer;
  feeBearer: CostBearer;
  estimatedFee: { pix: FeeConfig; card: FeeConfig };
  /** Prazo para pagar depois do aceite do profissional. */
  holdMinutes: number;
  providerResponseHours: number;
  minLeadHours: number;
  slotStepMinutes: number;
  termsVersion: string;
  cdcWithdrawalDays: number;
  fullRefundMinHours: number;
};

const DEFAULTS: PlatformSettings = {
  commissionMode: "ON_TOP",
  discountBearer: "PLATFORM",
  feeBearer: "PLATFORM",
  estimatedFee: { pix: { bps: 0, fixedCents: 0 }, card: { bps: 0, fixedCents: 0 } },
  holdMinutes: 120,
  providerResponseHours: 12,
  minLeadHours: 12,
  slotStepMinutes: 30,
  termsVersion: "2026-10-minuta",
  cdcWithdrawalDays: 7,
  fullRefundMinHours: 24,
};

const BEARERS = ["PLATFORM", "PROVIDER", "PROPORTIONAL"] as const;
const isBearer = (v: unknown): v is CostBearer => BEARERS.includes(v as CostBearer);
const isInt = (v: unknown): v is number => Number.isInteger(v);

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db.administrativeSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
  const fee = map.get("payments.estimatedFee") as Record<string, unknown> | undefined;

  return {
    commissionMode: map.get("pricing.commissionMode") === "INCLUDED" ? "INCLUDED" : DEFAULTS.commissionMode,
    discountBearer: isBearer(map.get("payments.discountBearer")) ? (map.get("payments.discountBearer") as CostBearer) : DEFAULTS.discountBearer,
    feeBearer: isBearer(map.get("payments.feeBearer")) ? (map.get("payments.feeBearer") as CostBearer) : DEFAULTS.feeBearer,
    estimatedFee: {
      pix: { bps: isInt(fee?.pixBps) ? fee.pixBps : 0, fixedCents: isInt(fee?.pixFixedCents) ? fee.pixFixedCents : 0 },
      card: { bps: isInt(fee?.cardBps) ? fee.cardBps : 0, fixedCents: isInt(fee?.cardFixedCents) ? fee.cardFixedCents : 0 },
    },
    holdMinutes: isInt(map.get("booking.holdMinutes")) ? (map.get("booking.holdMinutes") as number) : DEFAULTS.holdMinutes,
    providerResponseHours: isInt(map.get("booking.providerResponseHours")) ? (map.get("booking.providerResponseHours") as number) : DEFAULTS.providerResponseHours,
    minLeadHours: isInt(map.get("booking.minLeadHours")) ? (map.get("booking.minLeadHours") as number) : DEFAULTS.minLeadHours,
    slotStepMinutes: isInt(map.get("booking.slotStepMinutes")) ? (map.get("booking.slotStepMinutes") as number) : DEFAULTS.slotStepMinutes,
    termsVersion: typeof map.get("legal.termsVersion") === "string" ? (map.get("legal.termsVersion") as string) : DEFAULTS.termsVersion,
    cdcWithdrawalDays: isInt(map.get("cancellation.cdcWithdrawalDays")) ? (map.get("cancellation.cdcWithdrawalDays") as number) : DEFAULTS.cdcWithdrawalDays,
    fullRefundMinHours: isInt(map.get("cancellation.fullRefundMinHours")) ? (map.get("cancellation.fullRefundMinHours") as number) : DEFAULTS.fullRefundMinHours,
  };
});
