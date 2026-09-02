"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CompleteRecurringTaskButton({
  taskId,
  completeOccurrence,
}: {
  taskId: string;
  completeOccurrence: (taskId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await completeOccurrence(taskId);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={submitting} className="text-xs text-accent hover:underline">
      {submitting ? "Salvando..." : "Concluir agora"}
    </button>
  );
}
