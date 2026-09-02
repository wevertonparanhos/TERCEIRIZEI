"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // silencioso — instalabilidade é um extra, não pode quebrar o app
      });
    }
  }, []);

  return null;
}
