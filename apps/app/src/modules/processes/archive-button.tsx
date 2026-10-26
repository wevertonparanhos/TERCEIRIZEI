"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArchiveButton({
  processId,
  archived,
  setArchived,
}: {
  processId: string;
  archived: boolean;
  setArchived: (processId: string, archived: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await setArchived(processId, !archived);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {archived ? <ArchiveRestore className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
      {archived ? "Desarquivar" : "Arquivar"}
    </Button>
  );
}
