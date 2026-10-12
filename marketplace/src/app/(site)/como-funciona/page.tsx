import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { LinkButton } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Como funciona" };

export default function HowItWorksPage() {
  return (
    <ProsePage title="Como funciona" intro={`O ${brand.name} conecta quem precisa de serviços para casa a profissionais autônomos, com preço claro antes da contratação.`}>
      <h2>Para quem contrata</h2>
      <ul>
        <li>Cadastro e pesquisa são gratuitos.</li>
        <li>Cada serviço tem escopo padronizado: o que está incluso, o que não está, duração estimada e materiais.</li>
        <li>Cada profissional define o seu preço. Você vê o valor final, já com a taxa de serviço, antes de pagar.</li>
        <li>O pagamento é feito pela plataforma, antes do atendimento. Os contatos do profissional são liberados somente depois que o pagamento é confirmado.</li>
        <li>Serviços que dependem de medidas e materiais (pintura, alvenaria, marcenaria) são feitos sob orçamento: nada é cobrado antes de você aprovar a proposta.</li>
      </ul>

      <h2>Para profissionais</h2>
      <ul>
        <li>Cadastro gratuito e sem mensalidade para aparecer nas buscas.</li>
        <li>Você escolhe as categorias, define o seu preço para cada pacote, sua agenda e as regiões que atende.</li>
        <li>A taxa da plataforma é acrescida ao valor pago pelo cliente: o preço que você define é o valor do seu serviço.</li>
        <li>Seu perfil passa por verificação antes de ser publicado.</li>
      </ul>

      <h2>Depois do serviço</h2>
      <p>
        As duas partes registram a conclusão ou relatam uma ocorrência. Em seguida, o cliente pode avaliar o atendimento
        e o repasse ao profissional é processado conforme as regras do pagamento.
      </p>

      <div className="flex flex-wrap gap-3 pt-4">
        <LinkButton href="/servicos">Ver serviços</LinkButton>
        <LinkButton href="/cadastro?perfil=profissional" variant="secondary">Sou profissional</LinkButton>
      </div>
    </ProsePage>
  );
}
