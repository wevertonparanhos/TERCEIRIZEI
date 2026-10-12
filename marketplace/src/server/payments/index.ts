import "server-only";
import { env } from "@/lib/env";
import { AsaasGateway } from "./asaas";
import type { PaymentGateway } from "./gateway";
import { SimulatedGateway } from "./simulated";

const gateways: Record<string, PaymentGateway> = {
  simulated: new SimulatedGateway(),
  asaas: new AsaasGateway(),
};

/** Provedor ativo: PAYMENT_MODE=simulated → SIMULAÇÃO; live → Asaas (pendente). */
export function activeGateway(): PaymentGateway {
  return env().PAYMENT_MODE === "live" ? gateways.asaas! : gateways.simulated!;
}

export function gatewayByName(name: string): PaymentGateway | null {
  return gateways[name] ?? null;
}

export * from "./gateway";
