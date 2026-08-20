"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeactivateButton({
  userId,
  deactivate,
}: {
  userId: string;
  deactivate: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await deactivate(userId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desativar.");
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs">
        <button type="button" onClick={handleConfirm} disabled={submitting} className="text-red-600 hover:underline">
          {submitting ? "Desativando..." : "Confirmar"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-slate-400 hover:underline">
          Voltar
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} className="text-xs text-red-500 hover:underline">
      Desativar
    </button>
  );
}
