"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";

export type Stage = { id: string; label: string; color: string };

export type KanbanCard = {
  id: string;
  number: number;
  clientName: string;
  serviceTypeName: string;
  priority: string;
  stageId: string;
  assignedUserName: string | null;
  dueAt: string | null;
  isOverdue: boolean;
  hasUnreadComment: boolean;
};

function Card({ card, dragging = false }: { card: KanbanCard; dragging?: boolean }) {
  return (
    <div
      className={`rounded-md border border-border bg-surface p-3 shadow-sm transition-shadow ${
        dragging ? "shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-soft">
          #{card.number}
          {card.hasUnreadComment && (
            <span
              title="Comentário do cliente não lido"
              className="h-2 w-2 flex-none rounded-full bg-accent"
            />
          )}
        </span>
        <Badge variant={PRIORITY_BADGE_VARIANT[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
      </div>
      <p className="mt-1 text-sm font-medium text-ink">{card.clientName}</p>
      <p className="text-xs text-muted">{card.serviceTypeName}</p>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-soft">{card.assignedUserName ?? "Sem responsável"}</span>
        {card.dueAt && (
          <span className={card.isOverdue ? "font-medium text-red-600" : "text-muted-soft"}>
            {new Date(card.dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            {card.isOverdue && " · atrasado"}
          </span>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ card, canDrag }: { card: KanbanCard; canDrag: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !canDrag,
  });

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

function DroppableColumn({ stage, cards, canDrag }: { stage: Stage; cards: KanbanCard[]; canDrag: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 flex-none flex-col rounded-lg border ${
        isOver ? "border-accent bg-accent-soft" : "border-border bg-surface-alt"
      }`}
    >
      <div className="border-b border-border px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          {stage.label}
        </p>
        <p className="text-[11px] text-muted-soft">{cards.length} processo(s)</p>
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
  stages,
  cards,
  canDrag,
  updateStage,
}: {
  stages: Stage[];
  cards: KanbanCard[];
  canDrag: boolean;
  updateStage: (processId: string, stageId: string) => Promise<void>;
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

    const newStageId = String(over.id);
    const card = items.find((c) => c.id === active.id);
    if (!card || card.stageId === newStageId) return;

    const previous = items;
    setItems((prev) => prev.map((c) => (c.id === card.id ? { ...c, stageId: newStageId } : c)));
    setError(null);

    try {
      await updateStage(card.id, newStageId);
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
          {stages.map((stage) => (
            <DroppableColumn
              key={stage.id}
              stage={stage}
              cards={items.filter((c) => c.stageId === stage.id)}
              canDrag={canDrag}
            />
          ))}
        </div>
        <DragOverlay>{activeCard && <Card card={activeCard} dragging />}</DragOverlay>
      </DndContext>
    </div>
  );
}
