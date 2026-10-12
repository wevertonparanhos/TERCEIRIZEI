import Link from "next/link";
import { CircleCheck, Circle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { RatingBadge } from "@/components/reviews/stars";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/surface";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { PROVIDER_STATUS, providerChecklist } from "@/server/provider";

const LINKS: Record<string, string> = {
  profile: "/profissional/perfil",
  categories: "/profissional/servicos",
  offers: "/profissional/servicos",
};

export default async function ProviderHome() {
  const user = await requirePageRole(["PROVIDER"], "/profissional");
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  const { provider, items, complete } = await providerChecklist(profile.id);
  const status = PROVIDER_STATUS[provider.status];

  return (
    <>
      <PageHeader
        title={`Olá, ${provider.displayName.split(" ")[0]}`}
        description="Gerencie seu perfil, seus serviços e seus preços."
        actions={<Badge tone={status.tone} className="px-3 py-1 text-sm">{status.label}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="p-6">
          <h2 className="font-semibold">Seu cadastro</h2>
          <p className="mt-1 text-sm text-muted">{status.help}</p>
          {provider.statusReason && provider.status !== "APPROVED" ? (
            <div className="mt-4">
              <Notice tone="warning" title="Mensagem da equipe">{provider.statusReason}</Notice>
            </div>
          ) : null}
          <ul className="mt-5 space-y-3">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5 text-sm">
                <span className="flex items-center gap-2.5">
                  {item.done ? <CircleCheck className="size-5 text-success" aria-hidden /> : <Circle className="size-5 text-line-strong" aria-hidden />}
                  {item.label}
                </span>
                {!item.done ? <Link href={LINKS[item.key] ?? "/profissional"} className="font-medium text-brand hover:underline">Completar</Link> : null}
              </li>
            ))}
          </ul>
          {complete && provider.status === "PENDING" ? (
            <p className="mt-5 text-sm font-medium text-success">Cadastro completo! Aguarde a análise da equipe.</p>
          ) : null}
        </Card>

        <div className="space-y-6">
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Sua avaliação</h2>
          <RatingBadge sum={provider.ratingSum} count={provider.ratingCount} className="text-lg" />
          <LinkButton href="/profissional/avaliacoes" variant="secondary" size="sm">Ver avaliações</LinkButton>
        </Card>
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Como você recebe</h2>
          <p className="text-sm text-muted">
            Você define o preço do seu serviço. A taxa da plataforma é somada ao valor pago pelo cliente, então o preço
            que você define é o valor do seu trabalho.
          </p>
          <LinkButton href="/profissional/servicos" variant="secondary" size="sm">Definir meus preços</LinkButton>
        </Card>
        </div>
      </div>

      <p className="mt-8 text-sm text-muted">
        Agenda, disponibilidade, documentos e pedidos recebidos chegam na próxima etapa da plataforma.
      </p>
    </>
  );
}
