"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MAX_QUESTIONS } from "@/modules/portal/settings";
import { addPortalQuestion, copyPortalQuestions, deletePortalQuestion, movePortalQuestion, updatePortalQuestion } from "@/modules/portal/actions";

type Question = { id: string; label: string; kind: "TEXTO" | "TEXTO_LONGO"; required: boolean };

export function PortalQuestionsEditor({ clientId, questions, copyFrom }: { clientId: string; questions: Question[]; copyFrom: { id: string; name: string }[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Question["kind"]>("TEXTO_LONGO");
  const [required, setRequired] = useState(false);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (ok) setNotice(ok);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    await run(async () => {
      await addPortalQuestion(clientId, { label, kind, required });
      setLabel("");
      setRequired(false);
    });
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-soft">Nenhuma pergunta extra. O formulário do cliente tem só os campos padrão.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {questions.map((q, i) => (
            <li key={q.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <Input
                aria-label={`Pergunta ${i + 1}`}
                defaultValue={q.label}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== q.label) run(() => updatePortalQuestion(clientId, q.id, { label: next, kind: q.kind, required: q.required }));
                }}
                className="h-9 min-w-[200px] flex-1"
              />
              <Select
                aria-label="Tipo de resposta"
                value={q.kind}
                disabled={busy}
                onChange={(e) => run(() => updatePortalQuestion(clientId, q.id, { label: q.label, kind: e.target.value as Question["kind"], required: q.required }))}
                className="h-9 w-36"
              >
                <option value="TEXTO_LONGO">Texto longo</option>
                <option value="TEXTO">Texto curto</option>
              </Select>
              <label className="flex items-center gap-1.5 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={q.required}
                  disabled={busy}
                  onChange={(e) => run(() => updatePortalQuestion(clientId, q.id, { label: q.label, kind: q.kind, required: e.target.checked }))}
                />
                Obrigatória
              </label>
              <div className="flex items-center">
                <button type="button" aria-label="Subir" disabled={busy || i === 0} onClick={() => run(() => movePortalQuestion(clientId, q.id, "up"))} className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Descer"
                  disabled={busy || i === questions.length - 1}
                  onClick={() => run(() => movePortalQuestion(clientId, q.id, "down"))}
                  className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Excluir pergunta" disabled={busy} onClick={() => run(() => deletePortalQuestion(clientId, q.id))} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {questions.length < MAX_QUESTIONS && (
        <div className="flex flex-wrap items-center gap-2">
          <Input aria-label="Nova pergunta" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Dados dos sócios (nome, CPF e estado civil)" className="h-9 min-w-[220px] flex-1" />
          <Select aria-label="Tipo da nova pergunta" value={kind} onChange={(e) => setKind(e.target.value as Question["kind"])} className="h-9 w-36">
            <option value="TEXTO_LONGO">Texto longo</option>
            <option value="TEXTO">Texto curto</option>
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-ink">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
            Obrigatória
          </label>
          <Button type="button" size="sm" onClick={add} disabled={busy || label.trim().length < 3}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}

      {copyFrom.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted">Copiar perguntas de outro cliente:</span>
          <Select aria-label="Copiar de" value={source} onChange={(e) => setSource(e.target.value)} className="h-9 w-56">
            <option value="">Escolher cliente…</option>
            {copyFrom.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !source}
            onClick={() =>
              run(async () => {
                const result = (await copyPortalQuestions(clientId, source)) as { added: number };
                setSource("");
                setNotice(result.added > 0 ? `${result.added} pergunta(s) copiada(s).` : "Nenhuma pergunta nova para copiar.");
              })
            }
          >
            Copiar
          </Button>
        </div>
      )}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {notice && !error && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}
    </div>
  );
}
