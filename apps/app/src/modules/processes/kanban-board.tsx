"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AlertTriangle, CalendarClock, ClipboardList, MessageSquare, Radio, ShieldAlert, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT, initials, isDueToday, type PaymentStatus } from "@/modules/processes/labels";
import { matchesSearch } from "@/modules/processes/search";
import { SearchInput, usePersistentSearch } from "@/modules/processes/search-input";

export type Stage = { id: string; label: string; color: string };

export type KanbanCard = {
  id: string;
  number: number;
  title: string;
  clientName: string;
  serviceTypeName: string;
  priority: string;
  stageId: string;
  assigneeNames: string[];
  dueAt: string | null;
  isOverdue: boolean;
  hasUnreadComment: boolean;
  value: number | null;
  paymentStatus: PaymentStatus;
  hasOpenImpediment: boolean;
  activePresenceNames: string[];
  requestedByClient?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type CardFilter = "all" | "entregaHoje" | "atrasadas" | "pgtoAtrasado" | "impedimento" | "comentario";

const FILTER_TEST: Record<Exclude<CardFilter, "all">, (c: KanbanCard) => boolean> = {
  entregaHoje: (c) => !!c.dueAt && isDueToday(new Date(c.dueAt)),
  atrasadas: (c) => c.isOverdue,
  pgtoAtrasado: (c) => c.paymentStatus === "ATRASADO",
  impedimento: (c) => c.hasOpenImpediment,
  comentario: (c) => c.hasUnreadComment,
};

/** Indicador compacto que também é filtro: clicar mostra só as tarefas dele; clicar de novo (ou em Total) volta a todas. */
function KpiFilterChip({
  value,
  label,
  icon: Icon,
  tone = "neutral",
  active,
  onClick,
}: {
  value: number;
  label: string;
  icon: LucideIcon;
  tone?: "neutral" | "danger";
  active: boolean;
  onClick: () => void;
}) {
  const isDanger = tone === "danger" && value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? "Clique para mostrar todas as tarefas" : `Mostrar só: ${label}`}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? "bg-accent text-white"
          : isDanger
            ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
            : "text-muted hover:bg-surface-alt"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-none" />
      <span>{label}</span>
      <span className={`font-bold ${active ? "text-white" : isDanger ? "" : "text-ink"}`}>{value}</span>
    </button>
  );
}

