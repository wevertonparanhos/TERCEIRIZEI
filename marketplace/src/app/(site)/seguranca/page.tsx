import type { Metadata } from "next";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Segurança e confiança" };

export default function SecurityPage() {
  return (
    <ProsePage title="Segurança e confiança" intro="Como protegemos clientes e profissionais em cada etapa.">
      <h2>Profissionais verificados</h2>
      <p>
        Todo cadastro de profissional passa por análise da equipe antes de aparecer nas buscas. Categorias que exigem
        qualificação técnica (como serviços elétricos) pedem comprovação específica.
      </p>

      <h2>Pagamento pela plataforma</h2>
      <p>
        O pagamento é processado por um provedor de pagamentos especializado. Não armazenamos dados de cartão. A
        confirmação do pagamento vem diretamente do provedor; comprovantes enviados manualmente não liberam o pedido.
      </p>

      <h2>Seus dados protegidos</h2>
      <ul>
        <li>Telefone e endereço completos só são compartilhados entre cliente e profissional de um pedido com pagamento confirmado.</li>
        <li>O endereço residencial do profissional nunca é exibido publicamente.</li>
        <li>Documentos enviados para verificação são acessíveis apenas pela equipe autorizada.</li>
        <li>Ações administrativas sensíveis ficam registradas em trilha de auditoria.</li>
      </ul>

      <h2>Cancelamentos e ocorrências</h2>
      <p>
        As regras de cancelamento e reembolso são exibidas antes da contratação. Em caso de problema, abra uma
        ocorrência pelo pedido para que nossa equipe faça a mediação.
      </p>
    </ProsePage>
  );
}
