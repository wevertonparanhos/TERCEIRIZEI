"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { createProposal, createTemplate, deleteTemplate, cancelProposal, deleteProposal } from "./actions";

type TemplateSummary = { id: string; name: string; services: number; total: number };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProposalsToolbar({ clients, templates }: { clients: { id: string; name: string }[]; templates: TemplateSummary[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | "nova" | "modelos" | "novo-modelo">(null);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setDialog(null);
    setError(null);
    setConfirmDelete(null);
  }

  function useTemplate(t: TemplateSummary) {
    setTemplateId(t.id);
    setTitle(t.name);
    setError(null);
    setDialog("nova");
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const id = await createProposal({ title, clientId: clientId || undefined, templateId: templateId || undefined });
      router.push(`/propostas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a proposta.");
      setBusy(false);
    }
  }

  async function handleCreateTemplate() {
    setBusy(true);
    setError(null);
    try {
      const id = await createTemplate(templateName);
      router.push(`/propostas/modelos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o modelo.");
      setBusy(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteTemplate(id);
      setConfirmDelete(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o modelo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setDialog("modelos")}>
          Modelos{templates.length > 0 ? ` (${templates.length})` : ""}
        </Button>
        <Button
          type="button"
          onClick={() => {
            setTemplateId("");
            setTitle("");
            setDialog("nova");
          }}
        >
          + Nova Proposta
        </Button>
      </div>

      <Modal
        open={dialog === "nova"}
        onClose={close}
        title="Nova proposta"
        description="Dê um nome e, se já souber, escolha o cliente. O resto você monta no editor."
        footer={
          <>
            <span className="text-xs text-red-600">{error}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreate} disabled={busy || title.trim().length < 3}>
                {busy ? "Criando..." : "Criar e abrir editor"}
              </Button>
            </div>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np-title">Nome da proposta</Label>
            <Input id="np-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: BPO de Legalização" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-client">Cliente (opcional)</Label>
            <Select id="np-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Escolher depois</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-template">Começar de um modelo (opcional)</Label>
            <Select id="np-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Em branco</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        open={dialog === "modelos"}
        onClose={close}
        title="Modelos de proposta"
        description="Propostas prontas para reaproveitar. Tudo nelas pode ser editado."
        footer={
          <>
            <span className="text-xs text-red-600">{error}</span>
            <Button
              type="button"
              onClick={() => {
                setTemplateName("");
                setError(null);
                setDialog("novo-modelo");
              }}
            >
              + Novo modelo
            </Button>
          </>
        }
      >
        {templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-soft">Nenhum modelo ainda. Crie um novo ou salve uma proposta existente como modelo.</p>
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
                  <p className="text-xs text-muted">
                    {t.services} serviço(s) · {brl.format(t.total)}
                  </p>
                </div>
                {confirmDelete === t.id ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    Excluir?
                    <Button type="button" size="sm" variant="outline" onClick={() => handleDeleteTemplate(t.id)} disabled={busy}>
                      Sim
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                      Não
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={() => useTemplate(t)}>
                      Usar
                    </Button>
                    <Link href={`/propostas/modelos/${t.id}`}>
                      <Button type="button" size="sm" variant="outline">
                        Editar modelo
                      </Button>
                    </Link>
                    <button type="button" onClick={() => setConfirmDelete(t.id)} className="text-xs text-red-500 hover:underline">
                      Excluir
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={dialog === "novo-modelo"}
        onClose={close}
        title="Novo modelo"
        description="Dê um nome ao modelo e monte o conteúdo no editor."
        footer={
          <>
            <span className="text-xs text-red-600">{error}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog("modelos")} disabled={busy}>
                Voltar
              </Button>
              <Button type="button" onClick={handleCreateTemplate} disabled={busy || templateName.trim().length < 2}>
                {busy ? "Criando..." : "Criar e abrir editor"}
              </Button>
            </div>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="nm-name">Nome do modelo</Label>
          <Input id="nm-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ex.: BPO Financeiro mensal" autoFocus />
        </div>
      </Modal>
    </>
  );
}

/** Cancelar / excluir direto da linha da lista. */
export function ProposalRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "cancel" | "delete">(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = status === "ENVIADA" || status === "ACEITA";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "cancel") await cancelProposal(id, reason);
      else if (mode === "delete") await deleteProposal(id);
      setMode(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  if (mode) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-xs text-muted">{mode === "cancel" ? "Cancelar esta proposta?" : "Excluir de vez?"}</span>
        {mode === "cancel" && (
          <Input aria-label="Motivo do cancelamento" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (opcional)" className="h-8 w-48 text-xs" />
        )}
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={run} disabled={busy} className="h-8">
            {busy ? "..." : "Confirmar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)} disabled={busy} className="h-8">
            Voltar
          </Button>
        </div>
        {error && <span className="max-w-[220px] text-right text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-3 text-xs">
      {canCancel && (
        <button type="button" onClick={() => setMode("cancel")} className="font-medium text-amber-600 hover:underline">
          Cancelar
        </button>
      )}
      <button type="button" onClick={() => setMode("delete")} className="font-medium text-red-500 hover:underline">
        Excluir
      </button>
    </div>
  );
}
