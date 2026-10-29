"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientCreateProcessSchema, type ClientCreateProcessInput, type ClientRequestInput } from "@/lib/validations/process";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, X } from "lucide-react";

type Company = { id: string; razaoSocial: string };
type ServiceType = { id: string; name: string; defaultDeadlineDays: number | null; defaultPriority: string | null };
export type RequestQuestion = { id: string; label: string; kind: "TEXTO" | "TEXTO_LONGO"; required: boolean };

function addDaysAsInputDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ClientProcessForm({
  companies,
  serviceTypes,
  onSubmit,
  clientId,
  uploadDocument,
  uploadRequestAttachment,
  questions = [],
}: {
  companies: Company[];
  serviceTypes: ServiceType[];
  onSubmit: (data: ClientRequestInput) => Promise<{ kind?: "request" | "process"; id: string } | void>;
  clientId?: string;
  uploadDocument?: (clientId: string, processId: string | null, requestId: string | null, formData: FormData) => Promise<void>;
  /** anexo de um pedido que ainda está em análise */
  uploadRequestAttachment?: (requestId: string, formData: FormData) => Promise<void>;
  /** perguntas extras configuradas para este cliente */
  questions?: RequestQuestion[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sentKind, setSentKind] = useState<"request" | "process">("process");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ClientCreateProcessInput>({
    resolver: zodResolver(clientCreateProcessSchema),
    defaultValues: { priority: "MEDIA" },
  });

  function handleServiceTypeChange(serviceTypeId: string) {
    const serviceType = serviceTypes.find((s) => s.id === serviceTypeId);
    if (!serviceType) return;
    if (!dirtyFields.requestedDeadline && serviceType.defaultDeadlineDays) {
      setValue("requestedDeadline", addDaysAsInputDate(serviceType.defaultDeadlineDays));
    }
    if (!dirtyFields.priority && serviceType.defaultPriority) {
      setValue("priority", serviceType.defaultPriority as ClientCreateProcessInput["priority"]);
    }
  }

  async function submit(data: ClientCreateProcessInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const missing = questions.find((q) => q.required && !(answers[q.id] ?? "").trim());
      if (missing) throw new Error(`Responda: ${missing.label}`);
      const result = await onSubmit({ ...data, answers });
      if (result?.id) {
        const kind = result.kind ?? "process";
        // Anexos escolhidos na criação são enviados já vinculados ao pedido (em análise) ou à tarefa criada.
        const failed: string[] = [];
        for (const file of files) {
          const fd = new FormData();
          fd.set("name", file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Anexo");
          fd.set("category", "OUTROS");
          fd.set("file", file);
          try {
            if (kind === "request") {
              if (!uploadRequestAttachment) throw new Error("envio indisponível");
              await uploadRequestAttachment(result.id, fd);
            } else if (uploadDocument && clientId) {
              await uploadDocument(clientId, result.id, null, fd);
            }
          } catch (err) {
            failed.push(`${file.name}: ${err instanceof Error ? err.message : "falhou"}`);
          }
        }
        setSentKind(kind);
        setSent(true);
        if (kind === "process") router.push(`/portal/processos/${result.id}${failed.length ? "?tab=arquivos" : ""}`);
        else router.push("/portal/processos");
        if (failed.length) window.alert(`A solicitação foi enviada, mas alguns arquivos não subiram:\n${failed.join("\n")}\nFale com a equipe pelo chat para enviá-los.`);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        {sentKind === "request"
          ? "Pedido enviado! Nossa equipe vai analisar e você acompanha a resposta em Minhas Tarefas."
          : "Solicitação enviada! Nossa equipe vai analisar e entrar em contato."}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {companies.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="companyId">Empresa</Label>
            <Select id="companyId" {...register("companyId")}>
              <option value="">Nenhuma / não se aplica</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="serviceTypeId">Serviço desejado</Label>
          <Select
            id="serviceTypeId"
            {...register("serviceTypeId")}
            onChange={(e) => {
              register("serviceTypeId").onChange(e);
              handleServiceTypeChange(e.target.value);
            }}
          >
            <option value="">Selecione...</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {errors.serviceTypeId && <p className="text-xs text-red-600">{errors.serviceTypeId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" {...register("priority")}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="requestedDeadline">Prazo desejado</Label>
          <Input id="requestedDeadline" type="date" {...register("requestedDeadline")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descreva o que você precisa</Label>
        <Textarea id="description" rows={4} {...register("description")} />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      {questions.map((q) => (
        <div key={q.id} className="space-y-1.5">
          <Label htmlFor={`q-${q.id}`}>
            {q.label}
            {q.required ? <span className="text-red-600"> *</span> : <span className="text-muted-soft"> (opcional)</span>}
          </Label>
          {q.kind === "TEXTO_LONGO" ? (
            <Textarea id={`q-${q.id}`} rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
          ) : (
            <Input id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
          )}
        </div>
      ))}

      {uploadDocument && clientId && (
        <div className="space-y-2">
          <Label htmlFor="attachments">Anexar arquivos (opcional)</Label>
          <label
            htmlFor="attachments"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-3 text-sm text-muted hover:bg-surface-alt"
          >
            <Paperclip className="h-4 w-4" />
            Escolher arquivos (PDF, imagens, documentos — até 20 MB cada)
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              setFiles((prev) => [...prev, ...picked]);
              e.target.value = "";
            }}
          />
          {files.length > 0 && (
            <ul className="space-y-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-surface-alt px-3 py-1.5 text-sm text-ink">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${f.name}`}
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Enviando..." : "Enviar solicitação"}
      </Button>
    </form>
  );
}
