"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ProposalResponse({
  proposalId,
  respond,
}: {
  proposalId: string;
  respond: (proposalId: string, accept: boolean, input: { responseNote?: string }) => Promise<void>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  async function action(formData: FormData) {
    const responseNote = (formData.get("responseNote") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await respond(proposalId, mode === "accept", { responseNote: responseNote || undefined });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar sua resposta.");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={() => setMode("accept")}>Aceitar proposta</Button>
        <Button variant="outline" onClick={() => setMode("reject")}>
          Recusar
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-ink">
        {mode === "accept" ? "Confirmar aceite da proposta:" : "Confirmar recusa da proposta:"}
      </p>
      <Textarea name="responseNote" rows={2} placeholder="Comentário (opcional)" />
      {mode === "accept" && (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>Li e concordo com todas as cláusulas do contrato de prestação de serviços. Entendo que este aceite digital, com registro de data, hora, usuário e IP, equivale à minha assinatura.</span>
        </label>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting || (mode === "accept" && !agreed)}>
          {submitting ? "Enviando..." : mode === "accept" ? "Confirmar aceite" : "Confirmar recusa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => { setMode("idle"); setAgreed(false); }} disabled={submitting}>
          Voltar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
