"use client";

import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/modules/processes/labels";

export type CsvRow = { due: string | null; title: string; clientName: string; value: number; status: PaymentStatus };

function cell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Baixa as movimentações do período em CSV (separador ponto e vírgula e vírgula decimal, para abrir direto no Excel em português). */
export function CsvExportButton({ rows, filename }: { rows: CsvRow[]; filename: string }) {
  function download() {
    const header = ["Vencimento", "Tarefa", "Cliente", "Valor", "Status"].map(cell).join(";");
    const lines = rows.map((r) =>
      [r.due ? `${r.due.slice(8, 10)}/${r.due.slice(5, 7)}/${r.due.slice(0, 4)}` : "", r.title, r.clientName, r.value.toFixed(2).replace(".", ","), PAYMENT_STATUS_LABELS[r.status]]
        .map((v) => cell(String(v)))
        .join(";")
    );
    const blob = new Blob(["﻿" + [header, ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={download} className="print:hidden">
      <FileSpreadsheet className="mr-1.5 h-4 w-4" /> CSV
    </Button>
  );
}
