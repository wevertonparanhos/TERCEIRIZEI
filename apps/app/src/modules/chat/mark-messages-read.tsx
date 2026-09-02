"use client";

import { useEffect, useRef } from "react";

export function MarkMessagesRead({
  clientId,
  markMessagesRead,
}: {
  clientId: string;
  markMessagesRead: (clientId: string) => Promise<void>;
}) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    markMessagesRead(clientId).catch(() => {
      // silencioso — não é uma ação que o usuário precisa confirmar ou ver erro
    });
  }, [clientId, markMessagesRead]);

  return null;
}
