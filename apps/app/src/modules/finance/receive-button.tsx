"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReceiveButton({
  processId,
  installmentId,
  markPaid,
}: {
  processId: string;
  installmentId: string;
  markPaid: (processId: string, installmentId: string, paid: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await markPaid(processId, installmentId, true);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
    >
      {busy ? "..." : "Recebi"}
    </button>
  );
}
