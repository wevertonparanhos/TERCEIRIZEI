"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import type { ProcessInput } from "@/lib/validations/process";

type StaffUser = { id: string; name: string };

export function ProcessForm({
  processId,
  defaultValues,
  staff,
  readOnly,
  updateProcess,
}: {
  processId: string;
  defaultValues: { assignedUserId: string; priority: string; value: string; dueAt: string; notes: string };
  staff: StaffUser[];
  readOnly: boolean;
  updateProcess: (processId: string, input: ProcessInput) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function action(formData: FormData) {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await updateProcess(processId, {
        assignedUserId: (formData.get("assignedUserId") as string) ?? "",
        priority: formData.get("priority") as ProcessInput["priority"],
        value: (formData.get("value") as string) ?? "",
        dueAt: (formData.get("dueAt") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="assignedUserId">Responsável</Label>
          <Select id="assignedUserId" name="assignedUserId" defaultValue={defaultValues.assignedUserId}>
            <option value="">Sem responsável</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" name="priority" defaultValue={defaultValues.priority}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Valor (R$)</Label>
          <Input id="value" name="value" type="number" step="0.01" defaultValue={defaultValues.value} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueAt">Prazo previsto de conclusão</Label>
          <Input id="dueAt" name="dueAt" type="date" defaultValue={defaultValues.dueAt} />
        </div>
      </fieldset>

      <fieldset disabled={readOnly} className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaultValues.notes} />
      </fieldset>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Alterações salvas.</p>}

      {!readOnly && (
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      )}
    </form>
  );
}
