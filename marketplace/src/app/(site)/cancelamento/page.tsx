import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { formatBps } from "@/domain/money";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Política de cancelamento" };

type Tier = { minHoursBefore: number; refundBps: number };

export default async function CancellationPage() {
  const [policies, settings] = await Promise.all([
    db.cancellationPolicy.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    getSettings(),
  ]);

  return (
    <ProsePage title="Política de cancelamento" draft intro="Regras aplicadas a cancelamentos e reembolsos de serviços contratados pela plataforma.">
      <h2>Direito de arrependimento</h2>
      <p>
        Contratações feitas pela internet podem ser canceladas em até {settings.cdcWithdrawalDays} dias, conforme o Código de
        Defesa do Consumidor, com reembolso integral quando o serviço ainda não tiver sido iniciado.
      </p>

      {policies.map((p) => (
        <section key={p.id}>
          <h2>{p.name}</h2>
          <p>{p.description}</p>
          <ul className="mt-3">
            {((Array.isArray(p.tiers) ? p.tiers : []) as Tier[]).map((t) => (
              <li key={t.minHoursBefore}>
                {t.minHoursBefore > 0 ? `${t.minHoursBefore} horas ou mais antes do horário` : "Menos tempo antes do horário"}:
                reembolso de {formatBps(t.refundBps)} do valor pago.
              </li>
            ))}
          </ul>
        </section>
      ))}

      <h2>Cancelamento pelo profissional ou falta</h2>
      <p>
        Se o profissional cancelar ou não comparecer, o cliente recebe reembolso integral ou pode reagendar com outro
        profissional, à sua escolha.
      </p>

      <h2>Cliente ausente</h2>
      <p>
        Se o profissional comparecer no horário e não conseguir acesso ao imóvel, o caso é analisado pela equipe com base
        nos registros do pedido antes de qualquer retenção.
      </p>
    </ProsePage>
  );
}
