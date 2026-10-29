"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Excluir a tarefa de vez: pede confirmação (mostrando o nome) e volta para a Área de Trabalho. */
export function DeleteTaskButton({
  processId,
  number,
  title,
  deleteTask,
}: {
  processId: string;
  number: number;
  title: string;
  deleteTask: (processId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const ok = window.confirm(
      `Excluir a tarefa #${number} "${title}"?\n\nIsso apaga a tarefa, os comentários, o checklist e as parcelas dela, e não pode ser desfeito.\n\nSe só quer tirá-la do quadro mantendo o histórico e o financeiro, use "Arquivar".`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteTask(processId);
      router.push("/processos");
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir a tarefa.");
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={onClick}
      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10"
    >
      <Trash2 className="mr-1.5 h-4 w-4" />
      {busy ? "Excluindo..." : "Excluir"}
    </Button>
  );
}
