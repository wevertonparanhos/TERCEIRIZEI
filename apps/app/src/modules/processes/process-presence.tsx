"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

type ActiveUser = { id: string; name: string };

function othersLabel(others: ActiveUser[]): string {
  if (others.length === 1) return `${others[0].name} está trabalhando nisso agora.`;
  if (others.length === 2) return `${others[0].name} e ${others[1].name} estão trabalhando nisso agora.`;
  return `${others[0].name}, ${others[1].name} e mais ${others.length - 2} estão trabalhando nisso agora.`;
}

export function ProcessPresence({
  processId,
  currentUserId,
  activeUsers,
  markPresence,
  clearPresence,
}: {
  processId: string;
  currentUserId: string;
  activeUsers: ActiveUser[];
  markPresence: (processId: string) => Promise<void>;
  clearPresence: (processId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [isPresent, setIsPresent] = useState(activeUsers.some((u) => u.id === currentUserId));
  const [busy, setBusy] = useState(false);
  const isPresentRef = useRef(isPresent);
  isPresentRef.current = isPresent;

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPresentRef.current) markPresence(processId).catch(() => {});
      router.refresh();
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [processId, markPresence, router]);

  async function toggle() {
    setBusy(true);
    try {
      if (isPresent) {
        await clearPresence(processId);
        setIsPresent(false);
      } else {
        await markPresence(processId);
        setIsPresent(true);
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const others = activeUsers.filter((u) => u.id !== currentUserId);

  return (
    <div className="space-y-3">
      {isPresent ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 flex-none">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Você está trabalhando aqui</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70">A equipe vê que esta tarefa está com você.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggle}>
            Não estou mais aqui
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60"
        >
          <MapPin className="h-4 w-4" />
          Estou aqui
        </button>
      )}
      {!isPresent && others.length === 0 && <p className="text-center text-xs text-muted">Clique para avisar a equipe que você está trabalhando nesta tarefa.</p>}
      {others.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-alt px-3 py-2">
          <span className="flex -space-x-1.5">
            {others.slice(0, 3).map((u) => (
              <span key={u.id} title={u.name} className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white ring-2 ring-surface">
                {u.name.trim().charAt(0).toUpperCase()}
              </span>
            ))}
          </span>
          <span className="text-xs font-medium text-ink">{othersLabel(others)}</span>
        </div>
      )}
    </div>
  );
}
