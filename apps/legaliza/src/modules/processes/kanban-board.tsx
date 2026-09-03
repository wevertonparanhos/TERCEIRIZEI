"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { ProcessStatus } from "@legaliza/db";
import { Badge } from "@/components/ui/badge";

export type Column = { status: ProcessStatus; label: string };

export type KanbanCard = {
  id: string;
  type: string;
  clientName: string;
  companyName: string | null;
  priority: string;
  status: ProcessStatus;
  state: string;
  municipality: string;
  overdue: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

const PRIORITY_VARIANT: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  BAIXA: "neutral",
  MEDIA: "info",
  ALTA: "warning",
  URGENTE: "danger",
};

function Card({ card, dragging = false }: { card: KanbanCard; dragging?: boolean }) {
  return (
    <div
      className={`rounded-md border border-border bg-surface p-3 shadow-sm transition-shadow ${
        dragging ? "shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
          {TYPE_LABELS[card.type] ?? card.type}
        </span>
        <div className="flex items-center gap-1">
          {card.overdue && (
            <span
              title="Etapa com prazo vencido"
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400"
            >
              !
            </span>
          )}
          <Badge variant={PRIORITY_VARIANT[card.priority] ?? "neutral"}>{card.priority}</Badge>
        </div>
      </div>
      <p className="mt-1.5 text-sm font-medium text-ink">{card.clientName}</p>
      {card.companyName && <p className="text-xs text-muted">{card.companyName}</p>}
      <p className="mt-2 text-xs text-muted-soft">
        {card.municipality}/{card.state}
      </p>
    </div>
  );
}

function DraggableCard({ card, canDrag }: { card: KanbanCard; canDrag: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, disabled: !canDrag });

  return (
    <Link href={`/processos/${card.id}`} className="block">
      <div
        ref={setNodeRef}
        {...(canDrag ? listeners : {})}
        {...(canDrag ? attributes : {})}
        style={{ opacity: isDragging ? 0.4 : 1, touchAction: "none" }}
        className="mb-2"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        <Card card={card} />
      </div>
    </Link>
  );
}

function DroppableColumn({ column, cards, canDrag }: { column: Column; cards: KanbanCard[]; canDrag: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 flex-none flex-col rounded-lg border ${
        isOver ? "border-accent bg-accent-soft" : "border-border bg-surface-alt"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{column.label}</p>
        <span className="flex h-5 min-w-[20px] flex-none items-center justify-center rounded-full bg-surface px-1.5 text-[11px] font-semibold text-muted-soft">
          {cards.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 p-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} canDrag={canDrag} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  columns,
  cards,
  canDrag,
  updateStatus,
}: {
  columns: Column[];
  cards: KanbanCard[];
  canDrag: boolean;
  updateStatus: (processId: string, status: ProcessStatus) => Promise<void>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(cards);
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDragStart(event: { active: { id: string | number } }) {
    const card = items.find((c) => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = String(over.id) as ProcessStatus;
    const card = items.find((c) => c.id === active.id);
    if (!card || card.status === newStatus) return;

    const previous = items;
    setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: newStatus } : c)));
    setError(null);

    try {
      await updateStatus(card.id, newStatus);
      router.refresh();
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Não foi possível mover o processo.");
    }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.status}
              column={column}
              cards={items.filter((c) => c.status === column.status)}
              canDrag={canDrag}
            />
          ))}
        </div>
        <DragOverlay>{activeCard && <Card card={activeCard} dragging />}</DragOverlay>
      </DndContext>
    </div>
  );
}
