# Pagamentos, repasses e cancelamentos

## Situação atual

| Item | Situação |
| --- | --- |
| Provedor **SIMULADO** (`PAYMENT_MODE=simulated`) | ✅ Implementado e testado (`npm run check:payments`). **Não movimenta dinheiro.** |
| Provedor **Asaas** (`PAYMENT_MODE=live`) | ⏳ Adaptador criado (`src/server/payments/asaas.ts`) com verificação de webhook; cobrança, consulta, estorno e transferência **pendentes** de conta sandbox. |

Nenhuma tela apresenta a simulação como pagamento real: todas exibem "SIMULAÇÃO".

## Escolha do provedor (recomendação: Asaas)

Regra do negócio: **o profissional só recebe depois da conclusão** (foto/vídeo e/ou confirmação do cliente).

- **Asaas** — o split nativo é executado no recebimento e **não aceita data futura**; a própria documentação orienta cobrar sem split e **transferir para a conta/subconta (walletId) do parceiro na data desejada**. Encaixa exatamente na regra: cobrança na conta da plataforma → transferência ao profissional após a conclusão. Webhook autenticado pelo header `asaas-access-token`; entrega "pelo menos uma vez" (exige idempotência — já implementada).
  - Fontes: [Split de pagamento](https://docs.asaas.com/docs/split-de-pagamento), [Dúvidas de split](https://docs.asaas.com/docs/duvidas-frequentes-split), [Webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).
- **Mercado Pago** — split 1:1 divide o valor na hora do pagamento; mudar a liberação da comissão exige negociação com o comercial; cada profissional precisa de conta MP com KYC nível 6 e autorizar o app via OAuth.
  - Fonte: [Split de pagamentos — pré-requisitos](https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/prerequisites).

**Tarifas**: não foram encontradas tabelas públicas confiáveis e atuais; ficam configuráveis em `administrative_settings.payments.estimatedFee` (hoje 0) até o contrato.

## Fluxo

1. Cliente solicita → **profissional aceita** → cliente paga (PIX/cartão; crédito da plataforma pode abater).
2. Provedor envia webhook → assinatura verificada → evento gravado **uma vez** (`payment_webhook_events`) → status **reconsultado** no provedor.
3. Aprovado: pedido `CONFIRMED`, **contatos liberados**, comissão registrada (1 por pedido), repasse criado **RETIDO**.
4. Profissional inicia → envia **foto/vídeo** → finaliza. Cliente confirma (ou, com evidência e 48h sem contestação, conclusão automática).
5. Pedido `COMPLETED` → repasse **AGENDADO** (gatilho) → admin paga em *Financeiro → Repasses* (transferência ao profissional).

Proteções no banco: 1 cobrança pendente e 1 aprovada por pedido; repasse só para pedido concluído; finalizar exige evidência; saldo de crédito nunca negativo.

## Cancelamento (regra do negócio — minuta para revisão jurídica)

- Cliente com **≥ 24h** de antecedência → reembolso integral.
- Cliente com **< 24h** → escolhe: **crédito integral** na plataforma **ou** **estorno sem a taxa de serviço** (taxa retida).
- Profissional cancela → reembolso integral.
- **Direito de arrependimento (CDC, 7 dias da contratação, antes do serviço)** → reembolso integral. Mantido por ser garantia legal.
- Pagamento que chega depois de o pedido expirar → estorno automático.

## Para ativar o Asaas (produção)

1. Criar conta Asaas (sandbox primeiro) e obter a chave de API.
2. Definir `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` e `PAYMENT_MODE=live`.
3. Cadastrar o webhook apontando para `https://SEU-DOMINIO/api/webhooks/payments/asaas` com o mesmo token.
4. Implementar e testar em sandbox: cliente (exige CPF/CNPJ do pagador), cobrança PIX/cartão, QR code, consulta, estorno e transferência para a subconta do profissional (`provider_profiles.payout_account_ref` = walletId).
5. Rodar `npm run check:payments` adaptado ao sandbox antes de virar a chave.

## Variáveis

| Variável | Uso |
| --- | --- |
| `PAYMENT_MODE` | `simulated` (padrão) ou `live` |
| `PAYMENT_WEBHOOK_SECRET` | Segredo HMAC do provedor simulado (obrigatório em produção se o simulado for usado em homologação) |
| `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` | Credenciais do Asaas (pendente) |
