"use client";

import { useEffect, useRef } from "react";

export function MarkCommentsRead({
  processId,
  markCommentsRead,
}: {
  processId: string;
  markCommentsRead: (processId: string) => Promise<void>;
}) {
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    markCommentsRead(processId).catch(() => {
      // silencioso — não é uma ação que o usuário precisa confirmar ou ver erro
    });
  }, [processId, markCommentsRead]);

  return null;
}
