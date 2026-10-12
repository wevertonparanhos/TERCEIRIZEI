"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Erro genérico: nunca exibe detalhes internos ao usuário (só o identificador). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Algo deu errado</h1>
        <p className="mt-2 text-muted">Tente novamente. Se o problema continuar, fale com o suporte.</p>
        {error.digest ? <p className="mt-1 text-xs text-muted">Código: {error.digest}</p> : null}
        <Button onClick={reset} className="mt-6">Tentar novamente</Button>
      </div>
    </div>
  );
}
