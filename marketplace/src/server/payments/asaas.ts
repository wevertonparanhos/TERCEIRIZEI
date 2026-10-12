import "server-only";
import { timingSafeEqual } from "node:crypto";
import { GatewayNotConfiguredError, WebhookAuthError, type PaymentGateway, type WebhookEvent } from "./gateway";

/**
 * Adaptador Asaas — PENDENTE de implementação e teste em sandbox.
 *
 * Modelo escolhido (ver docs/pagamentos.md): cobrança na conta da plataforma
 * SEM split; após a conclusão do serviço, transferência para a subconta
 * (walletId) do profissional — o split nativo do Asaas não aceita data futura.
 *
 * Já implementado: verificação do webhook (header `asaas-access-token`).
 * Falta (exige conta sandbox para validar contra a API real, sem suposições):
 * cliente/cobrança/QR PIX, consulta, estorno e transferência.
 */
export class AsaasGateway implements PaymentGateway {
  readonly name = "asaas";
  readonly isSimulated = false;

  private notReady(): never {
    throw new GatewayNotConfiguredError(
      "Integração Asaas ainda não implementada: crie a conta sandbox, defina ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN e finalize o adaptador.",
    );
  }

  createCharge(): never {
    return this.notReady();
  }
  getCharge(): never {
    return this.notReady();
  }
  refund(): never {
    return this.notReady();
  }
  transfer(): never {
    return this.notReady();
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookEvent> {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!expected) throw new GatewayNotConfiguredError("ASAAS_WEBHOOK_TOKEN não configurado.");
    const given = headers.get("asaas-access-token") ?? "";
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookAuthError("Token do webhook inválido.");
    const body = JSON.parse(rawBody) as { id?: string; event?: string; payment?: { id?: string } };
    if (!body.id || !body.event || !body.payment?.id) throw new WebhookAuthError("Evento malformado.");
    return { eventId: body.id, type: body.event, chargeId: body.payment.id };
  }
}