function Card({ card, dragging = false }: { card: KanbanCard; dragging?: boolean }) {
  const paymentOverdue = card.paymentStatus === "ATRASADO";

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
        <div className="flex items-center gap-1">
          {card.activePresenceNames.length > 0 && (
            <span
              title={`Trabalhando agora: ${card.activePresenceNames.join(", ")}`}
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              <Radio className="h-2.5 w-2.5" />
            </span>
          )}
          {card.requestedByClient && (
            <span
              title="Solicitada pelo cliente no portal"
              className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-400"
            >
              Cliente
            </span>
          )}
          {card.hasOpenImpediment && (
            <span
              title="Tarefa com impedimento em aberto"
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            >
              !
            </span>
          )}
          {card.value !== null && (
            <span
              title={paymentOverdue ? "Pagamento atrasado" : "Demanda com pagamento"}
              className={`flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold ${
                paymentOverdue
                  ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              $
            </span>
          )}
          <Badge variant={PRIORITY_BADGE_VARIANT[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">{card.clientName}</p>
      <p className="text-sm font-semibold leading-snug text-ink">{card.title}</p>
      <p className="mt-0.5 text-[11px] text-muted-soft">{card.serviceTypeName}</p>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex -space-x-1.5" title={card.assigneeNames.length > 0 ? card.assigneeNames.join(", ") : "Sem responsável"}>
          {card.assigneeNames.length === 0 ? (
            <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
              —
            </div>
          ) : (
            card.assigneeNames.slice(0, 3).map((name, i) => (
              <div
                key={i}
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-[10px] font-semibold text-accent"
              >
                {initials(name)}
              </div>
            ))
          )}
          {card.assigneeNames.length > 3 && (
            <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-surface bg-surface-alt text-[10px] font-semibold text-muted">
              +{card.assigneeNames.length - 3}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {card.value !== null && <span className="font-mono text-muted">{currencyFormatter.format(card.value)}</span>}
          {card.dueAt && (
            <span className={card.isOverdue ? "font-medium text-red-600" : "text-muted-soft"}>
              {new Date(card.dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              {card.isOverdue && " · atrasado"}
            </span>
          )}
        </div>
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
        style={{ opacity: isDragging ? 0.4 : 1 }}
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
      className={`flex h-full max-h-full w-64 flex-none flex-col rounded-lg border ${
        isOver ? "border-accent bg-accent-soft" : "border-border bg-surface-alt"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: stage.color }} />
          {stage.label}
        </p>
        <span className="flex h-5 min-w-[20px] flex-none items-center justify-center rounded-full bg-surface px-1.5 text-[11px] font-semibold text-muted-soft">
          {cards.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
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
  searchKey = "busca-tarefas",
}: {
  stages: Stage[];
  cards: KanbanCard[];
  canDrag: boolean;
  updateStage: (processId: string, stageId: string) => Promise<void>;
  /** Chave onde a busca digitada fica guardada (uma por área de trabalho). */
  searchKey?: string;
}) {
  const router = useRouter();
  // Sem "distância mínima" o arrasto começa no clique e engole o clique do mouse:
  // o card não abria. Com a restrição, clicar abre a tarefa e só arrastar move.
  // No toque, segurar um instante para arrastar mantém a rolagem da coluna livre.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );
  const [items, setItems] = useState(cards);
  const [query, setQuery] = usePersistentSearch(searchKey);
  const [filterText, setFilterText] = usePersistentSearch(`${searchKey}:filtro`);
  const filter: CardFilter = filterText in FILTER_TEST ? (filterText as CardFilter) : "all";
  const searching = query.trim().length > 0;
  const filtering = filter !== "all";
  const baseItems = filtering ? items.filter(FILTER_TEST[filter as Exclude<CardFilter, "all">]) : items;
  const visibleItems = searching
    ? baseItems.filter((c) => matchesSearch([String(c.number), c.title, c.clientName, c.serviceTypeName, ...c.assigneeNames], query))
    : baseItems;
  const counts = {
    entregaHoje: items.filter(FILTER_TEST.entregaHoje).length,
    atrasadas: items.filter(FILTER_TEST.atrasadas).length,
    pgtoAtrasado: items.filter(FILTER_TEST.pgtoAtrasado).length,
    impedimento: items.filter(FILTER_TEST.impedimento).length,
    comentario: items.filter(FILTER_TEST.comentario).length,
  };
  const toggle = (f: CardFilter) => setFilterText(filter === f ? "" : f === "all" ? "" : f);
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
      setError(err instanceof Error ? err.message : "Não foi possível mover a tarefa.");
    }
  }

  return (
    <div className="flex flex-col md:h-full">
      {/* Uma linha só: indicadores (que filtram o quadro) à esquerda e busca à direita, para o quadro ganhar espaço. */}
      <div className="mb-2 flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1">
          <KpiFilterChip value={items.length} label="Total" icon={ClipboardList} active={!filtering} onClick={() => toggle("all")} />
          <KpiFilterChip value={counts.entregaHoje} label="Entrega hoje" icon={CalendarClock} active={filter === "entregaHoje"} onClick={() => toggle("entregaHoje")} />
          <KpiFilterChip value={counts.atrasadas} label="Atrasadas" icon={AlertTriangle} tone="danger" active={filter === "atrasadas"} onClick={() => toggle("atrasadas")} />
          <KpiFilterChip value={counts.pgtoAtrasado} label="Pgto. atrasado" icon={Wallet} tone="danger" active={filter === "pgtoAtrasado"} onClick={() => toggle("pgtoAtrasado")} />
          <KpiFilterChip value={counts.impedimento} label="Impedimento" icon={ShieldAlert} tone="danger" active={filter === "impedimento"} onClick={() => toggle("impedimento")} />
          <KpiFilterChip value={counts.comentario} label="Comentário não lido" icon={MessageSquare} tone="danger" active={filter === "comentario"} onClick={() => toggle("comentario")} />
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          {(searching || filtering) && (
            <span className="whitespace-nowrap text-xs text-muted">
              {visibleItems.length} {visibleItems.length === 1 ? "encontrada" : "encontradas"}
            </span>
          )}
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar tarefas..." className="w-full sm:w-64" />
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-[70vh] gap-3 overflow-x-auto pb-2 md:h-auto md:min-h-0 md:flex-1">
          {stages.map((stage) => (
            <DroppableColumn
              key={stage.id}
              stage={stage}
              cards={visibleItems.filter((c) => c.stageId === stage.id)}
              canDrag={canDrag}
            />
          ))}
        </div>
        <DragOverlay>{activeCard && <Card card={activeCard} dragging />}</DragOverlay>
      </DndContext>
    </div>
  );
}
