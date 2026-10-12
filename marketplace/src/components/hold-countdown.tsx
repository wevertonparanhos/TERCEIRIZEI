"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Contagem regressiva da reserva; ao zerar, recarrega para mostrar o pedido expirado. */
export function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const end = new Date(expiresAt).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()));

  useEffect(() => {
    const t = setInterval(() => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0) {
        clearInterval(t);
        // pequena folga para o servidor expirar a reserva
        setTimeout(() => router.refresh(), 1500);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [end, router]);

  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span className="font-mono font-bold tabular-nums" aria-live="off">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
