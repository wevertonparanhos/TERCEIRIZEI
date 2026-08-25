"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReactivatePortalButton({
  userId,
  reactivate,
}: {
  userId: string;
  reactivate: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await reactivate(userId);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={submitting} className="text-xs text-accent hover:underline">
      {submitting ? "Reativando..." : "Reativar"}
    </button>
  );
}
