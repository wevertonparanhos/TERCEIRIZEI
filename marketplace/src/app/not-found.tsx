import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-muted">O endereço pode ter mudado ou o conteúdo não está mais disponível.</p>
        <LinkButton href="/" className="mt-6">Voltar ao início</LinkButton>
      </div>
    </div>
  );
}
