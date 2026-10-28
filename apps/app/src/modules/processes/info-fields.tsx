"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type InfoField = {
  id: string;
  label: string;
  value: string;
  updatedAt: string;
  updatedByName: string | null;
};

type Props = {
  processId: string;
  fields: InfoField[];
  canWrite: boolean;
  addField: (processId: string, label: string, value: string) => Promise<void>;
  updateField: (fieldId: string, label: string, value: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
};

/** Aba "Informações": dados da tarefa só para a equipe (CNPJ, acessos, links, referências). */
export function InfoFields({ processId, fields, canWrite, addField, updateField, deleteField }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startNew() {
    setEditingId("new");
    setLabel("");
    setValue("");
    setError(null);
  }

  function startEdit(f: InfoField) {
    setEditingId(f.id);
    setLabel(f.label);
    setValue(f.value);
    setError(null);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!label.trim()) {
      setError("Informe o nome do campo.");
      return;
    }
    run(() => (editingId === "new" ? addField(processId, label, value) : updateField(editingId as string, label, value)));
  }

  function copy(f: InfoField) {
    navigator.clipboard
      ?.writeText(f.value)
      .then(() => {
        setCopiedId(f.id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => {});
  }

  const form = (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-accent-soft/30 p-3">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome do campo (ex.: CNPJ, Login do portal)" />
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} placeholder="Valor" />
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={save}>
          {busy ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEditingId(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Users className="h-4 w-4 text-muted-soft" />
          Da equipe
        </p>
        <p className="mt-1 text-xs text-muted">
          Dados da tarefa para a equipe, como acessos, links e referências. Só a equipe vê — o cliente não tem acesso a esta aba.
        </p>
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border/70">
        {fields.length === 0 && editingId !== "new" && (
          <li className="px-4 py-6 text-center text-sm text-muted-soft">Nenhum campo ainda.</li>
        )}
        {fields.map((f) =>
          editingId === f.id ? (
            <li key={f.id} className="p-3">
              {form}
            </li>
          ) : (
            <li key={f.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted">{f.label}</p>
                <p className="whitespace-pre-wrap break-words text-sm font-medium text-ink">{f.value || "—"}</p>
                <p className="mt-1 text-[11px] text-muted-soft">
                  Modificado em {new Date(f.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  {f.updatedByName ? ` por ${f.updatedByName}` : ""}
                </p>
              </div>
              <div className="flex flex-none items-center gap-1">
                <button
                  type="button"
                  title="Copiar valor"
                  onClick={() => copy(f)}
                  className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-ink"
                >
                  {copiedId === f.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
                {canWrite && (
                  <>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => startEdit(f)}
                      className="rounded-md p-1.5 text-muted hover:bg-surface-alt hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Excluir o campo "${f.label}"?`)) run(() => deleteField(f.id));
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        )}
        {editingId === "new" && <li className="p-3">{form}</li>}
      </ul>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      {canWrite && editingId === null && (
        <Button type="button" variant="outline" size="sm" onClick={startNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar campo
        </Button>
      )}
    </div>
  );
}
