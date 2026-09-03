"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

  if (!isPresent && others.length === 0) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggle}>
        Estou aqui
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggle}>
        {isPresent ? "Não estou mais aqui" : "Estou aqui"}
      </Button>
      {isPresent && <span className="text-xs font-medium text-accent">Você está trabalhando aqui</span>}
      {others.length > 0 && (
        <span className="text-xs text-muted-soft">{othersLabel(others)}</span>
      )}
    </div>
  );
}
