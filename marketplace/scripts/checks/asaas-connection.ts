/**
 * Teste de conexão com o Asaas — SOMENTE LEITURA (lista 1 cliente).
 * Não cria cobrança nem movimenta dinheiro; seguro também em produção.
 * Executar: npm run check:asaas
 */
const env = process.env.ASAAS_ENV ?? "sandbox";
const key = process.env.ASAAS_API_KEY;
const base = env === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

async function main() {
  if (!key) {
    console.log("✘ ASAAS_API_KEY não está preenchida no .env.local.");
    process.exitCode = 1;
    return;
  }
  console.log(`Ambiente: ${env === "production" ? "PRODUÇÃO (dinheiro real)" : "SANDBOX (testes)"}`);
  const res = await fetch(`${base}/customers?limit=1`, {
    headers: { access_token: key, "user-agent": "LarPronto-Marketplace/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.ok) {
    const data = (await res.json()) as { totalCount?: number };
    console.log(`✔ Conexão OK. Clientes cadastrados na conta: ${data.totalCount ?? "?"}`);
  } else if (res.status === 401) {
    console.log("✘ Chave recusada (401). Verifique se a chave é deste ambiente (sandbox x produção) e se foi copiada inteira.");
    process.exitCode = 1;
  } else {
    console.log(`✘ Resposta inesperada do Asaas: HTTP ${res.status}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.log("✘ Falha de rede ao falar com o Asaas:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
