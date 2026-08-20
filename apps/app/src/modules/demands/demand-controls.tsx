"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DEMAND_STATUSES } from "@/lib/validations/demand";
import { STATUS_LABELS } from "@/modules/demands/labels";

type StaffUser = { id: string; name: string };

export function ConvertToProcessButton({
  demandId,
  convert,
}: {
  demandId: string;
  convert: (demandId: string) => Promise<{ id: string } | void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await convert(demandId);
      if (result?.id) router.push(`/processos/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível transformar em processo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={submitting}>
        {submitting ? "Transformando..." : "Transformar em Processo"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function StatusControl({
  demandId,
  currentStatus,
  updateStatus,
}: {
  demandId: string;
  currentStatus: string;
  updateStatus: (demandId: string, status: (typeof DEMAND_STATUSES)[number]) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const status = formData.get("status") as (typeof DEMAND_STATUSES)[number];
    setSubmitting(true);
    setError(null);
    try {
      await updateStatus(demandId, status);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <Select name="status" defaultValue={currentStatus} className="max-w-[220px]">
          {DEMAND_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Atualizando..." : "Atualizar status"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AssignControl({
  demandId,
  currentAssignedUserId,
  staff,
  assign,
}: {
  demandId: string;
  currentAssignedUserId: string | null;
  staff: StaffUser[];
  assign: (demandId: string, assignedUserId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const assignedUserId = (formData.get("assignedUserId") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await assign(demandId, assignedUserId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atribuir.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form action={action} className="flex items-center gap-2">
        <Select name="assignedUserId" defaultValue={currentAssignedUserId ?? ""} className="max-w-[220px]">
          <option value="">Sem responsável</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
        <Button type="submit" size="sm" variant="outline" disabled={submitting}>
          {submitting ? "Salvando..." : "Atribuir"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
