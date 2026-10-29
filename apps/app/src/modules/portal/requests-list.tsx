"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { importPortalRequest, rejectPortalRequest, reopenPortalRequest } from "@/modules/processes/actions";

export type RequestItem = {
  id: string;
  status: "PENDENTE" | "IMPORTADO" | "RECUSADO";
  clientId: string;
  clientName: string;
  companyName: string | null;
  service: string;
  priority: string;
  priorityVariant: "neutral" | "success" | "warning" | "danger" | "info";
  deadline: string | null;
  description: string;
  answers: { label: string; value: string }[];
  attachments: { id: string; name: string }[];
  createdAt: string;
  reviewNote: string | null;
  processId: string | null;
};

const STATUS_BADGE: Record<RequestItem["status"], { label: string; variant: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  PENDENTE: { label: "Para revisar", variant: "warning" },
  IMPORTADO: { label: "Importado", variant: "success" },
  RECUSADO: { label: "Recusado", variant: "danger" },
};

export function RequestsList({ items, workspaces }: { items: RequestItem[]; workspaces: { id: string; name: string }[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<{ id: string; kind: "import" | "reject" } | null>(null);
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setError(null);
    try {
      await fn();
      setMode(null);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <p className="rounded-2xl border border-border/70 bg-surface p-8 text-center text-sm text-muted-soft shadow-sm">Nenhum pedido nesta lista.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
      {items.map((r) => {
        const badge = STATUS_BADGE[r.status];
        const open = mode?.id === r.id;
        return (
          <article key={r.id} className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  <Link href={`/clientes/${r.clientId}`} className="font-semibold text-ink hover:underline">
                    {r.clientName}
                  </Link>
                  {r.companyName ? ` · ${r.companyName}` : ""} · {r.createdAt}
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-ink">{r.service}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.priorityVariant}>{r.priority}</Badge>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{r.description}</p>
            {r.deadline && <p className="mt-1 text-xs text-muted">Prazo desejado: {r.deadline}</p>}

            {r.answers.filter((a) => a.value).length > 0 && (
              <dl className="mt-3 space-y-1.5 rounded-xl bg-surface-alt/60 p-3 text-sm">
                {r.answers
                  .filter((a) => a.value)
                  .map((a, i) => (
                    <div key={i}>
                      <dt className="text-xs font-medium text-muted">{a.label}</dt>
                      <dd className="whitespace-pre-wrap text-ink">{a.value}</dd>
                    </div>
                  ))}
              </dl>
            )}

            {r.attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {r.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={`/documentos/${a.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-ink hover:bg-surface-alt">
                      <Paperclip className="h-3.5 w-3.5 text-muted" />
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {r.status === "RECUSADO" && r.reviewNote && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Motivo da recusa: {r.reviewNote}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {r.status === "PENDENTE" && !open && (
                <>
                  <Button type="button" size="sm" onClick={() => { setMode({ id: r.id, kind: "import" }); setError(null); }}>
                    Importar como tarefa
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setMode({ id: r.id, kind: "reject" }); setError(null); }}>
                    Recusar
                  </Button>
                </>
              )}
              {r.status === "IMPORTADO" && r.processId && (
                <Link href={`/processos/${r.processId}`} className="text-sm font-medium text-accent hover:underline">
                  Abrir a tarefa criada →
                </Link>
              )}
              {r.status === "RECUSADO" && (
                <Button type="button" size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, () => reopenPortalRequest(r.id))}>
                  Voltar para revisão
                </Button>
              )}

              {open && mode?.kind === "import" && (
                <div className="flex flex-wrap items-center gap-2">
                  {workspaces.length > 1 && (
                    <Select aria-label="Área de trabalho" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="h-9 w-48">
                      {workspaces.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button type="button" size="sm" disabled={busy === r.id} onClick={() => run(r.id, () => importPortalRequest(r.id, { workspaceId }))}>
                    {busy === r.id ? "Importando..." : "Confirmar importação"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
                    Voltar
                  </Button>
                </div>
              )}
              {open && mode?.kind === "reject" && (
                <div className="flex w-full flex-wrap items-center gap-2">
                  <Input aria-label="Motivo da recusa" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (o cliente vai ver)" className="h-9 max-w-md flex-1" />
                  <Button type="button" size="sm" variant="outline" disabled={busy === r.id} onClick={() => run(r.id, () => rejectPortalRequest(r.id, reason))}>
                    {busy === r.id ? "Recusando..." : "Confirmar recusa"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
                    Voltar
                  </Button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
