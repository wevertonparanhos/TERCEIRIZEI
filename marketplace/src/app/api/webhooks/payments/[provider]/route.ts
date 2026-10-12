import { NextResponse } from "next/server";
import { handleWebhook } from "@/server/payments/service";

/**
 * Webhook dos provedores de pagamento. Autenticação é feita pelo adaptador
 * (assinatura/token); eventos repetidos são ignorados (idempotência).
 * Responde rápido e só com o necessário — nunca expõe detalhes internos.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const raw = await request.text();
  if (raw.length > 64_000) return new NextResponse("payload grande demais", { status: 413 });
  try {
    const result = await handleWebhook(provider, request.headers, raw);
    return new NextResponse(result.body, { status: result.status });
  } catch (error) {
    console.error("[webhook] erro inesperado", error);
    return new NextResponse("erro", { status: 500 });
  }
}
