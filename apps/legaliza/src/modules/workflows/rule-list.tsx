"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ruleSchema, type RuleInput } from "@/lib/validations/rule";
import { PROCESS_TYPES } from "@/lib/validations/process";
import { createRule, deleteRule } from "@/modules/workflows/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

type Rule = {
  id: string;
  name: string;
  processType: string;
  state: string | null;
  legalNature: string | null;
  priority: number;
  workflow: { name: string };
};
type WorkflowOption = { id: string; name: string; processType: string };

export function RuleList({ rules, workflows }: { rules: Rule[]; workflows: WorkflowOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RuleInput>({ resolver: zodResolver(ruleSchema), defaultValues: { processType: "OPENING", priority: 0 } });

  async function submit(data: RuleInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createRule(data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar a regra.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(ruleId: string) {
    await deleteRule(ruleId);
    router.refresh();
  }

  return (
    <div>
      {rules.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">UF</th>
                <th className="px-3 py-2 font-medium">Natureza</th>
                <th className="px-3 py-2 font-medium">Workflow</th>
                <th className="px-3 py-2 font-medium">Prioridade</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{rule.name}</td>
                  <td className="px-3 py-2 text-muted">{TYPE_LABELS[rule.processType]}</td>
                  <td className="px-3 py-2 text-muted">{rule.state ?? <Badge variant="neutral">qualquer</Badge>}</td>
                  <td className="px-3 py-2 text-muted">{rule.legalNature ?? <Badge variant="neutral">qualquer</Badge>}</td>
                  <td className="px-3 py-2 text-muted">{rule.workflow.name}</td>
                  <td className="px-3 py-2 text-muted">{rule.priority}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => remove(rule.id)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Nova Regra
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Nome da regra</Label>
              <Input id="rule-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-type">Tipo de Processo</Label>
              <Select id="rule-type" {...register("processType")}>
                {PROCESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-state">UF (vazio = qualquer)</Label>
              <Input id="rule-state" maxLength={2} {...register("state")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-nature">Natureza Jurídica (vazio = qualquer)</Label>
              <Input id="rule-nature" {...register("legalNature")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-workflow">Workflow</Label>
              <Select id="rule-workflow" {...register("workflowId")}>
                <option value="">Selecione...</option>
                {workflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({TYPE_LABELS[w.processType]})
                  </option>
                ))}
              </Select>
              {errors.workflowId && <p className="text-xs text-red-600">{errors.workflowId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-priority">Prioridade (desempate)</Label>
              <Input id="rule-priority" inputMode="numeric" {...register("priority")} />
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Criando..." : "Criar Regra"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
