"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelProposal, deleteProposal, reopenProposal, saveProposalAsTemplate } from "./actions";

/** Ações de uma proposta já enviada (ou aceita/recusada/cancelada): cancelar, voltar a rascunho, excluir, modelo, PDF. */
export function ProposalViewActions({ id, status, title, canManage }: { id: string; status: string; title: string; canManage: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "cancel" | "delete" | "template">(null);
  const [reason, setReason] = useState("");
  const [templateName, setTemplateName] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canCancel = status === "ENVIADA" || status === "ACEITA";
  const canReopen = status === "ENVIADA" || status === "RECUSADA" || status === "CANCELADA";

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode(null);
      after?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Exportar PDF
        </Button>
        {canManage && canReopen && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(() => reopenProposal(id))}>
            Voltar para rascunho
          </Button>
        )}
        {canManage && canCancel && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setMode("cancel")}>
            Cancelar proposta
          </Button>
        )}
        {canManage && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setMode("template")}>
            Salvar como modelo
          </Button>
        )}
        {canManage && (
          <button type="button" onClick={() => setMode("delete")} className="ml-1 text-xs font-medium text-red-500 hover:underline">
            Excluir proposta
          </button>
        )}
      </div>

      {mode === "cancel" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
          <span className="text-muted">Cancelar esta proposta? Ela deixa de aparecer para o cliente.</span>
          <Input aria-label="Motivo do cancelamento" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="h-9 max-w-xs" />
          <Button type="button" size="sm" disabled={busy} onClick={() => run(() => cancelProposal(id, reason))}>
            {busy ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
            Voltar
          </Button>
        </div>
      )}

      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <span className="text-red-700 dark:text-red-300">
            Excluir de vez? {status === "ACEITA" ? "Esta proposta já foi aceita pelo cliente. " : ""}Não dá para desfazer.
          </span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run(() => deleteProposal(id), () => router.push("/propostas"))}>
            {busy ? "Excluindo..." : "Sim, excluir"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
            Voltar
          </Button>
        </div>
      )}

      {mode === "template" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3 text-sm">
          <Input aria-label="Nome do modelo" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nome do modelo" className="h-9 max-w-xs" />
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => run(() => saveProposalAsTemplate(id, templateName), () => setNotice("Modelo criado. Ele aparece em “Modelos” na lista de propostas."))}
          >
            {busy ? "Criando..." : "Criar modelo"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
            Voltar
          </Button>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{notice}</p>}
    </div>
  );
}
