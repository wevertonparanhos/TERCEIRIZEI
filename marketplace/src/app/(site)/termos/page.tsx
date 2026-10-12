import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <ProsePage title="Termos de uso" draft>
      <h2>1. O que é a plataforma</h2>
      <p>
        O {brand.name} é uma plataforma de intermediação que aproxima clientes e profissionais autônomos de serviços
        residenciais. A plataforma não presta os serviços diretamente e os profissionais não são seus empregados.
      </p>

      <h2>2. Cadastro</h2>
      <ul>
        <li>O cadastro é gratuito para clientes e profissionais.</li>
        <li>As informações fornecidas devem ser verdadeiras e mantidas atualizadas.</li>
        <li>Perfis de profissionais passam por verificação antes de serem publicados.</li>
      </ul>

      <h2>3. Preços e taxa de serviço</h2>
      <p>
        Cada profissional define o preço dos seus serviços. A plataforma acrescenta uma taxa de serviço, exibida
        separadamente antes do pagamento. O preço contratado é registrado no pedido e não pode ser alterado depois da
        confirmação.
      </p>

      <h2>4. Pagamento</h2>
      <p>
        O pagamento é antecipado e processado por provedor de pagamentos parceiro. Os dados de contato entre as partes
        são liberados somente após a confirmação do pagamento pelo provedor.
      </p>

      <h2>5. Cancelamentos e reembolsos</h2>
      <p>Seguem a Política de cancelamento vigente no momento da contratação.</p>

      <h2>6. Conduta</h2>
      <p>
        É proibido combinar pagamentos por fora da plataforma para pedidos iniciados nela, publicar conteúdo ofensivo ou
        usar a plataforma para fins ilícitos. Violações podem levar à suspensão da conta.
      </p>

      <h2>7. Avaliações</h2>
      <p>Avaliações devem refletir experiências reais. Conteúdo abusivo pode ser moderado.</p>
    </ProsePage>
  );
}
