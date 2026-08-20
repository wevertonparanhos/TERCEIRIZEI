"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ActiveToggle({
  serviceTypeId,
  active,
  toggleActive,
}: {
  serviceTypeId: string;
  active: boolean;
  toggleActive: (serviceTypeId: string, active: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await toggleActive(serviceTypeId, !active);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={handleClick}>
      {active ? "Desativar modelo" : "Reativar modelo"}
    </Button>
  );
}
