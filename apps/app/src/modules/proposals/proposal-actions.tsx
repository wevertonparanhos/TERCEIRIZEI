"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SendProposalButton({ proposalId, send }: { proposalId: string; send: (proposalId: string) => Promise<void> }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await send(proposalId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Enviar ao cliente? Não será mais possível editar os itens.</span>
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Enviando..." : "Sim, enviar"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
          Voltar
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <Button onClick={() => setConfirming(true)}>Enviar proposta</Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function DeleteProposalButton({ proposalId, deleteProposal }: { proposalId: string; deleteProposal: (proposalId: string) => Promise<void> }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await deleteProposal(proposalId);
      router.push("/propostas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir.");
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Excluir este rascunho?</span>
        <Button variant="outline" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Excluindo..." : "Sim, excluir"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
          Voltar
        </Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} className="text-xs text-red-500 hover:underline">
      Excluir rascunho
    </button>
  );
}
