"use client";

import { useRouter } from "next/navigation";
import { toggleChecklistItem } from "@/modules/checklist/actions";
import { Badge } from "@/components/ui/badge";

type Item = { id: string; label: string; required: boolean; done: boolean };

export function ChecklistList({ processId, items }: { processId: string; items: Item[] }) {
  const router = useRouter();

  async function onToggle(itemId: string, done: boolean) {
    await toggleChecklistItem(processId, itemId, done);
    router.refresh();
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">Nenhum item de checklist gerado para este processo.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-alt px-4 py-2.5">
          <input
            type="checkbox"
            className="h-4 w-4"
            defaultChecked={item.done}
            onChange={(e) => onToggle(item.id, e.target.checked)}
          />
          <span className={`text-sm ${item.done ? "text-muted-soft line-through" : "text-ink"}`}>{item.label}</span>
          {item.required && <Badge variant="warning">obrigatório</Badge>}
        </li>
      ))}
    </ul>
  );
}
