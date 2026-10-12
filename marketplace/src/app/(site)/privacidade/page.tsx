import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Política de privacidade" draft intro={`Como o ${brand.name} trata dados pessoais, em conformidade com a LGPD (Lei 13.709/2018).`}>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Cadastro: nome, e-mail, telefone e senha (armazenada de forma criptografada pelo provedor de autenticação).</li>
        <li>Pedidos: endereço do serviço, características do imóvel, datas e valores.</li>
        <li>Profissionais: dados de perfil, regiões atendidas, documentos para verificação e referência da conta de recebimento no provedor de pagamentos.</li>
        <li>Não armazenamos dados de cartão de crédito.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Executar o contrato: agendar, cobrar, repassar e dar suporte aos pedidos.</li>
        <li>Segurança: prevenir fraudes e manter registros de auditoria.</li>
        <li>Comunicação: avisos sobre pedidos e, apenas com seu consentimento, novidades e promoções.</li>
      </ul>

      <h2>Compartilhamento</h2>
      <p>
        Telefone e endereço completo são compartilhados apenas entre cliente e profissional de um pedido com pagamento
        confirmado. Dados de pagamento são tratados pelo provedor de pagamentos.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção, portabilidade e exclusão dos seus dados, além de revogar consentimentos,
        pelos canais de suporte. Alguns dados podem ser mantidos pelo prazo exigido por lei.
      </p>
    </ProsePage>
  );
}
