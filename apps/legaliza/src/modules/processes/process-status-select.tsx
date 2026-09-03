"use client";

import { useRouter } from "next/navigation";
import type { ProcessStatus } from "@legaliza/db";
import { updateProcessStatus } from "@/modules/processes/actions";
import { Select } from "@/components/ui/select";

const PROCESS_STATUSES = [
  "DRAFT",
  "NEW",
  "TRIAGE",
  "WAITING_DOCUMENTS",
  "READY",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "WAITING_GOVERNMENT",
  "PENDING",
  "COMPLETED",
  "CANCELLED",
] as const;

export function ProcessStatusSelect({ processId, status }: { processId: string; status: string }) {
  const router = useRouter();

  async function onChange(next: ProcessStatus) {
    await updateProcessStatus(processId, next);
    router.refresh();
  }

  return (
    <Select
      key={`${processId}-${status}`}
      className="h-9 w-56"
      defaultValue={status}
      onChange={(e) => onChange(e.target.value as ProcessStatus)}
    >
      {PROCESS_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </Select>
  );
}
