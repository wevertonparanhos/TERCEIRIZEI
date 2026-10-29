import { redirect } from "next/navigation";

// A criação agora é feita pelo botão "+ Nova Proposta" da lista (nome + cliente opcional + modelo).
export default function NovaPropostaPage() {
  redirect("/propostas");
}
